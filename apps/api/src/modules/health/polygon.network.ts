import {Injectable, Logger} from '@nestjs/common';
import {IBlockchain} from './blockchain.interface';
import Web3 from 'web3';
import {ConfigService} from '../../../../../libs/config/src';
import {Wallet} from "./wallet.type";
import {BalanceType} from "./balance-type.enum";
import erc20Abi from "./abis/erc20Abi.json";
import {AbiItem} from "web3-utils";

export const POLYGON_NETWORK = 'POLYGON';
export const TIMEOUT_MS = 60000;

@Injectable()
export class PolygonNetwork implements IBlockchain {
  private logger = new Logger(PolygonNetwork.name);

  private network: Map<string, {api: Web3}> = new Map<string, {api: Web3}>();

  private accounts: Map<string, {account: [Wallet]}> = new Map<string, {account: [Wallet]}>();

  private contracts: Map<string, any> = new Map<string, any>();

  public constructor(private readonly configService: ConfigService) {
    this.init();
  }

  private init(): void {
    const healthAccounts = JSON.parse(this.configService.get('HEALTH_ACCOUNTS'));
    healthAccounts.forEach((element) => {
      if (element.blockchain === POLYGON_NETWORK) {
        element.data.forEach((data) => {
          this.accounts.set(data.network, {account: data.accounts});
          this.network.set(data.network, {api: new Web3(new Web3.providers.HttpProvider(data.rpc, {timeout: TIMEOUT_MS}))});
        });
      }
    });
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
    switch (wallet.options.type) {
      case BalanceType.ERC20_TOKEN:
          return this.getBalanceErc20Token(api, wallet.address, wallet.options.erc20TokenAddress);
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
    let erc20TokenContractInstance = this.contracts.get(erc20TokenAddress);
    if (!erc20TokenContractInstance) {
      erc20TokenContractInstance = new api.eth.Contract(erc20Abi as AbiItem[], erc20TokenAddress);
      this.contracts.set(erc20TokenAddress, erc20TokenContractInstance);
    }
    const results = await Promise.all([erc20TokenContractInstance.methods.balanceOf(address).call(), erc20TokenContractInstance.methods.decimals().call()]);
    const balance = results[0];
    const decimals = results[1];
    return +(balance / 10 ** decimals);
  }
}
