import {BalanceOptions} from "./balance-options.type";

export type Wallet = {
    address: string;
    name: string;
    minBalance: number;
    options?: BalanceOptions;
};
