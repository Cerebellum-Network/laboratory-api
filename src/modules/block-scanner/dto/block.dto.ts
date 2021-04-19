export class BlockDto {
  public id: number;

  public blockNumber: number;

  public blockHash: string;

  public parentHash: string;

  public stateRoot: string;

  public extrinsicRoot: string;

  public authorPublicKey: string;

  public timestamp: Date;
}
