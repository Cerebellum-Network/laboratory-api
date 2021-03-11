import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '../config/config.service';
import {ApiPromise, WsProvider} from '@polkadot/api';
import Axios from 'axios';
import {Network} from './network.enum';

@Injectable()
export class PeerService {
  public logger = new Logger(PeerService.name);

  private api: ApiPromise;

  public constructor(private readonly configService: ConfigService) {}

  /**
   * Fetch the list of peer nodes connected to the network
   * @param network network string
   * @returns peer details
   */
  public async fetch(network: string): Promise<any> {
    this.logger.log(`About to fetch node details`);
    let networkWsUrl;
    switch (network) {
      case Network.TESTNET:
        networkWsUrl = this.configService.get('TESTNET_WS_URL');
        break;
      case Network.DEV:
        networkWsUrl = this.configService.get('DEV_WS_URL');
        break;

      case Network.DEV1:
        networkWsUrl = this.configService.get('DEV1_WS_URL');
        break;
      default:
        break;
    }

    const wsProvider = new WsProvider(networkWsUrl);
    this.api = await ApiPromise.create({provider: wsProvider});
    await this.api.isReady;
    const chain = await this.api.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);
    const {connectedPeers} = await this.api.rpc.system.networkState();
    const peerDetails = await this.api.rpc.system.peers();
    const data = [];
    for await (const peer of peerDetails) {
      for await (const [key, value] of connectedPeers) {
        const nodeId = key.toString();
        if (peer.peerId.toString() === nodeId) {
          let tempData = {};
          const address = value.knownAddresses[0].toString();
          const ip = address.substring(address.lastIndexOf('4/') + 2, address.lastIndexOf('/tcp'));
          const country = await this.geoLocation(ip);
          tempData = {
            peerId: peer.peerId.toString(),
            roles: peer.roles.toString(),
            hash: peer.bestHash.toString(),
            bestNumber: peer.bestNumber.toString(),
            ip,
            country: `${country.city}, ${country.country}`,
          };
          data.push(tempData);
        }
      }
    }
    return data;
  }

  /**
   * Fetch location of the IP address
   * @param ip IP address
   * @returns city and country
   */
  public async geoLocation(ip: string): Promise<any> {
    const response = await (await Axios.get(`http://ipwhois.app/json/${ip}?objects=country,city`)).data;
    return response;
  }
}
