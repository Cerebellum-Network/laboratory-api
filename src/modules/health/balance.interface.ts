export interface AccountData {
  address: string;
  name: string;
  minBalance: number;
}

export interface IBalanceService {
  checkMinBalance(network: string): Promise<any>;
  checkMinBalanceOfAccount(network: string, accountName: string): Promise<any>;
}
