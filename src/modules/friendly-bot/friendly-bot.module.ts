import {RateLimiterInterceptor, RateLimiterModule} from 'nestjs-rate-limiter';
import {Module} from '@nestjs/common';
import {ConfigModule} from '../config/config.module';
import {TypeOrmModule} from '@nestjs/typeorm';
import {PayoutEntity} from './entities/payout.entity';
import {FriendlyBotController} from './friendly-bot.controller';
import {FriendlyBotService} from './friendly-bot.service';
import {APP_INTERCEPTOR} from '@nestjs/core';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([PayoutEntity]), RateLimiterModule],
  controllers: [FriendlyBotController],
  providers: [
    FriendlyBotService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimiterInterceptor
    }
  ],
  exports: [],
})
export class FriendlyBotModule {}
