/* eslint-disable @typescript-eslint/ban-types */
export class TransactionDto {

  public transactionHash: string;

  public senderId: string;

  public signature: string;

  public transactionIndex: string;

  public success: string;

  public nonce: string;

  public events: object[];

  public args: string;

  public method: string;

  public timestamp: Date;
}
