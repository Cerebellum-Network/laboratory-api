import {BlockDto} from './dto/block.dto';

export interface BlockScannerServiceInterface {
  startScanning();
  getAccountTransactions(accountId: string): Promise<BlockDto[]>;
}
