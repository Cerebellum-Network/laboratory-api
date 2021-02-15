/* eslint-disable prefer-destructuring */
/* eslint-disable import/no-extraneous-dependencies */
import {Injectable, Logger} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {BlockEntity} from './entities/block.entity';
import {TransactionEntity} from './entities/transaction.entity';
import {Connection, Repository} from 'typeorm';
import {InjectConnection, InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '@cere/ms-core';
import {toBlockDto} from './mapper/position.mapper';
import {BlockDto} from './dto/block.dto';
import {GenericEventData, Struct} from '@polkadot/types';
import {u8aToHex} from '@polkadot/util';
import {blake2AsU8a} from '@polkadot/util-crypto';
import {BlockHash} from '@polkadot/types/interfaces/chain';
import {GenericCall} from '@polkadot/types/generic';
import {Codec, Registry} from '@polkadot/types/types';
import {TransactionDto} from './dto/transaction.dto';
import {toTransactionDto} from './mapper/transaction.mapper'

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
    await this.processOldBlock();
  }

  public async init(): Promise<ApiPromise> {
    const networkWsUrl = this.configService.get('NETWORK_WS_URL');

    const wsProvider = new WsProvider(networkWsUrl);
    this.api = await ApiPromise.create({provider: wsProvider});
    await this.api.isReady;

    return this.api;
  }

  // Process the blocks from where it has been leftout to current block
  public async processOldBlock(): Promise<any> {
    const query = this.blockEntityRepository
      .createQueryBuilder('blocks')
      .select('MAX(blocks.blockNumber)', 'blockNumber');
    
    const syncedBlock = await query.getRawOne();
    let latestBlock = await this.api.rpc.chain.getHeader();
    const start = Number(syncedBlock.blockNumber);
    for (let i: number = start; i <= Number(latestBlock.number); i += 1) {
      await this.scanChain(i);
      latestBlock = await this.api.rpc.chain.getHeader();
    }
    this.processBlock();
  }

  // Process the current blocks.
  public async processBlock(): Promise<any> {
    const query = this.blockEntityRepository
      .createQueryBuilder('blocks')
      .select('MAX(blocks.blockNumber)', 'blockNumber');
    const syncedBlock = await query.getRawOne();
    const latestBlock = await this.api.rpc.chain.getHeader();
    if (Number(syncedBlock.blockNumber) !== Number(latestBlock.number)) {
      await this.processOldBlock();
    } else {
      this.api.derive.chain.subscribeNewHeads(async (header) => {
        await this.scanChain(Number(header.number));
      });
    }
  }

  public async scanChain(blockNumber: number): Promise<any> {
    try {
      const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
      const momentPrev = await this.api.query.timestamp.now.at(blockHash);
       // Fetch block data
      const blockData = await this.fetchBlock(blockHash);
      const blockEntity = new BlockEntity();
      blockEntity.authorPublicKey = blockData.authorId?.toString();
      blockEntity.stateRoot = blockData.stateRoot.toString();
      blockEntity.parentHash = blockData.parentHash.toString();
      blockEntity.blockNumber = blockData.number.toString();
      blockEntity.blockHash = blockHash.toString();
      blockEntity.timestamp = new Date(momentPrev.toNumber());
      blockEntity.extrinsicRoot = blockData.extrinsicsRoot.toString();
      await this.blockEntityRepository.save(blockEntity);
  
      await this.processExtrinsics(blockData.extrinsics, blockData.number);
    } catch (error) {
      console.log(`ScanChain Error: ${error}`);
    }
   
  }

  public async getAccountTransactions(accountId: string): Promise<BlockDto[]> {
    this.logger.debug('About to fetch the Block');
    const blocks = await this.blockEntityRepository.find({
      where: {authorPublicKey: accountId},
    });
    this.logger.debug(blocks);

    return blocks.map((block) => toBlockDto(block));
  }
 
  public async getTransaction(accountId: string): Promise<TransactionDto[]>{
    this.logger.debug('About to fetch the transaction');

    const transactions = await this.transactionEntityRepository.find({
      where: {senderId: accountId}
    });

    this.logger.debug(transactions);
    return transactions.map((transaction) => toTransactionDto(transaction));
     
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
        method: `${method.section}.${method.method}`,
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
    try {
      const events = [];
      const transferMethods = ['balances.transfer', 'balances.transferKeepAlive'];
      extrinsic.forEach(async (txn, index) => {
        txn.events.forEach((value, index) => {
          const method = value.method.split('.');
          const eventData = {
            id: `${blockNum}-${index}`,
            module: method[0],
            method: method[1],
          };
          events.push(eventData);
        });
        const transactionEntity = new TransactionEntity();
        transactionEntity.transactionHash = txn.hash?.toString();
        transactionEntity.events = events;
        transactionEntity.nonce = txn.nonce?.toString();
        transactionEntity.transactionIndex = index;
        transactionEntity.success = txn.success;
        transactionEntity.signature = txn.signature?.signature.toString();
        transactionEntity.senderId = txn.signature?.signer.toString();
        if (transferMethods.includes(txn.method)) {
          transactionEntity.destination = txn.args[0];
          transactionEntity.value = txn.args[1];
          transactionEntity.args = null;
        } else {
          transactionEntity.destination = null;
          transactionEntity.value = null;
          transactionEntity.args = txn.args;
        }
       await this.transactionEntityRepository.save(transactionEntity);
      });
    } catch (error) {
      console.log(`error: ${error}`);
      process.exit(1);
    }
  }

  private parseGenericCall(genericCall: GenericCall, registry: Registry): ISanitizedCall {
    const newArgs = {};

    // Pull out the struct of arguments to this call
    const callArgs = genericCall.get('args') as Struct;

    // Make sure callArgs exists and we can access its keys
    if (callArgs && callArgs.defKeys) {
      // paramName is a string
      for (const paramName of callArgs.defKeys) {
        const argument = callArgs.get(paramName);

        if (Array.isArray(argument)) {
          newArgs[paramName] = this.parseArrayGenericCalls(argument, registry);
        } else if (argument instanceof GenericCall) {
          newArgs[paramName] = this.parseGenericCall(argument, registry);
        } else if (paramName === 'call' && argument?.toRawType() === 'Bytes') {
          // multiSig.asMulti.args.call is an OpaqueCall (Vec<u8>) that we
          // serialize to a polkadot-js Call and parse so it is not a hex blob.
          try {
            const call = registry.createType('Call', argument.toHex());
            newArgs[paramName] = this.parseGenericCall(call, registry);
          } catch {
            newArgs[paramName] = argument;
          }
        } else {
          newArgs[paramName] = argument;
        }
      }
    }

    return {
      method: `${genericCall.section}.${genericCall.method}`,
      callIndex: genericCall.callIndex,
      args: newArgs,
    };
  }

  private parseArrayGenericCalls(argsArray: Codec[], registry: Registry): (Codec | ISanitizedCall)[] {
    return argsArray.map((argument) => {
      if (argument instanceof GenericCall) {
        return this.parseGenericCall(argument, registry);
      }

      return argument;
    });
  }
}
