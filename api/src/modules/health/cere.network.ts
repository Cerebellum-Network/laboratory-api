import {ConfigService} from '../../../../libs/config/src';
import {Logger} from '@nestjs/common';
import {ApiPromise, WsProvider} from '@polkadot/api';
import config from '../shared/constant/config';
import {IBlockchain, Wallet} from './blockchain.interface';
import {Repository} from 'typeorm';
import {InjectRepository} from '@nestjs/typeorm';
import {ValidatorEntity} from './entities/validator.entity';
import {validatorStatus} from './validatorStatus.enum';
import {Cron} from '@nestjs/schedule';
import {BlockStatusDto} from './dto/block-status.dto';

export const CERE_NETWORK = 'CERE';

export class CereNetwork implements IBlockchain {
  private logger = new Logger(CereNetwork.name);

  private network: Map<string, {api: ApiPromise}> = new Map<string, {api: ApiPromise}>();

  private accounts: Map<string, {account: [Wallet]}> = new Map<string, {account: [Wallet]}>();

  private blockDifference = Number(this.configService.get('BLOCK_DIFFERENCE'));

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ValidatorEntity)
    private readonly validatorEntityRepository: Repository<ValidatorEntity>,
  ) {
    this.init();
  }

  private init(): void {
    const healthAccounts = JSON.parse(this.configService.get('HEALTH_ACCOUNTS'));
    healthAccounts.forEach((element) => {
      if (element.blockchain === CERE_NETWORK) {
        element.data.forEach(async (data) => {
          this.accounts.set(data.network, {account: data.accounts});
          const provider = new WsProvider(data.rpc);
          const api = await ApiPromise.create({
            provider,
            types: config,
          });
          await api.isReady;
          const chain = await api.rpc.system.chain();
          this.logger.log(`Connected to ${chain}`);
          this.network.set(data.network, {api});
        });
      }
    });
  }

  /**
   * Check for specific network
   * @param network network name
   * @returns boolean
   */
  public hasNetwork(network: string): boolean {
    if (!this.network.has(network)) {
      throw new Error('Invalid network');
    }
    return true;
  }

  /**
   * Get network api
   * @param network network name
   * @returns network api
   */
  public getNetwork(network: string) {
    if (!this.hasNetwork(network)) {
      throw new Error('Invalid Network');
    }
    return this.network.get(network);
  }

  /**
   * Get wallet of specific network
   * @param network network name
   * @param wallet wallet name
   * @returns wallet
   */
  public getWallet(network: string, walletName: string) {
    if (!this.hasNetwork(network)) {
      throw new Error('Invalid Network');
    }
    const {account} = this.accounts.get(network);
    const walletData = account.find((element) => element.name === walletName);
    if (walletData === undefined) {
      throw new Error('Invalid wallet name');
    }
    return walletData;
  }

  /**
   * Get wallet for specific network
   * @param network network name
   * @returns array of wallet
   */
  public getWallets(network: string) {
    const {account} = this.accounts.get(network);
    return account;
  }

  public async getBalance(wallet: string, network: string): Promise<number> {
    this.logger.debug(`About to fetch balance for ${wallet}`);
    this.hasNetwork(network);
    const {api} = this.getNetwork(network);
    const decimal = api.registry.chainDecimals;
    const accountData = await api.query.system.account(wallet);
    const freeBalance = +accountData.data.free / 10 ** +decimal;
    return freeBalance;
  }

  /**
   * Node dropped status
   * @param network network name
   * @returns slashed validator
   */
  public async getDroppedNodeStatus(network: string): Promise<any> {
    this.hasNetwork(network);
    const validator = await this.validatorEntityRepository.find({where: {network}, take: 10});
    return validator;
  }

  /**
   * Health check
   * @param network network string
   * @returns system health
   */
  public async checkHealth(network: string): Promise<any> {
    this.logger.debug(`About to fetch system health`);
    this.hasNetwork(network);
    const {api} = this.getNetwork(network);
    const result = await api.rpc.system.health();
    return result;
  }

  /**
   * Determine the block finalization status
   * @param network network string
   * @returns boolean based on difference
   */
  public async getBlockStatus(network: string): Promise<BlockStatusDto> {
    this.logger.debug(`About to fetch block status`);
    this.hasNetwork(network);
    const {api} = this.getNetwork(network);
    const {best, finalized} = await this.blockNumber(api);
    if (best - finalized > this.blockDifference) {
      return new BlockStatusDto(true, finalized, best);
    }
    return new BlockStatusDto(false, finalized, best);
  }

  public async getNodeFinalizationStatus(network: string): Promise<boolean> {
    this.logger.debug(`About to fetch block status`);
    this.hasNetwork(network);
    const {api} = this.getNetwork(network);
    const {best, finalized} = await this.blockNumber(api);
    if (best - finalized > this.blockDifference) {
      return true;
    }
    return false;
  }

  public async checkBlockProductionTime(network: string): Promise<boolean> {
    this.logger.log(`About to fetch block production time`);
    this.hasNetwork(network);
    const {api} = this.getNetwork(network);
    const {block} = await api.rpc.chain.getBlock();

    const {header, extrinsics} = block;
    const lastTime = await this.blockTime(extrinsics);
    const previousBlockHash = await api.rpc.chain.getBlockHash(Number(header.number) - 1);
    const {block: previousBlock} = await api.rpc.chain.getBlock(previousBlockHash);
    const {header: prevoiusHeader, extrinsics: previousExtrinsics} = previousBlock;
    const previousTime = await this.blockTime(previousExtrinsics);
    const diff = (Number(lastTime) - Number(previousTime)) / 1000;
    if (diff <= Number(process.env.BLOCK_PRODUCTION_DIFF)) {
      return true;
    }
    return false;
  }

  /**
   * Run cron job At minute 40 to check for slashed validator node.
   */
  @Cron('40 * * * *')
  public async getSlashedValidator(): Promise<void> {
    this.logger.log(`About to run cron for validator slashing`);
    for (const [key, {api}] of this.network) {
      const currentEra = await api.query.staking.currentEra();
      const result = await api.query.staking.unappliedSlashes(currentEra.toString());
      if (result.length === 0) {
        this.logger.debug(`No validator got slashed in ${currentEra.toString()} of ${key}`);
      } else {
        const slashedValidator: string[] = [];
        result.forEach((element) => {
          slashedValidator.push(element.validator.toString());
        });
        const query = await this.validatorEntityRepository
          .createQueryBuilder('validator')
          .select('MAX(validator.era)', 'era')
          .where('validator.network = :network', {network: key});

        const {era} = await query.getRawOne();
        if (+era !== +currentEra) {
          const validatorEntity = new ValidatorEntity();
          validatorEntity.era = currentEra.toString();
          validatorEntity.status = validatorStatus.NEW;
          validatorEntity.validator = slashedValidator;
          validatorEntity.network = key;
          await this.validatorEntityRepository.save(validatorEntity);
        }
      }
    }
  }

  /**
   * Node dropped.
   * @param network network name
   * @returns notified status
   */
  public async getDroppedNode(network: string): Promise<any> {
    this.hasNetwork(network);
    const validator = await this.validatorEntityRepository.find({status: validatorStatus.NEW, network});
    await this.validatorEntityRepository
      .createQueryBuilder()
      .update(ValidatorEntity)
      .set({status: validatorStatus.NOTIFIED})
      .where('status =:status', {status: validatorStatus.NEW})
      .andWhere('network = :network', {network})
      .execute();
    if (validator.length === 0) {
      return true;
    }
    return false;
  }

  /**
   * Fetch Finalized and best block number
   * @param api ApiPromise
   * @returns finalized and best block number
   */
  private async blockNumber(api: ApiPromise): Promise<any> {
    const finalized = Number(await api.derive.chain.bestNumberFinalized());
    const best = Number(await api.derive.chain.bestNumber());
    return {finalized, best};
  }

  private blockTime(extrinsic: any) {
    return new Promise((resolve, reject) => {
      extrinsic.forEach((element) => {
        if (element.method.section === 'timestamp') {
          resolve(element.method.args[0]);
        }
      });
    });
  }
}
