import {Injectable, Logger, BadRequestException} from '@nestjs/common';
import {ConfigService} from '../config/config.service';
import {ApiPromise, WsProvider} from '@polkadot/api';
import Axios from 'axios';
import {formatBalance, stringToU8a} from '@polkadot/util';
import config from '../shared/constant/config';
@Injectable()
export class PeerService {
  public logger = new Logger(PeerService.name);

  private networkParams: {api: ApiPromise; type: string}[] = [];

  private networksParsed: any;

  public constructor(private readonly configService: ConfigService) {
    this.networksParsed = JSON.parse(this.configService.get('NETWORKS'));
    this.init();
  }

  private init(): any {
    this.networksParsed.forEach(async (network) => {
      const api = await this.initProvider(network.URL);
      this.networkParams.push({api, type: network.NETWORK});
    });
  }

  public async initProvider(url: string): Promise<ApiPromise> {
    const provider = new WsProvider(url);
    const api = await ApiPromise.create({
      provider,
      types: config
    });

    await api.isReady;
    const chain = await api.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);

    return api;
  }

  /**
   * Fetch the list of peer nodes connected to the network
   * @param network network string
   * @returns peer details
   */
  public async fetch(network: string): Promise<any> {
    this.logger.log(`About to fetch node details`);

    if (this.networksParsed.find((item) => network === item.NETWORK) === undefined) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const networkParam = this.networkParams.find((item) => item.type === network);

    const {connectedPeers} = await networkParam.api.rpc.system.networkState();
    const peerDetails = await networkParam.api.rpc.system.peers();
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

  /**
   * Get Treasury balance
   * @param network network string
   * @returns Balance
   */
  public async treasuryBalance(network: string): Promise<any> {
    if (this.networksParsed.find((item) => network === item.NETWORK) === undefined) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const networkParam = this.networkParams.find((item) => item.type === network);
    const treasuryAccount = stringToU8a('modlpy/trsry'.padEnd(32, '\0'));
    const {
      data: {free: balance},
    } = await networkParam.api.query.system.account(treasuryAccount);
    // TODO:https://cerenetwork.atlassian.net/browse/CBI-796
    const decimal = network === "TESTNET" ? 15: 10;
    const formatedBalance = formatBalance(balance, {decimals: decimal});
    return formatedBalance;
  }

  /**
   * Get total issuance
   * @param network network string
   * @returns total issuance
   */
  public async totalIssuance(network: string): Promise<any> {
    if (this.networksParsed.find((item) => network === item.NETWORK) === undefined) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const networkParam = this.networkParams.find((item) => item.type === network);
    const totalIssuance = await networkParam.api.query.balances.totalIssuance();
    // TODO:https://cerenetwork.atlassian.net/browse/CBI-796
    const decimal = network === "TESTNET" ? 15: 10;
    const formatedValue = formatBalance(totalIssuance, {decimals: decimal});
    return formatedValue;
  }

  /**
   * Get DDC metrics using curl
   * @returns ddc metrics
   */
  public async ddcMetric(): Promise<any> {
    const ddcMetricUrl = await this.configService.get('DDC_METRIC_URL');
    const response = await (await Axios.get(`${ddcMetricUrl}/network/capacity`)).data;

    return response;
  }
}
