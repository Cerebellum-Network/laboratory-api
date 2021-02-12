import {Injectable, Logger} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {BlockEntity} from './entities/block.entity';
import {Connection, Repository} from 'typeorm';

import {InjectConnection, InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '@cere/ms-core';
import {toBlockDto} from './mapper/position.mapper';
import {BlockDto} from './dto/block.dto';

@Injectable()
export class BlockScannerService implements BlockScannerServiceInterface {
  public logger = new Logger(BlockScannerService.name);

  private api: ApiPromise;

  public constructor(
    @InjectRepository(BlockEntity)
    private readonly blockEntityRepository: Repository<BlockEntity>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  public async startScanning(): Promise<void> {
    this.logger.debug('About to scan the network');

    await this.init();
    await this.scanChain();
  }

  public async init(): Promise<ApiPromise> {
    const networkWsUrl = this.configService.get('NETWORK_WS_URL');

    const wsProvider = new WsProvider(networkWsUrl);
    this.api = await ApiPromise.create({provider: wsProvider});
    await this.api.isReady;

    return this.api;
  }

  public scanChain(): void {
    this.api.derive.chain.subscribeNewHeads(async (header) => {
      this.logger.log(`#${header.number}: ${header.author}`);

      // await this.processChain(header);
      const blockHash = await this.api.rpc.chain.getBlockHash(header.number.toBigInt());
      const momentPrev = await this.api.query.timestamp.now.at(header.parentHash);

      const blockEntity = new BlockEntity();
      blockEntity.authorPublicKey = header.author.toString();
      blockEntity.destinationPublicKey = ''; // TODO: add destination
      blockEntity.stateRoot = header.stateRoot.toString();
      blockEntity.parentHash = header.parentHash.toString();
      blockEntity.blockNumber = header.number.toString();
      blockEntity.blockHash = blockHash.toString();
      blockEntity.timestamp = new Date(momentPrev.toNumber());
      blockEntity.extrinsicRoot = header.extrinsicsRoot.toString();

      await this.blockEntityRepository.save(blockEntity);
    });
  }

  public async getAccountTransactions(accountId: string): Promise<BlockDto[]> {
    this.logger.debug('About to fetch the Block');
    const blocks = await this.blockEntityRepository.find({
      where: [{authorPublicKey: accountId}, {destinationPublicKey: accountId}],
    });
    this.logger.debug(blocks);

    return blocks.map(block => toBlockDto(block));
  }
}
