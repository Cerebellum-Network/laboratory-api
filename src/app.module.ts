import {Module} from '@nestjs/common';
import {BlockScannerService} from './modules/block-scanner/block-scanner.service';
import {
  BuildModule,
  ConfigModule,
  CrashlyticModule,
  HealthCheckController,
  LoggerModule,
  TracingModule,
} from '@cere/ms-core';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';

@Module({
  imports: [BlockScannerModule, ConfigModule, BuildModule, CrashlyticModule, TracingModule.TracingModule, LoggerModule],
  controllers: [HealthCheckController],
  providers: [BlockScannerService],
})
export class AppModule {}
