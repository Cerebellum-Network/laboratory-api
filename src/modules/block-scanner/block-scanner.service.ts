import {Injectable, Logger} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';

@Injectable()
export class BlockScannerService implements BlockScannerServiceInterface {
  public logger = new Logger(BlockScannerService.name);

  public startScanning(): void {
    this.logger.debug('About to scan the network');
  }
}
