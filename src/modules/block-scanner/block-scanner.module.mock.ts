import {Module} from '@nestjs/common';
import {BlockScannerController} from './block-scanner.controller';
import {BlockScannerService} from './block-scanner.service.mock';

@Module({
  imports: [],
  controllers: [BlockScannerController],
  providers: [BlockScannerService],
  exports: [],
})
export class BlockScannerModule {}
