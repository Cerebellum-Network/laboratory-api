import {MethodName} from '../../../../../libs/constants/methodName';
import {Injectable, Logger} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {getConnection, Repository} from 'typeorm';
import {InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '../../../../../libs/config/src';
import {GenericEventData, Struct} from '@polkadot/types';
import {u8aToHex} from '@polkadot/util';
import {blake2AsU8a} from '@polkadot/util-crypto';
import {BlockHash} from '@polkadot/types/interfaces/chain';
import {GenericCall} from '@polkadot/types/generic';
import {Codec, Registry} from '@polkadot/types/types';
import config from '../../../../../libs/constants/config';
import Deferred from 'promise-deferred';
import {BlockEntity} from '../../../../../libs/block-scanner/src/entities/block.entity';
import {TransactionEntity} from '../../../../../libs/block-scanner/src/entities/transaction.entity';
import {Cron} from '@nestjs/schedule';
import {validatorStatus} from '../../../../../libs/health/src/validator-status.enum';
import {ValidatorEntity} from '../../../../../libs/health/src/entities/validator.entity';

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
  stopRequested: boolean;
  stopPromise: any;
}

@Injectable()
export class BlockScannerService implements BlockScannerServiceInterface {
  public logger = new Logger(BlockScannerService.name);

  public networkMap: Map<string, NetworkProp> = new Map<string, NetworkProp>();

  private delayTimeMilliseconds = this.configService.get('DELAY_TIME_MS');

  public constructor(
    @InjectRepository(BlockEntity)
    private readonly blockEntityRepository: Repository<BlockEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionEntityRepository: Repository<TransactionEntity>,
    @InjectRepository(ValidatorEntity)
    private readonly validatorEntityRepository: Repository<ValidatorEntity>,
    private readonly configService: ConfigService,
  ) {}

  public async init(): Promise<void> {
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

  public async initNetwork(networks: any): Promise<void> {
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

      this.networkMap.set(network.NETWORK, {api, blockNumber, stopRequested: false, stopPromise: undefined});
    }
  }

  public startScanning(): void {
    for (const [key, value] of this.networkMap) {
      this.logger.log(`About to start scanning ${key} network `);
      const {api} = value;
      this.processNetwork(api, key);
    }
  }

  public async processNetwork(api: ApiPromise, network: string): Promise<void> {
    this.logger.log(`About to process ${network} Network`);
    while (true) {
      try {
        let blockNumber = await this.fetchBlockNumber(network);
        let latestBlock = await api.rpc.chain.getHeader();
        while (blockNumber < Number(latestBlock.number)) {
          await this.processOldBlocks(blockNumber, Number(latestBlock.number), api, network);
          blockNumber = await this.fetchBlockNumber(network);
          latestBlock = await api.rpc.chain.getHeader();
        }
        await this.processBlocks(api, network);
      } catch (error) {
        this.logger.error(`Error in process ${network} network ${error}`);
        await this.sleep(this.delayTimeMilliseconds);
      }
    }
  }

  // Process the blocks from where it has been left out to current block
  public async processOldBlocks(
    startBlockNumber: number,
    latestBlockNumber: number,
    api: ApiPromise,
    network: string,
  ): Promise<void> {
    this.logger.log(`Process old blocks of ${network} from ${startBlockNumber} to ${latestBlockNumber}`);
    try {
      for (let i: number = startBlockNumber + 1; i <= latestBlockNumber; i += 1) {
        const {stopRequested} = this.networkMap.get(network);

        if (stopRequested) {
          const {stopPromise} = this.networkMap.get(network);
          stopPromise.resolve();
          return;
        }
        await this.scanBlock(i, api, network);
      }
    } catch (error) {
      this.logger.error(`Error in ${network} process old block ${error}`);
      throw error;
    }
  }

