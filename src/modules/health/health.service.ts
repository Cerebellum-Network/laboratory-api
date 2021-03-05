import {Injectable, Logger} from '@nestjs/common';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {ConfigService} from '../config/config.service';
import {BlockStatusDto} from './dto/block-status.dto';

@Injectable()
export class HealthService {
  public logger = new Logger(HealthService.name);

  private api: ApiPromise;

  private blockDifference = Number(this.configService.get('BLOCK_DIFFERENCE'));

  public constructor(private readonly configService: ConfigService) {
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
    const {best, finalized
  } = await this.blockNumber();
    if (best - finalized > this.blockDifference) {
      return new BlockStatusDto(true, finalized, best);
    }
    return new BlockStatusDto(false, finalized, best);
  }

  public async finalization(): Promise<any>{
    this.logger.debug(`About to fetch block status`);
    const {best, finalized
    } = await this.blockNumber();
    if (best - finalized > this.blockDifference) {
      return true;
    }
    return false;
  }


  private async blockNumber(): Promise<any>{
    const finalized = Number(await this.api.derive.chain.bestNumberFinalized());
    const best = Number(await this.api.derive.chain.bestNumber());
    return {finalized, best}
  }

}
