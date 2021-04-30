import {Injectable, Logger} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {BlockEntity} from './entities/block.entity';
import {TransactionEntity} from './entities/transaction.entity';
import {Repository} from 'typeorm';
import {InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '../config/config.service';
import {toBlockDto} from './mapper/position.mapper';
import {GenericEventData, Struct} from '@polkadot/types';
import {formatBalance, u8aToHex} from '@polkadot/util';
import {blake2AsU8a} from '@polkadot/util-crypto';
import {BlockHash} from '@polkadot/types/interfaces/chain';
import {GenericCall} from '@polkadot/types/generic';
import {Codec, Registry} from '@polkadot/types/types';
import {toTransactionDto} from './mapper/transaction.mapper';
import {TransactionsDataDto} from './dto/transactions-data.dto';
import {BlocksDataDto} from './dto/blocks-data.dto';
import {LatestBlockDto} from './dto/latest-block.dto';
import config from '../shared/constant/config';

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

  private networkProperties: { api: ApiPromise; block: number; type: string}[] = [];

  public constructor(
    @InjectRepository(BlockEntity)
    private readonly blockEntityRepository: Repository<BlockEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionEntityRepository: Repository<TransactionEntity>,
    private readonly configService: ConfigService,
  ) {}

  public async init(): Promise<any> {
    this.logger.debug('About to scan the network');
    try {
      const networks = JSON.parse(this.configService.get('NETWORKS'));
      await this.initNetwork(networks);
      this.startScanning();
    } catch (error) {
      this.logger.error(error.toString());
      this.init();
    }
  }

  public startScanning() {
    this.logger.log(`About to start scanning network`);
    this.networkProperties.forEach((item) => {
      this.processOldBlock(item.api, item.type);
    });
  }

  public async initNetwork(networks: any) {
    this.logger.debug('Init Network');
    for (const network of networks) {
      const provider = new WsProvider(network.URL);
      const api = await ApiPromise.create({
        provider,
        types: config,
      });

      await api.isReady;
      const chain = await api.rpc.system.chain();
      this.logger.log(`Connected to ${chain}`);
      const blockNumber = await this.initBlockNumber(network.NETWORK);
      this.networkProperties.push({api, block: blockNumber, type: network.NETWORK});
    }
  }

  // Process the blocks from where it has been leftout to current block
  public async processOldBlock(api: any, network: string): Promise<void> {
    try {
      const blockNumber = this.fetchBlockNumber(network);
      let latestBlock = await api.rpc.chain.getHeader();

      for (let i: number = blockNumber + 1; i <= Number(latestBlock.number); i += 1) {
        await this.scanChain(i, api, network);
        latestBlock = await api.rpc.chain.getHeader();
      }
      this.processBlock(api, network);
    } catch (error) {
      this.logger.error(error.toString());
      this.init();
    }
  }

  // Process the current blocks.
  public async processBlock(api: any, network: string): Promise<void> {
    try {
      const blockNumber = this.fetchBlockNumber(network);
      const latestBlock = await api.rpc.chain.getHeader();

      if (blockNumber !== Number(latestBlock.number)) {
        await this.processOldBlock(api, network);
      } else {
        api.derive.chain.subscribeNewHeads(async (header) => {
          await this.scanChain(Number(header.number), api, network);
        });
      }
    } catch (error) {
      this.logger.error(error.toString());
      this.init();
    }
  }

  public async scanChain(blockNumber: number, api: any, network: string): Promise<any> {
    try {
      const blockEntity = new BlockEntity();
      this.networkProperties.find(item => item.type === network).block = blockNumber;
      blockEntity.blockNumber = blockNumber;
      blockEntity.timestamp = new Date();
      blockEntity.networkType = network;

      await this.blockEntityRepository.save(blockEntity);

      const blockHash: any = await api.rpc.chain.getBlockHash(blockNumber);
      const momentPrev = await api.query.timestamp.now.at(blockHash);
      // Fetch block data
      const blockData = await this.fetchBlock(blockHash, api);

      blockEntity.authorPublicKey = blockData.authorId?.toString();
      blockEntity.stateRoot = blockData.stateRoot.toString();
      blockEntity.parentHash = blockData.parentHash.toString();

      blockEntity.blockHash = blockHash.toString();
      blockEntity.timestamp = new Date(momentPrev.toNumber());
      blockEntity.extrinsicRoot = blockData.extrinsicsRoot.toString();

      await this.blockEntityRepository.save(blockEntity);

      await this.processExtrinsics(blockData.extrinsics, blockEntity, network);
    } catch (error) {
      this.logger.error(error.toString());
      this.init();
    }
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
    });

    const data = await result.map((transaction) => toTransactionDto(transaction));

    return new TransactionsDataDto(data, count, balance);
  }

  public async getLatestBlock(network: string): Promise<LatestBlockDto> {
    this.logger.debug(`About to get latest block`);
    const query = this.blockEntityRepository
      .createQueryBuilder('blocks')
      .select('MAX(blocks.blockNumber)', 'blockNumber')
      .where('blocks.networkType = :type', {type: network});

    const syncedBlock = await query.getRawOne();
    return new LatestBlockDto(syncedBlock.blockNumber);
  }

  public async getBalance(address: string, network: string): Promise<any> {
    this.logger.debug(`About to get balance for: ${address}`);
    const networkParam = this.networkProperties.find((item) => item.type === network);
    const {
      data: {free: balance},
    } = await networkParam.api.query.system.account(address);
    // FIXME: Fix the decimal position once it is fixed in chain
    // const decimal = await this.api.registry.chainDecimals;
    const result = await formatBalance(balance, {decimals: 15});
    return result;
  }

  /**
   * Fetch Block Number from database.
   * @param network
   * @returns blockNumber
   */
  private fetchBlockNumber(network: string) {
    const blockNumber = this.networkProperties.find(item => item.type === network).block;
    return blockNumber;
  }

  /**
   * Initialize the block number
   * @param network network
   */
  private async initBlockNumber(network: string) {
    const query = this.blockEntityRepository
      .createQueryBuilder('blocks')
      .select('MAX(blocks.blockNumber)', 'blockNumber')
      .where('blocks.networkType = :type', {type: network});

    const syncedBlock = await query.getRawOne();
    const blockNumber = Number(syncedBlock.blockNumber);
    return blockNumber;
  }

  private async fetchBlock(hash: BlockHash, api: any): Promise<any> {
    const [{block}, events] = await Promise.all([api.rpc.chain.getBlock(hash), api.query.system.events.at(hash)]);

    const {parentHash, number, stateRoot, extrinsicsRoot} = block.header;

    const onInitialize = {events: [] as ISanitizedEvent[]};
    const onFinalize = {events: [] as ISanitizedEvent[]};

    const header = await api.derive.chain.getHeader(hash);
    const authorId = header?.author;

    const logs = block.header.digest.logs.map((log) => {
      const {type, index, value} = log;

      return {type, index, value};
    });

    const defaultSuccess = typeof events === 'string' ? events : false;
    const extrinsics = block.extrinsics.map((extrinsic) => {
      const {method, nonce, signature, signer, isSigned, tip, args} = extrinsic;
      const convertedHash = u8aToHex(blake2AsU8a(extrinsic.toU8a(), 256));

      return {
        method: `${method.section}.${method.method}`,
        signature: isSigned ? {signature, signer} : null,
        nonce,
        args,
        // newArgs: this.parseGenericCall(method).args,
        tip,
        hash: convertedHash,
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
        } as any;

        if (phase.isApplyExtrinsic) {
          const extrinsicIdx = phase.asApplyExtrinsic.toNumber();
          const extrinsic = extrinsics[extrinsicIdx];

          if (!extrinsic) {
            this.logger.error(`Block ${block.header.number.toNumber()} ${hash}: Missing extrinsic ${extrinsicIdx}`);
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
              // eslint-disablRegistrye-next-line @typescript-eslint/no-unsafe-member-access
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

  private processExtrinsics(extrinsic: any, block: any, network: string): any {
    try {
      const events = [];
      const transferMethods = [
        'balances.transfer',
        'balances.transferKeepAlive',
        'contracts.instantiate',
        'contracts.putCode',
        'contracts.call',
      ];
      extrinsic.forEach(async (txn, index) => {
        if (transferMethods.includes(txn.method)) {
          txn.events.forEach((value) => {
            const method = value.method.split('.');
            const eventData = {
              id: `${block.blockNumber}-${index}`,
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
          transactionEntity.args = txn.args?.toString();
          transactionEntity.method = txn.method;
          transactionEntity.timestamp = block.timestamp;
          transactionEntity.block = block;
          transactionEntity.networkType = network;
          await this.transactionEntityRepository.save(transactionEntity);
        } else {
          // this.logger.debug(`No Transaction for block: ${block.blockNumber}\n\n`);
        }
      });
    } catch (error) {
      this.logger.error(error.toString());
      this.init();
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
