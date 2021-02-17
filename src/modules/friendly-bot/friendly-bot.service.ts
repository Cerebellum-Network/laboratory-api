import {Connection, Repository} from 'typeorm';
import {Injectable, Logger} from '@nestjs/common';
import {InjectConnection, InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '@cere/ms-core';
import {FriendlyBotServiceInterface} from './friendly-bot.interface';

@Injectable()
export class FriendlyBotService implements FriendlyBotServiceInterface {
  public constructor(private readonly configService: ConfigService) {}

 // public issueToken(destination: string): Promise<any> {}
}
