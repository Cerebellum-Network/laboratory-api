import {AssetDto} from './dto/assets.dto';

export interface FriendlyBotServiceInterface {
  issueToken(destination: string): Promise<AssetDto>;
}
