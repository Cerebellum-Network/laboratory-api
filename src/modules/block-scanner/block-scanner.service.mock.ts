import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {Logger} from '@nestjs/common';

export class BlockScannerService implements BlockScannerServiceInterface {
  public logger = new Logger(BlockScannerService.name);

  public startScanning(): void {
    this.logger.debug('startScanning');
  }
}
