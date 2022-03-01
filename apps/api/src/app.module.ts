import {ScheduleModule} from '@nestjs/schedule';
import {HealthModule} from './modules/health/health.module';
import {Module} from '@nestjs/common';
import {DatabaseModule} from '../../../libs/database/src'
import {ConfigModule} from '../../../libs/config/src';
import {HealthCheckController} from '../../../libs/health/src'
import {FriendlyBotModule} from './modules/friendly-bot/friendly-bot.module';
import {PeerModule} from './modules/peers/peer.module';
@Module({
  imports: [FriendlyBotModule, PeerModule, ConfigModule, DatabaseModule, HealthModule, ScheduleModule.forRoot()],
  controllers: [HealthCheckController],
  providers: [],
})
export class AppModule {}
