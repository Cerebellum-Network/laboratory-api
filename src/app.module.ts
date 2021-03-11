import {HealthModule} from './modules/health/health.module';
import {Module} from '@nestjs/common';
import {DatabaseModule} from './modules/database/database.module';
import {ConfigModule} from './modules/config/config.module';
import {HealthCheckController} from './controllers/health-check.controller';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';
import {FriendlyBotModule} from './modules/friendly-bot/friendly-bot.module';
import {PeerModule} from './modules/peers/peer.module';

@Module({
<<<<<<< HEAD
  imports: [BlockScannerModule, FriendlyBotModule, PeerModule, ConfigModule, DatabaseModule],
=======
  imports: [BlockScannerModule, FriendlyBotModule, ConfigModule, DatabaseModule, HealthModule],
>>>>>>> dev
  controllers: [HealthCheckController],
  providers: [],
})
export class AppModule {}