  public processBlocks(api: ApiPromise, network: string): Promise<void> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      this.logger.log(`Process Blocks`);
       const unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {
          try {
            this.logger.debug(`Process block ${header.number.toNumber()}`);
            await this.scanBlock(Number(header.number), api, network);
          } catch (error) {
            this.logger.error(`Error in ${network}, process blocks ${error}`);
            unsubscribe();
            reject(error);
          }
        });
    });
  }

  public async scanBlock(blockNumber: number, api: ApiPromise, network: string): Promise<any> {
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
      this.logger.error(`Error in ${network} at ${blockNumber}, scan block ${error}`);
      throw error;
    }
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
    this.processNetwork(api, network);

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
      let args;
      let sender;
      const transferMethods = [
        MethodName.balanceTransfer,
        MethodName.balanceTransferKeepAlive,
        MethodName.contractsInstantiate,
        MethodName.contractsPutcode,
        MethodName.contractsCall,
        MethodName.utilityBatch,
        MethodName.cereDDCModuleSendData,
        MethodName.sessionSetKeys,
        MethodName.stakingBond,
        MethodName.stakingValidate,
        MethodName.stakingNominate,
        MethodName.chainBridgeAckProposal,
      ];
      extrinsic.forEach(async (txn, index) => {
        if (transferMethods.includes(txn.method)) {
          if (txn.method === MethodName.chainBridgeAckProposal) {
            const extractedData: { sender: string, args: string } = this.extractSenderAndArgsFromChainbridge(txn.events);
            if (extractedData === null) {
              return;
            }
            args = extractedData.args;
            sender = extractedData.sender.toString();
          } else if (txn.method === MethodName.balanceTransfer || MethodName.balanceTransferKeepAlive) {
            const {dest, value} = txn.args;
            args = `${dest}, ${value}`;
            sender = txn.signature?.signer.toString();
          } else {
            args = txn.args.toString();
            sender = txn.signature?.signer.toString()
          }
          txn.events.forEach((value) => {
            const method = value.method.split('.');
            const eventData = {
              id: `${block.blockNumber}-${index}`,
              module: method[0],
              method: method[1],
            };
            events.push(eventData);
          });

          const transactionEntity = {
            transactionHash: txn.hash?.toString(),
            events,
            nonce: txn.nonce?.toString(),
            transactionIndex: index,
            success: txn.success,
            signature: txn.signature?.signature.toString(),
            senderId: sender,
            args,
            method: txn.method,
            timestamp: block.timestamp,
            block,
            networkType: network,
          };

          await this.saveTransactionData(transactionEntity);
        } else {
          // this.logger.debug(`No Transaction for block: ${block.blockNumber}\n\n`);
        }
      });
    } catch (error) {
      this.logger.error(error.toString());
      this.init();
    }
  }

  private extractSenderAndArgsFromChainbridge(events: any): { sender: string, args: string } {
    for (const value of events) {
      if (value.method === MethodName.balanceTransferEvent) {
        const sender = value.data[0];
        const args = `${value.data[1]}, ${value.data[2]}`;
        this.logger.debug(sender);
        return {sender, args};
      }
    }
    return null;
  }

  private async saveTransactionData(transaction) {
    await this.transactionEntityRepository
      .createQueryBuilder()
      .insert()
      .into('transactions')
      .values(transaction)
      .onConflict(`("transactionHash") DO NOTHING`)
      .execute();
  }

  /**
   * Run cron job At minute 40 to check for slashed validator node.
   */
  @Cron('40 * * * *')
  public async getSlashedValidator(): Promise<void> {
    this.logger.log(`About to run cron for validator slashing`);
    for (const [key, {api}] of this.networkMap) {
      const currentEra = await api.query.staking.currentEra();
      const result = await api.query.staking.unappliedSlashes(currentEra.toString());
      if (result.length === 0) {
        this.logger.debug(`No validator got slashed in ${currentEra.toString()} of ${key}`);
      } else {
        const slashedValidator: string[] = [];
        result.forEach((element) => {
          slashedValidator.push(element.validator.toString());
        });
        const query = await this.validatorEntityRepository
            .createQueryBuilder('validator')
            .select('MAX(validator.era)', 'era')
            .where('validator.network = :network', {network: key});

        const {era} = await query.getRawOne();
        if (+era !== +currentEra) {
          const validatorEntity = new ValidatorEntity();
          validatorEntity.era = currentEra.toString();
          validatorEntity.status = validatorStatus.NEW;
          validatorEntity.validator = slashedValidator;
          validatorEntity.network = key;
          await this.validatorEntityRepository.save(validatorEntity);
        }
      }
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

  private sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
