import {BalanceType} from "./balance-type.enum";

export type BalanceOptions = {
  type: BalanceType;
  biconomyDappGasTankProxyAddress?: string;
  biconomyFundingKey?: string;
};
