import {RateLimiterModule} from 'nestjs-rate-limiter';
import {Module} from '@nestjs/common';
import {ConfigModule} from '../config/config.module';
import {TypeOrmModule} from '@nestjs/typeorm';
import {PayoutEntity} from './entities/payout.entity';
import {FriendlyBotController} from './friendly-bot.controller';
import {FriendlyBotService} from './friendly-bot.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([PayoutEntity]), RateLimiterModule],
  controllers: [FriendlyBotController],
  providers: [
    FriendlyBotService,
  ],
  exports: [],
})
export class FriendlyBotModule {}
