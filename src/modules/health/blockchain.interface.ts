import {BlockStatusDto} from './dto/block-status.dto';
import {Wallet} from "./wallet.type";

export interface IBlockchain {
  getBalance(wallet: Wallet, network: string): Promise<number>;
  hasNetwork(network: string): boolean;
  getNetwork(network: string);
  getWallet(network: string, walletName: string);
  getWallets(network: string);
  checkHealth?(network: string): Promise<any>;
  getBlockStatus?(network: string): Promise<BlockStatusDto>;
  getNodeFinalizationStatus?(network: string): Promise<boolean>;
  checkBlockProductionTime?(network: string): Promise<boolean>;
  getDroppedNode?(network: string): Promise<any>;
  getDroppedNodeStatus?(network: string): Promise<any>;
}
