import {Repository} from 'typeorm';
import {BadRequestException, Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '../config/config.service';
import {FriendlyBotServiceInterface} from './friendly-bot.interface';
import {ApiPromise, Keyring, WsProvider} from '@polkadot/api';
import {KeypairType} from '@polkadot/util-crypto/types';
import {KeyringPair} from '@polkadot/keyring/types';
import moment from 'moment';
import {PayoutEntity} from './entities/payout.entity';
import {AssetDto} from './dto/assets.dto';
import {BalanceDto} from './dto/balance.dto';
import {Hash} from '@polkadot/types/interfaces';

@Injectable()
export class FriendlyBotService implements FriendlyBotServiceInterface {
  public logger = new Logger(FriendlyBotService.name);

  private networkParams: {api: ApiPromise; faucet: any, type: string}[] = [];

  private keyRingType: KeypairType;

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PayoutEntity)
    private readonly botEntityRepository: Repository<PayoutEntity>,
  ) {
    this.init();
  }

  public init(): any {
    const networks = JSON.parse(process.env.NETWORKS);
    networks.forEach(async (network) => {
      const api = await this.initProvider(network.URL);
      const faucet = await this.initFaucet(network.FAUCET, network.PASSWORD);
      this.logger.log(`Faucet Address: ${faucet.address}`);
      this.networkParams.push({api, faucet, type: network.NETWORK});
    });
  }

  public async initProvider(url: string): Promise<ApiPromise> {
    const provider = new WsProvider(url);
    const api = await ApiPromise.create({provider});
    await api.isReady;
    const chain = await api.rpc.system.chain();
    this.logger.log(`Connected to ${chain}`);
    return api;
  }

  public initFaucet(walletJson: any, password: string): any {
    const keyring = new Keyring({type: 'sr25519'});
    this.keyRingType = 'sr25519';
    const wallet = keyring.addFromJson(walletJson);
    wallet.decodePkcs8(password);
    return wallet;
  }

  public async issueToken(destination: string, network: string): Promise<AssetDto> {
    // formatBalance(balance, {decimals: Number(decimal)});
    const networks = JSON.parse(process.env.NETWORKS);
    if (networks.find((item) => network === item.NETWORK) === undefined) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const networkParam = this.networkParams.find((item) => item.type === network);
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
      .andWhere('bots.network = :network', {network: networkParam.type})
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
    botEntity.sender = networkParam.faucet.address;
    botEntity.network = networkParam.type;
    await this.botEntityRepository.save(botEntity);

    return new AssetDto(hash);
  }

  private async getBalance(address: string, network: string): Promise<BalanceDto> {
    this.logger.log(`About to get balance for: ${address}`);
    const networkParam = this.networkParams.find((item) => item.type === network);
    const account = await networkParam.api.query.system.account(address);
    const balance = account.data.free;
    const decimal = await networkParam.api.registry.chainDecimals;
    return new BalanceDto(balance, decimal);
  }

  private async transfer(address: string, value: string, network: string): Promise<Hash> {
    this.logger.debug(`About to transfer assets to ${address}`);
    const networkParam = this.networkParams.find((item) => item.type === network);
    const {nonce} = await networkParam.api.query.system.account(networkParam.faucet.address);
    const hash = networkParam.api.tx.balances.transfer(address, value).signAndSend(networkParam.faucet, {nonce});
    return hash;
  }
}
