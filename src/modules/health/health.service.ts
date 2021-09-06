import {POLYGON_NETWORK, PolygonNetwork} from './polygon.network';
import {CERE_NETWORK, CereNetwork} from './cere.network';
import {IBlockchain, Wallet} from './blockchain.interface';
import {Injectable, Logger} from '@nestjs/common';
import {BlockStatusDto} from './dto/block-status.dto';

@Injectable()
export class HealthService {
  private logger = new Logger(HealthService.name);

  private blockchains: Map<string, IBlockchain> = new Map<string, IBlockchain>();

  public constructor(private readonly cereNetwork: CereNetwork, private readonly polygonNetwork: PolygonNetwork) {
    this.blockchains.set(CERE_NETWORK, this.cereNetwork);
    this.blockchains.set(POLYGON_NETWORK, this.polygonNetwork);
  }

  /**
   * Health check
   * @param network network string
   * @returns system health
   */
  public async healthCheck(network: string): Promise<any> {
    this.logger.debug(`About to fetch system health`);
    const currentBlockchain = this.getBlockchainInstance(CERE_NETWORK);
    const result = await currentBlockchain.checkHealth(network);
    return result;
  }

  /**
   * Determine the block finalization status
   * @param network network string
   * @returns boolean based on difference
   */
  public async blockStatus(network: string): Promise<BlockStatusDto> {
    this.logger.debug(`About to fetch block status`);
    const currentBlockchain = this.getBlockchainInstance(CERE_NETWORK);
    const result = await currentBlockchain.getBlockStatus(network);
    return result;
  }

  public async finalization(network: string): Promise<boolean> {
    this.logger.debug(`About to fetch block status`);
    const currentBlockchain = this.getBlockchainInstance(CERE_NETWORK);
    const result = await currentBlockchain.getNodeFinalizationStatus(network);
    return result;
  }

  public async blockProduction(network: string): Promise<boolean> {
    this.logger.log(`About to fetch block production time`);
    const currentBlockchain = this.getBlockchainInstance(CERE_NETWORK);
    const result = await currentBlockchain.checkBlockProductionTime(network);
    return result;
  }

  /**
   * Node dropped.
   * @param network network name
   * @returns notified status
   */
  public async nodeDropped(network: string): Promise<any> {
    const currentBlockchain = this.getBlockchainInstance(CERE_NETWORK);
    const result = await currentBlockchain.getDroppedNode(network);
    return result;
  }

  /**
   * Node dropped status
   * @param network network name
   * @returns slashed validator
   */
  public async nodeDroppedStatus(network: string): Promise<any> {
    const currentBlockchain = this.getBlockchainInstance(CERE_NETWORK);
    const result = await currentBlockchain.getDroppedNodeStatus(network);
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
    const currentBlockchain: IBlockchain = this.getBlockchainInstance(blockchain);
    currentBlockchain.hasNetwork(network);
    const wallets = currentBlockchain.getWallets(network);
    const {status, result} = await this.validateBalance(network, wallets, currentBlockchain);
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
    const currentBlockchain: IBlockchain = this.getBlockchainInstance(blockchain);
    currentBlockchain.hasNetwork(network);
    const account = currentBlockchain.getWallet(network, wallet);
    const {status, result} = await this.validateBalance(network, [account], currentBlockchain);
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
    if (!this.blockchains.has(blockchain)) {
      throw new Error('Invalid blockchain type');
    }
    return this.blockchains.get(blockchain);
  }
}
