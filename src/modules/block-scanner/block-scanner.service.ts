import {Injectable, Logger} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {BlockEntity} from './entities/block.entity';
import {TransactionEntity} from './entities/transaction.entity';
import {getConnection, Repository} from 'typeorm';
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
import qaConfig from '../shared/constant/qanet.config';
import Deferred from 'promise-deferred';

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

export interface NetworkProp {
  api: ApiPromise;
  blockNumber: number;
  stopRequested: boolean,
  stopPromise: any
};

@Injectable()
export class BlockScannerService implements BlockScannerServiceInterface {
  public logger = new Logger(BlockScannerService.name);

  public networkMap: Map<string, NetworkProp> = new Map<string, NetworkProp>();

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
    for (const [key, value] of this.networkMap) {
      this.processOldBlock(value.api, key);
    }
  }

  public async initNetwork(networks: any) {
    this.logger.debug('Init Network');
    for (const network of networks) {
      const provider = new WsProvider(network.URL);
      const networkConfig = network.NETWORK === 'QANET' ? qaConfig : config;
      const api = await ApiPromise.create({
        provider,
        types: networkConfig,
      });

      await api.isReady;
      const chain = await api.rpc.system.chain();
      this.logger.log(`Connected to ${chain}`);
      const blockNumber = await this.initBlockNumber(network.NETWORK);

      this.networkMap.set(network.NETWORK, {api, blockNumber, stopRequested: false, stopPromise: undefined});
    }
  }

  // Process the blocks from where it has been leftout to current block
  public async processOldBlock(api: ApiPromise, network: string): Promise<void> {
    try {
      const blockNumber = await this.fetchBlockNumber(network);
      let latestBlock = await api.rpc.chain.getHeader();

      for (let i: number = blockNumber + 1; i <= Number(latestBlock.number); i += 1) {
        const {stopRequested} = this.networkMap.get(network);
        
        if (stopRequested) {
          const {stopPromise} = this.networkMap.get(network);
          stopPromise.resolve();
          return;
        }
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
  public async processBlock(api: ApiPromise, network: string): Promise<void> {
    try {
      const blockNumber = await this.fetchBlockNumber(network);

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

  public async scanChain(blockNumber: number, api: ApiPromise, network: string): Promise<any> {
    try {
      this.logger.debug(`scan chain: ${network} - ${blockNumber}`);
      const networkProp = this.networkMap.get(network);
      networkProp.blockNumber = blockNumber;
      const blockHash: any = await api.rpc.chain.getBlockHash(blockNumber);
      const momentPrev = await api.query.timestamp.now.at(blockHash);
      // Fetch block data
      const blockData = await this.fetchBlock(blockHash, api);

      const blockEntity = {
        blockNumber,
        networkType: network,
        authorPublicKey: blockData.authorId?.toString(),
        stateRoot: blockData.stateRoot.toString(),
        parentHash: blockData.parentHash.toString(),
        blockHash: blockHash.toString(),
        timestamp: new Date(momentPrev.toNumber()),
        extrinsicRoot: blockData.extrinsicsRoot.toString(),
      };

      await getConnection().createQueryBuilder().insert().into('blocks').values(blockEntity).execute();

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
      order: {
        timestamp: 'ASC'
      }
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
    const networkProp = this.networkMap.get(network);
    const {
      data: {free: balance},
    } = await networkProp.api.query.system.account(address);
    // TODO:https://cerenetwork.atlassian.net/browse/CBI-796
    const decimal = network === "QANET" ? 15: 10;
    const result = await formatBalance(balance, {decimals: decimal});
    return result;
  }

  /**
   * Clean tables and restart network scanning
   * @param network network identifier
   * @param accessKey access key
   * @returns
   */
  public async restart(network: string): Promise<any> {
    this.logger.debug(`About to delete records for : ${network} and restart service`);

    this.networkMap.get(network).stopPromise = new Deferred();
    this.networkMap.get(network).stopRequested = true;

    const {stopPromise} = this.networkMap.get(network);

    await stopPromise.promise;

    this.logger.debug('stop promise resolved');
    this.logger.debug('Cleaning Transaction and Block table');
    await this.transactionEntityRepository.delete({networkType: network});
    await this.blockEntityRepository.delete({networkType: network});

    this.networkMap.get(network).blockNumber = undefined;
    this.networkMap.get(network).stopRequested = false;
    const {api} = this.networkMap.get(network);

    this.processOldBlock(api, network);

    return true;
  }

  /**
   * Checks for duplicate entries
   * @param startTime start time
   * @param network network identifier
   */
  public async haveDuplicates(startTime: string, network: string): Promise<any> {
    this.logger.log(`About to check for duplicate enteries in transactions from ${startTime} of ${network}`);
    let rawQuery;
    if (startTime === undefined) {
      rawQuery = `SELECT "transactionHash" FROM transactions WHERE "networkType" = '${network}' GROUP BY "transactionHash" HAVING COUNT("transactionHash") > 1`;
    } else {
      rawQuery = `SELECT "transactionHash" FROM transactions WHERE "networkType" = '${network}' AND timestamp >= '${startTime}' GROUP BY "transactionHash" HAVING COUNT("transactionHash") > 1`;
    }

    const duplicate = await this.transactionEntityRepository.query(rawQuery);
    return duplicate;
  }

  /**
   * Fetch Block Number from database.
   * @param network
   * @returns blockNumber
   */
  private async fetchBlockNumber(network: string) {
    const {blockNumber} = this.networkMap.get(network);
    if (blockNumber === undefined) {
      const blockNumber = await this.initBlockNumber(network);
      return blockNumber;
    }
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
      const {method, nonce, signature, signer, isSigned, tip} = extrinsic;
      const hash = u8aToHex(blake2AsU8a(extrinsic.toU8a(), 256));
      const call = block.registry.createType('Call', method);

      return {
        method: `${method.section}.${method.method}`,
        signature: isSigned ? {signature, signer} : null,
        nonce,
        args: this.parseGenericCall(call, block.registry).args,
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
        'utility.batch',
        'cereDdcModule.sendData',
        'session.setKeys',
        'staking.bond',
        'staking.validate',
        'staking.nominate',
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

          let arg;
          if (txn.method === 'balances.transfer' || 'balances.transferKeepAlive') {
            const {dest, value} = txn.args;
            arg = `${dest}, ${value}`;
          } else {
            arg = txn.args.toString();
          }

          const transactionEntity = {
            transactionHash: txn.hash?.toString(),
            events,
            nonce: txn.nonce?.toString(),
            transactionIndex: index,
            success: txn.success,
            signature: txn.signature?.signature.toString(),
            senderId: txn.signature?.signer.toString(),
            args: arg,
            method: txn.method,
            timestamp: block.timestamp,
            block,
            networkType: network,
          };

          await this.transactionEntityRepository
            .createQueryBuilder()
            .insert()
            .into('transactions')
            .values(transactionEntity)
            .onConflict(`("transactionHash") DO NOTHING`)
            .execute();
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
