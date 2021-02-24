import {TransactionDto} from './transaction.dto';

export class TransactionsDataDto {
  public constructor(
    public readonly data: TransactionDto[],
    public readonly count: number,
    public readonly balance: string,
    public readonly block: number
  ) {}
}
