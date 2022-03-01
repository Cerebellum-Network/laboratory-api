import {Module} from '@nestjs/common';
import {DatabaseModule} from '../../../libs/database/src'
import {ConfigModule} from '../../../libs/config/src';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';
import {HealthCheckController} from '../../../libs/health/src'
@Module({
  imports: [BlockScannerModule, ConfigModule, DatabaseModule],
  controllers: [HealthCheckController],
  providers: [],
})
export class AppModule {}
