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

export interface NetworkProp {
  api: ApiPromise;
}

@Injectable()
export class HealthService {
  public logger = new Logger(HealthService.name);

  public network: Map<string, {api: ApiPromise}> = new Map<string, {api: ApiPromise}>();

  private blockDifference = Number(this.configService.get('BLOCK_DIFFERENCE'));

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ValidatorEntity)
    private readonly validatorEntityRepository: Repository<ValidatorEntity>,
  ) {
    this.init();
  }

  public async init() {
    const networks = JSON.parse(this.configService.get('NETWORKS'));
    for (const network of networks) {
      const provider = new WsProvider(network.URL);
      const api = await ApiPromise.create({
        provider,
        types: config,
      });
      await api.isReady;
      const chain = await api.rpc.system.chain();
      this.logger.log(`Connected to ${chain}`);

      this.network.set(network.NETWORK, {api});
    }
  }

  /**
   * Health check
   * @param network network string
   * @returns system health
   */
  public async healthCheck(network: string): Promise<any> {
    this.logger.debug(`About to fetch system health`);
    if (!this.network.has(network)) {
      return 'Invalid network type.';
    }
    const {api} = this.network.get(network);
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
    const {api} = this.network.get(network);
    const {best, finalized} = await this.blockNumber(api);
    if (best - finalized > this.blockDifference) {
      return new BlockStatusDto(true, finalized, best);
    }
    return new BlockStatusDto(false, finalized, best);
  }

  public async finalization(network: string): Promise<boolean> {
    this.logger.debug(`About to fetch block status`);
    const {api} = this.network.get(network);
    const {best, finalized} = await this.blockNumber(api);
    if (best - finalized > this.blockDifference) {
      return true;
    }
    return false;
  }

  public async blockProduction(network: string): Promise<boolean> {
    this.logger.log(`About to fetch block production time`);
    const {api} = this.network.get(network);
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
  public async validatorSlashed() {
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
        const validatorEntity = new ValidatorEntity();
        validatorEntity.era = currentEra.toString();
        validatorEntity.status = validatorStatus.NEW;
        validatorEntity.validator = slashedValidator;
        validatorEntity.network = key;
        await this.validatorEntityRepository.save(validatorEntity);
      }
    }
  }

  /**
   * Node dropped.
   * @returns notified status
   */
  public async nodeDropped(network: string): Promise<any> {
    const validator = await this.validatorEntityRepository.find({status: validatorStatus.NEW, network});
    await this.validatorEntityRepository
      .createQueryBuilder()
      .update(ValidatorEntity)
      .set({status: validatorStatus.NOTIFIED})
      .where('status =:status', {status: validatorStatus.NEW, network})
      .execute();
    if (validator.length === 0) {
      return false;
    }
    return true;
  }

  /**
   * Node dropped status
   * @returns slashed validator
   */
  public async nodeDroppedStatus(network: string): Promise<any> {
    const validator = await this.validatorEntityRepository.find({where: {network}, take: 10});
    return validator;
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
