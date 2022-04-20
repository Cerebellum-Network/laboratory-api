import {Balance} from '@polkadot/types/interfaces';

export class BalanceDto {
  public constructor(
    public readonly balance: Balance,

    public readonly decimal: number[],
  ) {}
}
