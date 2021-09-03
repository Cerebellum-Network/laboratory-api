import Web3 from 'web3';
import {ApiPromise} from "@polkadot/api";
import {BlockStatusDto} from './dto/block-status.dto';

export const BLOCKCHAIN_INTERFACE = 'BLOCKCHAIN_INTERFACE';

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
  getNetwork(network: string);
  getWallet(network: string, wallet: string);
  getWallets(network: string);
  healthCheck?(network: string): Promise<any>;
  blockStatus?(network: string): Promise<BlockStatusDto>;
  finalization?(network: string): Promise<boolean>;
  blockProduction?(network: string): Promise<boolean>;
  validatorSlashed?(): Promise<void>;
  nodeDropped?(network: string): Promise<any>;
  nodeDroppedStatus?(network: string): Promise<any>;
}