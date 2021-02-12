import {Injectable, Logger} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {BlockEntity} from './entities/block.entity';
import {Connection, EntityManager, Repository} from 'typeorm';

import {InjectConnection, InjectRepository} from '@nestjs/typeorm';

@Injectable()
export class BlockScannerService implements BlockScannerServiceInterface {
  public logger = new Logger(BlockScannerService.name);

  private api: ApiPromise;

  private provider = 'ws://localhost:9944';

  public constructor(
    @InjectRepository(BlockEntity)
    private readonly blockEntityRepository: Repository<BlockEntity>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  public async startScanning(): Promise<void> {
    this.logger.debug('About to scan the network');
    await this.init();
    await this.scanChain();
  }

  public async init(): Promise<ApiPromise> {
    const wsProvider = new WsProvider('wss://testnet-node-0.cere.network:9945');
    this.api = await ApiPromise.create({provider: wsProvider});
    await this.api.isReady;
    return this.api;
  }

  public scanChain(): void {
    this.api.derive.chain.subscribeNewHeads(async(header) => {
      console.log(`#${header.number}: ${header.author}`);
      // await this.processChain(header);
      const blockHash = await this.api.rpc.chain.getBlockHash(header.number.toBigInt());
      const momentPrev = await this.api.query.timestamp.now.at(header.parentHash);
      const blockEntity = new BlockEntity();
      blockEntity.authodId = header.author.toString();
      blockEntity.stateRoot = header.stateRoot.toString();
      blockEntity.parentHash = header.parentHash.toString();
      blockEntity.blockNumber = header.number.toString();
      blockEntity.blockHash = JSON.stringify(blockHash);
      blockEntity.timeStamp = momentPrev.toString();
      blockEntity.ExtrinsicRoot = header.extrinsicsRoot.toString();
      await this.blockEntityRepository.save(blockEntity);
    });
  }

  public async fetchBlock(): Promise<any>{
    console.log('fetch Block');
    const block = await this.blockEntityRepository.find();
    console.log(block);
    return block;
  }
}
