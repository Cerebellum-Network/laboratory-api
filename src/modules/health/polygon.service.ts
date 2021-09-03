import {Logger} from '@nestjs/common';
import {IBlockchain, Wallet} from './blockchain.interface';
import Web3 from "web3";

export class PolygonNetwork implements IBlockchain {
  private logger = new Logger(PolygonNetwork.name);

  private network: Map<string, {api: Web3}> = new Map<string, {api: Web3}>();

  private accounts: Map<string, {account: [Wallet]}> = new Map<string, {account: [Wallet]}>();

  public constructor(_network, _accounts) {
    this.network = _network;
    this.accounts = _accounts;
  }

  public hasNetwork(network: string): boolean {
    return this.network.has(network);
  }

  public hasWallet(wallet: string): boolean {
    return this.accounts.has(wallet);
  }

  public getNetwork(network: string) {
    if (!this.hasNetwork(network)) {
      throw new Error("Invalid Network");
    }
    return this.network.get(network);
  }

  public getWallet(network: string, wallet: string) {
    if (!this.hasWallet(network)) {
      throw new Error("Invalid Network");
    }
    const {account} = this.accounts.get(network);
    const walletData = account.find((element) => element.name === wallet);
    if (walletData === undefined) {
      throw new Error("Invalid wallet name");
    }
    return walletData;
  }

  public getWallets(network: string) {
    if (!this.hasWallet(network)) {
      throw new Error("Invalid Network");
    }
    const {account} = this.accounts.get(network);
    return account
  }

  public async getBalance(wallet: string, api: Web3): Promise<number> {
    this.logger.debug(`About to fetch balance for ${wallet}`);
    const balance = await api.eth.getBalance(wallet);
    const freeBalance = await api.utils.fromWei(balance, 'ether');
    return +freeBalance;
  }
}
