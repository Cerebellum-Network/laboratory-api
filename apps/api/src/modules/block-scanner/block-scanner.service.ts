import {BadRequestException, Injectable, Logger} from '@nestjs/common';
import {Repository} from 'typeorm';
import {InjectRepository} from '@nestjs/typeorm';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {ConfigService} from '../../../../../libs/config/src';
import {toBlockDto} from './mapper/position.mapper';
import {formatBalance} from '@polkadot/util';
import {toTransactionDto} from './mapper/transaction.mapper';
import {TransactionsDataDto} from './dto/transactions-data.dto';
import {BlocksDataDto} from './dto/blocks-data.dto';
import {BlockEntity} from '../../../../../libs/block-scanner/src/entities/block.entity';
import {TransactionEntity} from '../../../../../libs/block-scanner/src/entities/transaction.entity';
import config from '../../../../../libs/constants/config';

@Injectable()
export class BlockScannerService {
  public logger = new Logger(BlockScannerService.name);

  private networkParams: {api: ApiPromise; type: string}[] = [];

  private networksParsed: any;

  public constructor(
    @InjectRepository(BlockEntity)
    private readonly blockEntityRepository: Repository<BlockEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionEntityRepository: Repository<TransactionEntity>,
    private readonly configService: ConfigService,
  ) {
    this.networksParsed = JSON.parse(this.configService.get('NETWORKS'));
    this.init();
  }

  private init(): any {
    this.networksParsed.forEach(async (network) => {
      const api = await this.initProvider(network.URL);
      this.networkParams.push({api, type: network.NETWORK});
    });
  }

  private async initProvider(url: string): Promise<ApiPromise> {
    const provider = new WsProvider(url);
    const api = await ApiPromise.create({
      provider,
      types: config,
    });

    await api.isReady;
    const chain = await api.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);

    return api;
  }

  public async getAccountBlocks(
    accountId: string,
    offset: number,
    limit: number,
    network: string,
  ): Promise<BlocksDataDto> {
    this.logger.debug('About to fetch the Block');

    const [result, count] = await this.blockEntityRepository.findAndCount({
      where: {authorPublicKey: accountId, networkType: network},
      take: limit,
      skip: offset,
    });

    this.logger.debug(result);
    const data = await result.map((block) => toBlockDto(block));

    return new BlocksDataDto(data, count);
  }

  public async getTransactions(
    accountId: string,
    offset: number,
    limit: number,
    network: string,
  ): Promise<TransactionsDataDto> {
    this.logger.debug('About to fetch the transaction');
    const balance = await this.getBalance(accountId, network);
    const [result, count] = await this.transactionEntityRepository.findAndCount({
      relations: ['block'],
      where: {
        senderId: accountId,
        networkType: network,
      },
      take: limit,
      skip: offset,
      order: {
        timestamp: 'DESC',
      },
    });

    const data = await result.map((transaction) => toTransactionDto(transaction));

    return new TransactionsDataDto(data, count, balance);
  }

  public async getBalance(address: string, network: string): Promise<any> {
    this.logger.debug(`About to get balance for: ${address}`);
    if (this.networksParsed.find((item) => network === item.NETWORK) === undefined) {
      throw new BadRequestException(`Invalid network type.`);
    }

    const networkParam = this.networkParams.find((item) => item.type === network);
    const {
      data: {free: balance},
    } = await networkParam.api.query.system.account(address);
    const decimal = networkParam.api.registry.chainDecimals;
    const result = await formatBalance(balance, {decimals: decimal[0]});
    return result;
  }
}
