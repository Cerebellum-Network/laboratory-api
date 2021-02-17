export interface FriendlyBotServiceInterface{
  issueToken(destination: string): Promise<any>;
}