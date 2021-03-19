import {AssetDto} from './dto/assets.dto';

export interface FriendlyBotServiceInterface {
  issueToken(destination: string, network:string): Promise<AssetDto>;
}
