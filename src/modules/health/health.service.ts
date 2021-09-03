import {IBlockchain, Wallet} from './blockchain.interface';
import {ValidatorEntity} from './entities/validator.entity';
import {Injectable, Logger} from '@nestjs/common';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {ConfigService} from '../config/config.service';
import {BlockStatusDto} from './dto/block-status.dto';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {validatorStatus} from './validatorStatus.enum';
import {Cron} from '@nestjs/schedule';
import config from '../shared/constant/config';
import {CereNetwork} from './cere.service';
import {PolygonNetwork} from './polygon.service';
import Web3 from 'web3';

const cere = 'CERE';
const polygon = 'POLYGON';

export interface NetworkProp {
  api: ApiPromise;
}

@Injectable()
export class HealthService {
  private logger = new Logger(HealthService.name);

  private cereNetwork: Map<string, {api: ApiPromise}> = new Map<string, {api: ApiPromise}>();

  private cereAccounts: Map<string, {account: [Wallet]}> = new Map<string, {account: [Wallet]}>();

  private polygonNetwork: Map<string, {api: Web3}> = new Map<string, {api: Web3}>();

  private polygonAccounts: Map<string, {account: [Wallet]}> = new Map<string, {account: [Wallet]}>();

  private blockchain: Map<string, IBlockchain> = new Map<string, IBlockchain>();

  private blockDifference = Number(this.configService.get('BLOCK_DIFFERENCE'));

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ValidatorEntity)
    private readonly validatorEntityRepository: Repository<ValidatorEntity>,
  ) {
    this.init();

    const cereBlockchain = new CereNetwork(this.cereNetwork, this.cereAccounts);
    const polygonBlockchain = new PolygonNetwork(this.polygonNetwork, this.polygonAccounts);
    this.blockchain.set(cere, cereBlockchain);
    this.blockchain.set(polygon, polygonBlockchain);
  }

  private init(): void {
    const healthAccounts = JSON.parse(this.configService.get('HEALTH_ACCOUNTS'));
    healthAccounts.forEach((element) => {
      if (element.blockchain === polygon) {
        element.data.forEach((data) => {
          this.polygonAccounts.set(data.network, {account: data.accounts});
          this.polygonNetwork.set(data.network, {api: new Web3(new Web3.providers.HttpProvider(data.rpc))});
        });
      } else if (element.blockchain === cere) {
        element.data.forEach(async (data) => {
          this.cereAccounts.set(data.network, {account: data.accounts});
          const provider = new WsProvider(data.rpc);
          const api = await ApiPromise.create({
            provider,
            types: config,
          });
          await api.isReady;
          const chain = await api.rpc.system.chain();
          this.logger.log(`Connected to ${chain}`);
          this.cereNetwork.set(data.network, {api});
        });
      }
    });
  }

  /**
   * Health check
   * @param network network string
   * @returns system health
   */
  public async healthCheck(network: string): Promise<any> {
    this.logger.debug(`About to fetch system health`);
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(cere);
    const {api} = blockchainNetwork.getNetwork(network);
    const result = await api.rpc.system.health();
    return result;
  }

  /**
   * Determine the block finalization status
   * @param network network string
   * @returns boolean based on difference
   */
  public async blockStatus(network: string): Promise<BlockStatusDto> {
    this.logger.debug(`About to fetch block status`);
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(cere);
    const {api} = blockchainNetwork.getNetwork(network);
    const {best, finalized} = await this.blockNumber(api);
    if (best - finalized > this.blockDifference) {
      return new BlockStatusDto(true, finalized, best);
    }
    return new BlockStatusDto(false, finalized, best);
  }

  public async finalization(network: string): Promise<boolean> {
    this.logger.debug(`About to fetch block status`);
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(cere);
    const {api} = blockchainNetwork.getNetwork(network);
    const {best, finalized} = await this.blockNumber(api);
    if (best - finalized > this.blockDifference) {
      return true;
    }
    return false;
  }

  public async blockProduction(network: string): Promise<boolean> {
    this.logger.log(`About to fetch block production time`);
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(cere);
    const {api} = blockchainNetwork.getNetwork(network);
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
  public async validatorSlashed(): Promise<void> {
    this.logger.log(`About to run cron for validator slashing`);
    for (const [key, {api}] of this.cereNetwork) {
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
   * @returns notified status
   */
  public async nodeDropped(network: string): Promise<any> {
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(cere);
    blockchainNetwork.getNetwork(network);
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
   * Node dropped status
   * @returns slashed validator
   */
  public async nodeDroppedStatus(network: string): Promise<any> {
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(cere);
    blockchainNetwork.getNetwork(network);
    const validator = await this.validatorEntityRepository.find({where: {network}, take: 10});
    return validator;
  }

  /**
   * Check Minimum balance of all accounts in a network
   * @param blockchain blockchain type
   * @param network Network type
   * @returns boolean
   */
  public async checkMinBalance(blockchain: string, network: string): Promise<any> {
    this.logger.debug(`About to check account minimum balance`);
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(blockchain);
    const wallets = blockchainNetwork.getWallets(network);
    const {api} = blockchainNetwork.getNetwork(network);
    const {status, result} = await this.validateBalance(api, wallets, blockchainNetwork);
    return {status, result};
  }

  /**
   * Check the min balance of account
   * @param blockchain blockchain type
   * @param network API promise
   * @param wallet account name
   * @returns status result
   */
  public async checkMinBalanceOfWallet(blockchain: string, network: string, wallet: string): Promise<any> {
    this.logger.debug(`About to check account minimum balance`);
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(blockchain);
    const {api} = blockchainNetwork.getNetwork(network);
    const account = blockchainNetwork.getWallet(network, wallet);
    const {status, result} = await this.validateBalance(api, [account], blockchainNetwork);
    return {status, result};
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

  /**
   * Compares the price with minBalance
   * @param api API Promise of network
   * @param accounts accounts object
   * @returns status and result
   */
  private async validateBalance(
    api: Web3 | ApiPromise,
    accounts: Wallet[],
    blockchainNetwork: IBlockchain,
  ): Promise<any> {
    // eslint-disable-next-line prefer-const
    let result = [];
    let status = true;
    for await (const element of accounts) {
      const {address, minBalance, name} = element;
      const balance = await blockchainNetwork.getBalance(address, api);
      if (+balance <= minBalance) {
        status = false;
        const data = {
          address,
          name,
          balance,
        };
        result.push(data);
      }
    }
    return {status, result};
  }

  /**
   * Get Blockchain instance
   * @param blockchain blockchain name
   * @returns Blockchain Instance
   */
  private getBlockchainInstance(blockchain: string) {
    if (!this.blockchain.has(blockchain)) {
      throw new Error('Invalid blockchain type');
    }
    return this.blockchain.get(blockchain);
  }
}
