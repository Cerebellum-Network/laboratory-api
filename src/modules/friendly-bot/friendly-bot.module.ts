/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import {RateLimiterModule} from 'nestjs-rate-limiter';
import {Module} from '@nestjs/common';
import {ConfigModule} from '../config/config.module';
import {TypeOrmModule} from '@nestjs/typeorm';
import {PayoutEntity} from './entities/payout.entity';
import {FriendlyBotController} from './friendly-bot.controller';
import {FriendlyBotService} from './friendly-bot.service';
import {LoggerMiddleware} from '../common/logger.middleware'

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([PayoutEntity]), RateLimiterModule],
  controllers: [FriendlyBotController],
  providers: [
    FriendlyBotService,
  ],
  exports: [],
})
export class FriendlyBotModule {
  configure(consumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('friend-bot');
  }
}