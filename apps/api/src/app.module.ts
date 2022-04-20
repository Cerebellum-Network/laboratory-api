import {HealthModule} from './modules/health/health.module';
import {Module} from '@nestjs/common';
import {DatabaseModule} from '../../../libs/database/src';
import {ConfigModule} from '../../../libs/config/src';
import {HealthCheckController} from '../../../libs/health/src';
import {FriendlyBotModule} from './modules/friendly-bot/friendly-bot.module';
import {PeerModule} from './modules/peers/peer.module';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';

@Module({
  imports: [FriendlyBotModule, PeerModule, ConfigModule, DatabaseModule, HealthModule, BlockScannerModule],
  controllers: [HealthCheckController],
  providers: [],
})
export class AppModule {}
