import {Module} from '@nestjs/common';
import {DatabaseModule} from '../../../libs/database/src'
import {ConfigModule} from '../../../libs/config/src';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';
@Module({
  imports: [BlockScannerModule, ConfigModule, DatabaseModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
