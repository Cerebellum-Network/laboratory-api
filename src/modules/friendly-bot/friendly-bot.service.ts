import {Repository} from 'typeorm';
import {BadRequestException, Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '../config/config.service';
import {FriendlyBotServiceInterface} from './friendly-bot.interface';
import {ApiPromise, Keyring, WsProvider} from '@polkadot/api';
import {KeypairType} from '@polkadot/util-crypto/types';
import {KeyringPair} from '@polkadot/keyring/types';
import moment from 'moment';
import {PayoutEntity, NetworkEnum} from './entities/payout.entity';
import {AssetDto} from './dto/assets.dto';
import {BalanceDto} from './dto/balance.dto';
import {Hash} from '@polkadot/types/interfaces';

@Injectable()
export class FriendlyBotService implements FriendlyBotServiceInterface {
  public logger = new Logger(FriendlyBotService.name);

  private testNetApi: ApiPromise;

  private devApi: ApiPromise;

  private dev1Api: ApiPromise;

  private keyRingType: KeypairType;

  private testNetappKeyring: KeyringPair;

  private devappKeyring: KeyringPair;

  private dev1appKeyring: KeyringPair;

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PayoutEntity)
    private readonly botEntityRepository: Repository<PayoutEntity>,
  ) {
    this.testNetInit();
    this.devInit();
    this.dev1Init();
  }

  public async testNetInit(): Promise<ApiPromise> {
    const testNetWsUrl = this.configService.get('TESTNET_WS_URL');
    const wsProvider = new WsProvider(testNetWsUrl);
    this.testNetApi = await ApiPromise.create({provider: wsProvider});
    await this.testNetApi.isReady;
    const chain = await this.testNetApi.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);
    const appWalletJson = this.configService.get('TESTNET_APP_WALLET_JSON');
    const appPassphrase = this.configService.get('TESTNET_APP_WALLET_PASSPHRASE');
    const keyring = new Keyring({type: 'sr25519'});
    this.keyRingType = 'sr25519';
    this.testNetappKeyring = keyring.addFromJson(JSON.parse(appWalletJson));
    this.testNetappKeyring.decodePkcs8(appPassphrase);
    this.logger.log(`Faucet account: ${this.testNetappKeyring.address}`);

    return this.testNetApi;
  }

  public async devInit(): Promise<ApiPromise> {
    const devWsUrl = this.configService.get('DEV_WS_URL');
    const wsProvider = new WsProvider(devWsUrl);
    this.devApi = await ApiPromise.create({provider: wsProvider});
    await this.devApi.isReady;
    const chain = await this.devApi.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);
    const appWalletJson = this.configService.get('DEV_APP_WALLET_JSON');
    const appPassphrase = this.configService.get('DEV_APP_WALLET_PASSPHRASE');
    const keyring = new Keyring({type: 'sr25519'});
    this.keyRingType = 'sr25519';
    this.devappKeyring = keyring.addFromJson(JSON.parse(appWalletJson));
    this.devappKeyring.decodePkcs8(appPassphrase);
    this.logger.log(`Faucet account: ${this.devappKeyring.address}`);

    return this.devApi;
  }

  public async dev1Init(): Promise<ApiPromise> {
    const devWsUrl = this.configService.get('NETWORK_WS_URL');
    const wsProvider = new WsProvider(devWsUrl);
    this.dev1Api = await ApiPromise.create({provider: wsProvider});
    await this.dev1Api.isReady;
    const chain = await this.dev1Api.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);
    const appWalletJson = this.configService.get('DEV1_APP_WALLET_JSON');
    const appPassphrase = this.configService.get('DEV1_APP_WALLET_PASSPHRASE');
    const keyring = new Keyring({type: 'sr25519'});
    this.keyRingType = 'sr25519';
    this.dev1appKeyring = keyring.addFromJson(JSON.parse(appWalletJson));
    this.dev1appKeyring.decodePkcs8(appPassphrase);
    this.logger.log(`Faucet account: ${this.dev1appKeyring.address}`);

    return this.dev1Api;
  }

  public async issueToken(destination: string, network: NetworkEnum): Promise<AssetDto> {
    // formatBalance(balance, {decimals: Number(decimal)});
    if (!Object.values(NetworkEnum).includes(network)) {
      throw new BadRequestException(`Invalid network type, Network type can be ${Object.values(NetworkEnum)}`);
    }
    const {balance} = await this.getBalance(destination, network);
    const initialBal = +balance / 10 ** 15;
    this.logger.log(`Initial Balance: ${initialBal}`);
    const value = await this.configService.get('NUMBER_OF_TOKENS_TO_SEND');
    const maxBalance = Number(this.configService.get('MAX_BALANCE'));
    const maxRequestPerDay = Number(await this.configService.get('REQUEST_PER_DAY'));
    if (initialBal >= maxBalance) {
      throw new BadRequestException(`Your balance is ${initialBal}, So we couldn't process your request.`);
    }

    const time = moment(new Date()).format('YYYY-MM-DD');
    const count = await this.botEntityRepository
      .createQueryBuilder('bots')
      .where('DATE(bots.createdAt) = :date', {date: time})
      .andWhere('bots.network = :network', {network: NetworkEnum[network]})
      .getCount();

    this.logger.debug(`Today's requests: ${count}`);

    if (maxRequestPerDay < count) {
      throw new BadRequestException(`We exceed our daily limit: ${maxRequestPerDay}. Kindly try tomorrow`);
    }
    const hash = (await this.transfer(destination, value, network)).toString();
    const botEntity = new PayoutEntity();
    botEntity.destination = destination;
    botEntity.txnHash = hash;
    botEntity.value = value;
    switch (network) {
      case NetworkEnum.TESTNET: {
        botEntity.sender = this.testNetappKeyring.address;
        botEntity.network = NetworkEnum.TESTNET;
        break;
      }

      case NetworkEnum.TESTNET_DEV: {
        botEntity.sender = this.devappKeyring.address;
        botEntity.network = NetworkEnum.TESTNET_DEV;
        break;
      }
      case NetworkEnum.TESTNET_DEV1: {
        botEntity.sender = this.dev1appKeyring.address;
        botEntity.network = NetworkEnum.TESTNET_DEV1;
        break;
      }
      default:
        throw new BadRequestException(`Invalid network type, Network type can be ${Object.values(NetworkEnum)}`);
        break;
    }
    await this.botEntityRepository.save(botEntity);

    return new AssetDto(hash);
  }

  private async getBalance(address: string, network: string): Promise<BalanceDto> {
    this.logger.log(`About to get balance for: ${address}`);
    let decimal;
    let balance;
    switch (network) {
      case NetworkEnum.TESTNET: {
        const account = await this.testNetApi.query.system.account(address);
        balance = account.data.free.toString();
        decimal = await this.testNetApi.registry.chainDecimals;
        break;
      }
      case NetworkEnum.TESTNET_DEV: {
        const account = await this.testNetApi.query.system.account(address);
        balance = account.data.free.toString();
        decimal = await this.devApi.registry.chainDecimals;
        break;
      }
      case NetworkEnum.TESTNET_DEV1: {
        const account = await this.testNetApi.query.system.account(address);
        balance = account.data.free.toString();
        decimal = await this.dev1Api.registry.chainDecimals;
        break;
      }
      default:
        throw new BadRequestException(`Invalid network type, Network type can be ${Object.values(NetworkEnum)}`);
        break;
    }

    return new BalanceDto(balance, decimal);
  }

  private async transfer(address: string, value: string, network: string): Promise<Hash> {
    this.logger.debug(`About to transfer assets to ${address}`);
    switch (network) {
      case NetworkEnum.TESTNET: {
        const {nonce} = await this.testNetApi.query.system.account(this.testNetappKeyring.address);
        const hash = this.testNetApi.tx.balances.transfer(address, value).signAndSend(this.testNetappKeyring, {nonce});
        return hash;
      }

      case NetworkEnum.TESTNET_DEV: {
        const {nonce} = await this.devApi.query.system.account(this.devappKeyring.address);
        const hash = this.devApi.tx.balances.transfer(address, value).signAndSend(this.devappKeyring, {nonce});
        return hash;
      }

      case NetworkEnum.TESTNET_DEV1: {
        const {nonce} = await this.dev1Api.query.system.account(this.dev1appKeyring.address);
        const hash = this.dev1Api.tx.balances.transfer(address, value).signAndSend(this.dev1appKeyring, {nonce});
        return hash;
      }
      default:
        throw new BadRequestException(`Invalid network type`);
    }
  }
}
