import {Connection, Repository} from 'typeorm';
import {Injectable, Logger} from '@nestjs/common';
import {InjectConnection, InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '@cere/ms-core';

@Injectable()
export class FriendlyBotService {
  public constructor(private readonly configService: ConfigService) {}
}
