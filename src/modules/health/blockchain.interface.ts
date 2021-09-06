import {BlockStatusDto} from './dto/block-status.dto';

export type Wallet = {
  address: string;
  name: string;
  minBalance: number;
};

export interface IBlockchain {
  getBalance(wallet: string, network: string): Promise<number>;
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
