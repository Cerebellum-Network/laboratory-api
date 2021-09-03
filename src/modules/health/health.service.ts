import {BLOCKCHAIN_INTERFACE, IBlockchain, Wallet} from './blockchain.interface';
import {Inject, Injectable, Logger} from '@nestjs/common';
import {ApiPromise} from '@polkadot/api';
import {ConfigService} from '../config/config.service';
import {BlockStatusDto} from './dto/block-status.dto';
import Web3 from 'web3';

const cere = 'CERE';
const polygon = 'POLYGON';

@Injectable()
export class HealthService {
  private logger = new Logger(HealthService.name);

  private blockchain: Map<string, IBlockchain> = new Map<string, IBlockchain>();

  public constructor(
    @Inject(BLOCKCHAIN_INTERFACE)
    private readonly blockchainService: IBlockchain,
    private readonly configService: ConfigService,
  ) {
    console.log(this.configService);
    // const cereBlockchain = new CereNetwork(this.cereNetwork, this.cereAccounts);
    // const polygonBlockchain = new PolygonNetwork(this.polygonNetwork, this.polygonAccounts);
    // this.blockchain.set(cere, cereBlockchain);
    // this.blockchain.set(polygon, polygonBlockchain);
  }

  /**
   * Health check
   * @param network network string
   * @returns system health
   */
  public async healthCheck(network: string): Promise<any> {
    this.logger.debug(`About to fetch system health`);
    const result = await this.blockchainService.healthCheck(network);
    return result;
  }

  /**
   * Determine the block finalization status
   * @param network network string
   * @returns boolean based on difference
   */
  public async blockStatus(network: string): Promise<BlockStatusDto> {
    this.logger.debug(`About to fetch block status`);
    const result = await this.blockchainService.blockStatus(network);
    return result;
  }

  public async finalization(network: string): Promise<boolean> {
    this.logger.debug(`About to fetch block status`);
    const result = await this.blockchainService.finalization(network);
    return result;
  }

  public async blockProduction(network: string): Promise<boolean> {
    this.logger.log(`About to fetch block production time`);
    const result = await this.blockchainService.blockProduction(network);
    return result;
  }

  /**
   * Node dropped.
   * @returns notified status
   */
  public async nodeDropped(network: string): Promise<any> {
    const result = await this.blockchainService.nodeDropped(network);
    return result;
  }

  /**
   * Node dropped status
   * @returns slashed validator
   */
  public async nodeDroppedStatus(network: string): Promise<any> {
    const result = await this.blockchainService.nodeDroppedStatus(network);
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
    console.log(blockchainNetwork);
    blockchainNetwork.hasNetwork(network);
    const wallets = blockchainNetwork.getWallets(network);
    const {api} = blockchainNetwork.getNetwork(network);
    const {status, result} = await this.validateBalance(api, wallets, blockchainNetwork);
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
    const {api} = blockchainNetwork.getNetwork(network);
    const account = blockchainNetwork.getWallet(network, wallet);
    const {status, result} = await this.validateBalance(api, [account], blockchainNetwork);
    return {status, result};
  }

  /**
   * Compares the price with minBalance
   * @param api API Promise of network
   * @param accounts accounts object
   * @returns status and result
   */
  private async validateBalance(
    api: Web3 | ApiPromise,
    accounts: Wallet[],
    blockchainNetwork: IBlockchain,
  ): Promise<any> {
    // eslint-disable-next-line prefer-const
    let result = [];
    let status = true;
    for await (const element of accounts) {
      const {address, minBalance, name} = element;
      const balance = await blockchainNetwork.getBalance(address, api);
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
