import {Injectable, Logger} from '@nestjs/common';
import Web3 from 'web3';
import {ConfigService} from '../config/config.service';
import {AccountData, IBalanceService} from './balance.interface'

@Injectable()
export class PolygonService implements IBalanceService{
  private logger = new Logger(PolygonService.name);

  private provider: Map<string, {provider: Web3}> = new Map<string, {provider: Web3}>();

  private accounts: Map<string, {account: [AccountData]}> = new Map<string, {account: [AccountData]}>();

  public constructor(private readonly configService: ConfigService) {
    this.init();
  }

  /**
   * Initialize accounts and provider
   */
  private init() {
    const healthAccounts = JSON.parse(this.configService.get('POLYGON_ACCOUNTS'));
    healthAccounts.forEach((element) => {
      this.accounts.set(element.network, {account: element.accounts});
      this.provider.set(element.network, {provider: new Web3(new Web3.providers.HttpProvider(element.rpc))});
    });
  }

  /**
   * Check network is correct or not
   * @param network network name 
   * @returns boolean
   */
  public hasNetwork(network: string): boolean{
    return this.provider.has(network);
  }

  /**
   * Check account is correct or not
   * @param account account name
   * @returns boolean
   */
  public hasAccount(account: string): boolean{
    return this.accounts.has(account);
  }

  /**
   * Fetch account details 
   * @param network network name
   * @returns AccountData
   */
  public getAccount(network: string): { account: [AccountData] }{
    return this.accounts.get(network);
  }

  /**
   * Check the min balance of account
   * @param network API promise
   * @param accountName account name
   * @returns status result
   */
  public async checkMinBalanceOfAccount(network: string, accountName: string): Promise<any> {
    this.logger.debug(`About to check account minimum balance`);
    const {account} = this.accounts.get(network);
    const found = account.find((element) => element.name === accountName);
    const accountArray = [found];
    const {provider} = this.provider.get(network);
    const {status, result} = await this.validateBalance(provider, accountArray);
    return {status, result};
  }

  /**
   * Check Minimum balance of all accounts in a network
   * @param network Network type
   * @returns boolean
   */
  public async checkMinBalance(network: string): Promise<any> {
    this.logger.debug(`About to check account minimum balance`);
    const {account} = this.accounts.get(network);
    const {provider} = this.provider.get(network);
    const {status, result} = await this.validateBalance(provider, account);
    return {status, result};
  }

  /**
   * Validate the balance
   * @param provider web3 provider
   * @param accounts account name
   * @returns balance and status
   */
  private async validateBalance(provider: Web3, accounts: AccountData[]): Promise<any> {
    let status = true;
    const result = [];
    for await (const element of accounts) {
      const {address, minBalance, name} = element;
      const balance = await provider.eth.getBalance(address);
      const balanceMatic = await provider.utils.fromWei(balance, 'ether');
      if (+balanceMatic <= minBalance) {
        status = false;
        const data = {
          address,
          name,
          balance: balanceMatic,
        };
        result.push(data);
      }
    }
    return {status, result};
  }
}
