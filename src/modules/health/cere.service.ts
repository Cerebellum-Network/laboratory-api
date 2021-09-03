import {Logger} from '@nestjs/common';
import {ApiPromise} from '@polkadot/api';
import {IBlockchain, Wallet} from './blockchain.interface';

export class CereNetwork implements IBlockchain {
  private logger = new Logger(CereNetwork.name);

  private network: Map<string, {api: ApiPromise}> = new Map<string, {api: ApiPromise}>();

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
    if (!this.hasNetwork(network)) {
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
    return account;
  }

  public async getBalance(wallet: string, api: ApiPromise): Promise<number> {
    this.logger.debug(`About to fetch balance for ${wallet}`)
    const decimal = api.registry.chainDecimals;
    const accountData = await api.query.system.account(wallet);
    const freeBalance = +accountData.data.free / 10 ** +decimal;
    return freeBalance;
  }
}
