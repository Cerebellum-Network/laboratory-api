import {polygon, PolygonNetwork} from './polygon.network';
import {cere, CereNetwork} from './cere.network';
import {IBlockchain, Wallet} from './blockchain.interface';
import {Injectable, Logger} from '@nestjs/common';
import {BlockStatusDto} from './dto/block-status.dto';

@Injectable()
export class HealthService {
  private logger = new Logger(HealthService.name);

  private blockchain: Map<string, IBlockchain> = new Map<string, IBlockchain>();

  public constructor(private readonly cereNetwork: CereNetwork, private readonly polygonNetwork: PolygonNetwork) {
    this.blockchain.set(cere, this.cereNetwork);
    this.blockchain.set(polygon, this.polygonNetwork);
  }

  /**
   * Health check
   * @param network network string
   * @returns system health
   */
  public async healthCheck(network: string): Promise<any> {
    this.logger.debug(`About to fetch system health`);
    const blockchainService = this.getBlockchainInstance(cere);
    const result = await blockchainService.healthCheck(network);
    return result;
  }

  /**
   * Determine the block finalization status
   * @param network network string
   * @returns boolean based on difference
   */
  public async blockStatus(network: string): Promise<BlockStatusDto> {
    this.logger.debug(`About to fetch block status`);
    const blockchainService = this.getBlockchainInstance(cere);
    const result = await blockchainService.blockStatus(network);
    return result;
  }

  public async finalization(network: string): Promise<boolean> {
    this.logger.debug(`About to fetch block status`);
    const blockchainService = this.getBlockchainInstance(cere);
    const result = await blockchainService.finalization(network);
    return result;
  }

  public async blockProduction(network: string): Promise<boolean> {
    this.logger.log(`About to fetch block production time`);
    const blockchainService = this.getBlockchainInstance(cere);
    const result = await blockchainService.blockProduction(network);
    return result;
  }

  /**
   * Node dropped.
   * @param network network name
   * @returns notified status
   */
  public async nodeDropped(network: string): Promise<any> {
    const blockchainService = this.getBlockchainInstance(cere);
    const result = await blockchainService.nodeDropped(network);
    return result;
  }

  /**
   * Node dropped status
   * @param network network name
   * @returns slashed validator
   */
  public async nodeDroppedStatus(network: string): Promise<any> {
    const blockchainService = this.getBlockchainInstance(cere);
    const result = await blockchainService.nodeDroppedStatus(network);
    return result;
  }

  /**
   * Check Minimum balance of all accounts in a network
   * @param blockchain blockchain type
   * @param network Network type
   * @returns boolean
   */
  public async checkMinBalance(blockchain: string, network: string): Promise<any> {
    this.logger.debug(`About to check account minimum balance`);
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(blockchain);
    blockchainNetwork.hasNetwork(network);
    const wallets = blockchainNetwork.getWallets(network);
    const {status, result} = await this.validateBalance(network, wallets, blockchainNetwork);
    return {status, result};
  }

  /**
   * Check the min balance of account
   * @param blockchain blockchain type
   * @param network API promise
   * @param wallet account name
   * @returns status result
   */
  public async checkMinBalanceOfWallet(blockchain: string, network: string, wallet: string): Promise<any> {
    this.logger.debug(`About to check account minimum balance`);
    const blockchainNetwork: IBlockchain = this.getBlockchainInstance(blockchain);
    blockchainNetwork.hasNetwork(network);
    const account = blockchainNetwork.getWallet(network, wallet);
    const {status, result} = await this.validateBalance(network, [account], blockchainNetwork);
    return {status, result};
  }

  /**
   * Compares the price with minBalance
   * @param api API Promise of network
   * @param accounts accounts object
   * @param blockchainNetwork blockchain Interface
   * @returns status and result
   */
  private async validateBalance(network: string, accounts: Wallet[], blockchainNetwork: IBlockchain): Promise<any> {
    // eslint-disable-next-line prefer-const
    let result = [];
    let status = true;
    for await (const element of accounts) {
      const {address, minBalance, name} = element;
      const balance = await blockchainNetwork.getBalance(address, network);
      if (+balance <= minBalance) {
        status = false;
        const data = {
          address,
          name,
          balance,
        };
        result.push(data);
      }
    }
    return {status, result};
  }

  /**
   * Get Blockchain instance
   * @param blockchain blockchain name
   * @returns Blockchain Instance
   */
  private getBlockchainInstance(blockchain: string) {
    if (!this.blockchain.has(blockchain)) {
      throw new Error('Invalid blockchain type');
    }
    return this.blockchain.get(blockchain);
  }
}
