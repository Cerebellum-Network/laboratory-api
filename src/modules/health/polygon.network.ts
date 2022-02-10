import {Injectable, Logger} from '@nestjs/common';
import {IBlockchain} from './blockchain.interface';
import Web3 from 'web3';
import {ConfigService} from '../config/config.service';
import {Wallet} from "./wallet.type";
import {BalanceType} from "./balance-type.enum";
import erc20Abi from "./abis/erc20Abi.json";
import {AbiItem} from "web3-utils";

export const POLYGON_NETWORK = 'POLYGON';

@Injectable()
export class PolygonNetwork implements IBlockchain {
  private logger = new Logger(PolygonNetwork.name);

  private network: Map<string, {api: Web3}> = new Map<string, {api: Web3}>();

  private accounts: Map<string, {account: [Wallet]}> = new Map<string, {account: [Wallet]}>();

  public constructor(private readonly configService: ConfigService) {
    this.init();
  }

  private init(): void {
    const healthAccounts = JSON.parse(this.configService.get('HEALTH_ACCOUNTS'));
    healthAccounts.forEach((element) => {
      if (element.blockchain === POLYGON_NETWORK) {
        element.data.forEach((data) => {
          this.accounts.set(data.network, {account: data.accounts});
          this.network.set(data.network, {api: new Web3(new Web3.providers.HttpProvider(data.rpc))});
        });
      }
    });
    this.logger.log(`polygon accounts ${JSON.stringify(this.accounts)}`);
  }

  public hasNetwork(network: string): boolean {
    if (!this.network.has(network)) {
      throw new Error('Invalid network');
    }
    return true;
  }

  public getNetwork(network: string) {
    this.hasNetwork(network);
    return this.network.get(network);
  }

  public getWallet(network: string, walletName: string) {
    this.hasNetwork(network);
    const {account} = this.accounts.get(network);
    const walletData = account.find((element) => element.name === walletName);
    if (walletData === undefined) {
      throw new Error('Invalid wallet name');
    }
    return walletData;
  }

  public getWallets(network: string) {
    this.hasNetwork(network);
    const {account} = this.accounts.get(network);
    return account;
  }

  public getBalance(wallet: Wallet, network: string): Promise<number> {
    this.logger.debug(`About to fetch balance for '${wallet.name}' with address '${wallet.address}'`);
    this.hasNetwork(network);
    const {api} = this.getNetwork(network);
    if (!wallet.options) {
      return this.getBalanceNative(api, wallet.address);
    }
    this.logger.log(`wallet is ${JSON.stringify(wallet)}`);
    const walletCopy = {...wallet};
    switch (wallet.options.type) {
      case BalanceType.ERC20_TOKEN:
      {
        this.logger.log(`in case wallet is ${JSON.stringify(wallet)}`);
        this.logger.log(`in case wallet.options is ${JSON.stringify(wallet.options)}`);
        this.logger.log(`in case erc20TokenAddress is ${wallet.options.erc20TokenAddress}`);
        this.logger.log(`in case type is ${wallet.options.type}`);
        const {erc20TokenAddress} = wallet.options;
        this.logger.log(`in case erc20TokenAddress variable is ${erc20TokenAddress}`);
        Object.keys(wallet.options).forEach(k => this.logger.log(`key is ${k}`));

        this.logger.log(`copy!!!`);
        this.logger.log(`in case walletCopy is ${JSON.stringify(walletCopy)}`);
        this.logger.log(`in case walletCopy.options is ${JSON.stringify(walletCopy.options)}`);
        this.logger.log(`in case walletCopy.options.erc20TokenAddress is ${walletCopy.options.erc20TokenAddress}`);
        this.logger.log(`in case type is ${walletCopy.options.type}`);
        Object.keys(walletCopy.options).forEach(k => this.logger.log(`key is ${k}`));

        return this.getBalanceErc20Token(api, wallet.address, wallet.options.erc20TokenAddress);
      }
      default:
        throw new Error(`Unknown type ${wallet.options.type}`);
    }
  }

  public async getBalanceNative(api: Web3, address: string): Promise<number> {
    const balance = await api.eth.getBalance(address);
    const freeBalance = await api.utils.fromWei(balance, 'ether');
    return +freeBalance;
  }

  public async getBalanceErc20Token(api: Web3, address: string, erc20TokenAddress: string): Promise<number> {
    this.logger.log('in getBalanceErc20Token');
    this.logger.log((erc20Abi as AbiItem[])[0]);
    this.logger.log(`address id ${address}`);
    this.logger.log(`erc20 address ${erc20TokenAddress}`);
    const erc20TokenContractInstance = new api.eth.Contract(erc20Abi as AbiItem[], erc20TokenAddress);
    this.logger.log(`instance created`);
    const results = await Promise.all([erc20TokenContractInstance.methods.balanceOf(address).call(), erc20TokenContractInstance.methods.decimals().call()]);
    this.logger.log(`after promise`);
    const balance = results[0];
    const decimals = results[1];
    return +(balance / 10 ** decimals);
  }
}
