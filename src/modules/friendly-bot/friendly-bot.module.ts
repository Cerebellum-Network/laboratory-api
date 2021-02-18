import {Module} from '@nestjs/common';
import {ConfigModule} from '@cere/ms-core';
import {TypeOrmModule} from '@nestjs/typeorm';
import {BotEntity} from './entities/bot.entity';
import {FriendlyBotController} from './friendly-bot.controller';
import {FriendlyBotService} from './friendly-bot.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([BotEntity])],
  controllers: [FriendlyBotController],
  providers: [FriendlyBotService],
  exports: [],
})
export class FriendlyBotModule {}
