import {Module} from '@nestjs/common';
import {
  BuildModule,
  ConfigModule,
  CrashlyticModule,
  HealthCheckController,
  LoggerModule,
  TracingModule,
  DatabaseModule,
} from '@cere/ms-core';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';
import {FriendlyBotModule} from './modules/friendly-bot/friendly-bot.module';
@Module({
  imports: [BlockScannerModule, FriendlyBotModule, ConfigModule, BuildModule, CrashlyticModule, TracingModule.TracingModule, LoggerModule, DatabaseModule],
  controllers: [HealthCheckController],
  providers: [],
})
export class AppModule {}
