import {Module} from '@nestjs/common';
import {DatabaseModule} from '../../../libs/database/src'
import {ConfigModule} from '../../../libs/config/src';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';
import {HealthCheckController} from '../../../libs/health/src';
import {ScheduleModule} from '@nestjs/schedule';

@Module({
  imports: [BlockScannerModule, ConfigModule, DatabaseModule, ScheduleModule.forRoot()],
  controllers: [HealthCheckController],
  providers: [],
})
export class AppModule {}
