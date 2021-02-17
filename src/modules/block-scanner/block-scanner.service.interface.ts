export interface BlockScannerServiceInterface {
  startScanning();
  getAccountTransactions(accountId: string, offset: number, limit:number): Promise<any>;
}
