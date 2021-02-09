import {Module} from '@nestjs/common';
import {BlockScannerController} from './block-scanner.controller';
import {BlockScannerService} from './block-scanner.service';
import {ConfigModule} from '@cere/ms-core';

@Module({
  imports: [ConfigModule],
  controllers: [BlockScannerController],
  providers: [BlockScannerService],
  exports: [],
})
export class BlockScannerModule {}
