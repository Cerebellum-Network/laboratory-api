import {Connection, Repository} from 'typeorm';
import {Injectable, Logger} from '@nestjs/common';
import {InjectConnection, InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '@cere/ms-core';
import {FriendlyBotServiceInterface} from './friendly-bot.interface';
import {ApiPromise, Keyring, WsProvider} from '@polkadot/api';
import {KeypairType} from '@polkadot/util-crypto/types';
import {KeyringPair} from '@polkadot/keyring/types';
import moment from 'moment';
import {BotEntity} from './entities/bot.entity';

@Injectable()
export class FriendlyBotService implements FriendlyBotServiceInterface {
  public logger = new Logger(FriendlyBotService.name);

  private api: ApiPromise;

  private keyRingType: KeypairType;

  private appKeyring: KeyringPair;

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(BotEntity)
    private readonly botEntityRepository: Repository<BotEntity>,
  ) {
    this.init();
  }

  public async init(): Promise<ApiPromise> {
    const networkWsUrl = this.configService.get('NETWORK_WS_URL');
    const wsProvider = new WsProvider(networkWsUrl);
    this.api = await ApiPromise.create({provider: wsProvider});
    await this.api.isReady;
    const chain = await this.api.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);
    const appWalletJson = this.configService.get('SUBSTRATE_APP_WALLET_JSON');
    const appPassphrase = this.configService.get('SUBSTRATE_APP_WALLET_PASSPHRASE');
    const keyring = new Keyring({type: 'sr25519'});
    this.keyRingType = 'sr25519';
    this.appKeyring = keyring.addFromJson(JSON.parse(appWalletJson));
    this.appKeyring.decodePkcs8(appPassphrase);
    this.logger.log(`Faucet account: ${this.appKeyring.address}`);
    return this.api;
  }

  public async issueToken(destination: string): Promise<any> {
    // formatBalance(balance, {decimals: Number(decimal)});
    const {balance, decimal} = await this.getBalance(destination);
    const initialBal = balance / 10 ** 15;
    this.logger.log(`Initial Balance: ${initialBal}`);
    const value = await this.configService.get('NUMBER_OF_TOKENS_TO_SEND');
    const maxBalance = Number(this.configService.get('MAX_BALANCE'));
    const maxRequestPerDay = Number(await this.configService.get('REQUEST_PER_DAY'))
    if (initialBal >= maxBalance) {
      return `Your balance is ${initialBal}`;
    }

    const time =  moment(new Date()).format("DD-MM-YYYY")
    const count = await this.botEntityRepository.createQueryBuilder('bots').where("DATE(bots.createdAt) = :date", {date: time}).getCount();
    if (maxRequestPerDay < count) {
      return `Your limit exceeds`;
    }
    const hash = await this.transfer(destination, value);
    const botEntity = new BotEntity();
    botEntity.destination = destination;
    botEntity.sender = this.appKeyring.address;
    botEntity.txnHash = hash;
    botEntity.value = value;
    await this.botEntityRepository.save(botEntity);
    return hash;
  }

  private async getBalance(address: string): Promise<any> {
    const {
      data: {free: balance},
    } = await this.api.query.system.account(address);
    const decimal = await this.api.registry.chainDecimals;
    return {
      balance,
      decimal,
    };
  }

  private async transfer(address: string, value: string): Promise<any> {
    const {nonce} = await this.api.query.system.account(this.appKeyring.address);
    
    const hash = await this.api.tx.balances.transfer(address, value).signAndSend(this.appKeyring, {nonce});
    return hash.toHex();
  }
}
