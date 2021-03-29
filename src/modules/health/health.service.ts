import {ValidatorEntity} from './entities/validator.entity';
import {Injectable, Logger} from '@nestjs/common';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {ConfigService} from '../config/config.service';
import {BlockStatusDto} from './dto/block-status.dto';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {validatorStatus} from './validatorStatus.enum';
import {Cron} from '@nestjs/schedule';

@Injectable()
export class HealthService {
  public logger = new Logger(HealthService.name);

  private api: ApiPromise;

  private blockDifference = Number(this.configService.get('BLOCK_DIFFERENCE'));

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ValidatorEntity)
    private readonly validatorEntityRepository: Repository<ValidatorEntity>,
  ) {
    this.init();
  }

  public async init(): Promise<ApiPromise> {
    const networkWsUrl = this.configService.get('NETWORK_WS_URL');

    const wsProvider = new WsProvider(networkWsUrl);
    this.api = await ApiPromise.create({provider: wsProvider});
    await this.api.isReady;
    const chain = await this.api.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);

    return this.api;
  }

  public async healthCheck(): Promise<any> {
    this.logger.debug(`About to fetch system health`);
    const result = await this.api.rpc.system.health();
    return result;
  }

  public async blockStatus(): Promise<BlockStatusDto> {
    this.logger.debug(`About to fetch block status`);
    const {best, finalized} = await this.blockNumber();
    if (best - finalized > this.blockDifference) {
      return new BlockStatusDto(true, finalized, best);
    }
    return new BlockStatusDto(false, finalized, best);
  }

  public async finalization(): Promise<boolean> {
    this.logger.debug(`About to fetch block status`);
    const {best, finalized} = await this.blockNumber();
    if (best - finalized > this.blockDifference) {
      return true;
    }
    return false;
  }

  public async blockProduction(): Promise<boolean> {
    this.logger.log(`About to fetch block production time`);
    const {block} = await this.api.rpc.chain.getBlock();

    const {header, extrinsics} = block;
    const lastTime = await this.blockTime(extrinsics);
    const previousBlockHash = await this.api.rpc.chain.getBlockHash(Number(header.number) - 1);
    const {block: previousBlock} = await this.api.rpc.chain.getBlock(previousBlockHash);
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
  public async validatorSlashed(): Promise<any> {
    const wsProvider = new WsProvider('wss://kusama-rpc.polkadot.io');
    const api = await ApiPromise.create({provider: wsProvider});
    await api.isReady;
    const currentEra = await api.query.staking.currentEra();
    const result = await api.query.staking.unappliedSlashes(currentEra.toString());
    if (result.length === 0) {
      this.logger.debug(`No validator got slashed in ${currentEra.toString()}`);
    } else {
      const slashedValidator: string[] = [];
      result.forEach((element) => {
        slashedValidator.push(element.validator.toString());
      });
      const validatorEntity = new ValidatorEntity();
      validatorEntity.era = currentEra.toString();
      validatorEntity.status = validatorStatus.new;
      validatorEntity.validator = slashedValidator;
      await this.validatorEntityRepository.save(validatorEntity);
      return result;
    }
    return result;
  }

  /**
   * Node dropped.
   * @returns notified status
   */
  public async nodeDropped(): Promise<any> {
    const validator = await this.validatorEntityRepository.find({status: validatorStatus.new});
    await this.validatorEntityRepository
      .createQueryBuilder()
      .update(ValidatorEntity)
      .set({status: validatorStatus.notified})
      .where('status =:status', {status: validatorStatus.new})
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
  public async nodeDroppedStatus(): Promise<any> {
    const validator = await this.validatorEntityRepository.find({take: 10});
    return validator;
  }

  private async blockNumber(): Promise<any> {
    const finalized = Number(await this.api.derive.chain.bestNumberFinalized());
    const best = Number(await this.api.derive.chain.bestNumber());
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
