import Web3 from 'web3';
import {ApiPromise} from "@polkadot/api";

export type Wallet =  {
  address: string;
  name: string;
  minBalance: number;
}

export type network = Map<string, { api: Web3 | ApiPromise }>
export type account = Map<string, { account: [Wallet] }>

export interface IBlockchain {
  getBalance(wallet: string, api: ApiPromise | Web3): Promise<number>;
  hasNetwork(network: string): boolean;
  hasWallet(wallet: string): boolean;
  getNetwork(network: string);
  getWallet(network: string, wallet: string);
  getWallets(network: string);
}