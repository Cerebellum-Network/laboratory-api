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

@Module({
  imports: [BlockScannerModule, ConfigModule, BuildModule, CrashlyticModule, TracingModule.TracingModule, LoggerModule, DatabaseModule],
  controllers: [HealthCheckController],
  providers: [],
})
export class AppModule {}
