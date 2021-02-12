import {Injectable, Logger, Module} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {BlockEntity} from './entities/block.entity';
import {TransactionEntity} from './entities/transaction.entity';
import {Connection, Repository} from 'typeorm';
import {InjectConnection, InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '@cere/ms-core';
import {toBlockDto} from './mapper/position.mapper';
import {BlockDto} from './dto/block.dto';
import {GenericEventData} from '@polkadot/types';
import {u8aToHex} from '@polkadot/util';
import {blake2AsU8a} from '@polkadot/util-crypto';
import {BlockHash} from '@polkadot/types/interfaces/chain';

export interface ISanitizedEvent {
  method: string;
  data: GenericEventData;
}

export interface ISanitizedCall {
  [key: string]: unknown;
  method: string;
  callIndex: Uint8Array | string;
  args: {
    call?: ISanitizedCall;
    calls?: ISanitizedCall[];
    [key: string]: unknown;
  };
}
export interface ISanitizedArgs {
  call?: ISanitizedCall;
  calls?: ISanitizedCall[];
  [key: string]: unknown;
}
@Injectable()
export class BlockScannerService implements BlockScannerServiceInterface {
  public logger = new Logger(BlockScannerService.name);

  private api: ApiPromise;

  public constructor(
    @InjectRepository(BlockEntity)
    private readonly blockEntityRepository: Repository<BlockEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionEntityRepository: Repository<TransactionEntity>,
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
      blockEntity.authorPublicKey = header.author?.toString();
      blockEntity.destinationPublicKey = ''; // TODO: add destination
      blockEntity.stateRoot = header.stateRoot.toString();
      blockEntity.parentHash = header.parentHash.toString();
      blockEntity.blockNumber = header.number.toString();
      blockEntity.blockHash = blockHash.toString();
      blockEntity.timestamp = new Date(momentPrev.toNumber());
      blockEntity.extrinsicRoot = header.extrinsicsRoot.toString();

      await this.blockEntityRepository.save(blockEntity);

      const blockData = await this.fetchBlock(blockHash);
      const transaction = await this.processExtrinsics(blockData.extrinsics, blockData.number);
      // console.log(transaction);
      // console.log(transaction.nonce.toString());
      for (const txn of transaction) {
        console.log(txn);
        const transactionEntity = new TransactionEntity();
        transactionEntity.blockNumber = header.number.toString();

        transactionEntity.nonce = txn.nonce;
        transactionEntity.senderId = txn.senderId;
        transactionEntity.transactionIndex = txn.txnIndex;
        transactionEntity.args = txn.args;
        transactionEntity.signature = txn.signature;
        transactionEntity.events = txn.events;
        transactionEntity.transactionHash = txn.transactionId;

        await this.transactionEntityRepository.save(transactionEntity);
      }
    });
  }

  public async getAccountTransactions(accountId: string): Promise<BlockDto[]> {
    this.logger.debug('About to fetch the Block');
    const blocks = await this.blockEntityRepository.find({
      where: [{authorPublicKey: accountId}, {destinationPublicKey: accountId}],
    });
    this.logger.debug(blocks);

    return blocks.map((block) => toBlockDto(block));
  }

  private async fetchBlock(hash: BlockHash): Promise<any> {
    const [{block}, events] = await Promise.all([
      this.api.rpc.chain.getBlock(hash),
      this.api.query.system.events.at(hash),
    ]);

    const {parentHash, number, stateRoot, extrinsicsRoot} = block.header;

    const onInitialize = {events: [] as ISanitizedEvent[]};
    const onFinalize = {events: [] as ISanitizedEvent[]};

    const header = await this.api.derive.chain.getHeader(hash);
    const authorId = header?.author;

    const logs = block.header.digest.logs.map((log) => {
      const {type, index, value} = log;

      return {type, index, value};
    });

    const defaultSuccess = typeof events === 'string' ? events : false;
    const extrinsics = block.extrinsics.map((extrinsic) => {
      const {method, nonce, signature, signer, isSigned, tip, args} = extrinsic;
      const hash = u8aToHex(blake2AsU8a(extrinsic.toU8a(), 256));

      return {
        // method: `${method.sectionName}.${method.methodName}`,
        // method,
        signature: isSigned ? {signature, signer} : null,
        nonce,
        args,
        // newArgs: this.parseGenericCall(method).args,
        tip,
        hash,
        info: {},
        events: [] as ISanitizedEvent[],
        success: defaultSuccess,
        // paysFee overrides to bool if `system.ExtrinsicSuccess|ExtrinsicFailed` event is present
        paysFee: null as null | boolean,
      };
    });

    const successEvent = 'system.ExtrinsicSuccess';
    const failureEvent = 'system.ExtrinsicFailed';

    if (Array.isArray(events)) {
      for (const record of events) {
        const {event, phase} = record;
        const sanitizedEvent = {
          method: `${event.section}.${event.method}`,
          data: event.data,
        };

        if (phase.isApplyExtrinsic) {
          const extrinsicIdx = phase.asApplyExtrinsic.toNumber();
          const extrinsic = extrinsics[extrinsicIdx];

          if (!extrinsic) {
            //						throw new Error(
            //							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            //							`Missing extrinsic ${extrinsicIdx} in block ${hash}`
            //						);
            console.error(`Block ${block.header.number.toNumber()} ${hash}: Missing extrinsic ${extrinsicIdx}`);
            // eslint-disable-next-line no-continue
            continue;
          }

          const method = `${event.section}.${event.method}`;

          if (method === successEvent) {
            extrinsic.success = true;
          }

          if (method === successEvent || method === failureEvent) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sanitizedData = event.data.toJSON() as any[];

            for (const data of sanitizedData) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (data && data.paysFee) {
                extrinsic.paysFee =
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  data.paysFee === true ||
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  data.paysFee === 'Yes';

                break;
              }
            }
          }

          extrinsic.events.push(sanitizedEvent);
        } else if (phase.isFinalization) {
          onFinalize.events.push(sanitizedEvent);
        } else if (phase.isInitialization) {
          onInitialize.events.push(sanitizedEvent);
        }
      }
    }

    // The genesis block is a special case with little information associated with it.
    if (parentHash.every((byte) => !byte)) {
      return {
        number,
        hash,
        parentHash,
        stateRoot,
        extrinsicsRoot,
        authorId,
        logs,
        onInitialize,
        extrinsics,
        onFinalize,
      };
    }

    return {
      number,
      hash,
      parentHash,
      stateRoot,
      extrinsicsRoot,
      authorId,
      logs,
      onInitialize,
      extrinsics,
      onFinalize,
    };
  }

  private processExtrinsics(extrinsic: any, blockNum: any): any {
    const data = [];
    const events = [];
    extrinsic.forEach((txn, index) => {
      txn.events.forEach((value, index) => {
        const method = value.method.split('.');
        const eventData = {
          id: `${blockNum}-${index}`,
          module: method[0],
          method: method[1],
          data: value.data?.toString(),
          weight: value.data[0].weight,
          paysFee: value.data[0].paysFee,
          class: value.data[0].class,
        };
        events.push(eventData);
        // console.log(`${blockNum}-${index}  --  method: ${method[0]}   Event:${method[1]}`);
        // console.log(`data: weight:${value.data[0].weight} paysFee:${value.data[0].paysFee}  class:${value.data[0].class}`)
      });
      const result = {
        senderId: txn.signature?.signer.toString() || null,
        transactionId: txn.hash?.toString() || null,
        signature: txn.signature?.signature.toString() || null,
        txnIndex: index,
        success: txn.success,
        nonce: txn.nonce?.toString() || null,
        args: txn.args.toString(),
        events,
      };
      data.push(result);
    });
    return data;
  }
}
