import {BalanceType} from "./balance-type.enum";

export type BalanceOptions = {
  type: BalanceType;
  erc20TokenAddress: string;
};
