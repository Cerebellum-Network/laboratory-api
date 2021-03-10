import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '../config/config.service';
import {ApiPromise, WsProvider} from '@polkadot/api';

@Injectable()
export class PeerService {
  public logger = new Logger(PeerService.name);

  private api: ApiPromise;

  public constructor(private readonly configService: ConfigService) {}

  public async fetch(network: string): Promise<any> {
    let networkWsUrl
    console.log(network);
    if (network === 'TestNet') {
       networkWsUrl = this.configService.get('TESTNET_WS_URL');
    } else if (network === 'Dev') {
       networkWsUrl = this.configService.get('DEV_WS_URL');
    } else if (network === 'Dev1') {
       networkWsUrl = this.configService.get('DEV1_WS_URL');
    }
    console.log(networkWsUrl);
    const wsProvider = new WsProvider(networkWsUrl);
    this.api = await ApiPromise.create({provider: wsProvider});
    await this.api.isReady;
    const chain = await this.api.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);
    const peers = await this.api.rpc.system.peers();
    console.log(peers.toString());
    return peers;
  }
}
