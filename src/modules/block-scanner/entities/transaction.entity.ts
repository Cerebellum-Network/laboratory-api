/* eslint-disable @typescript-eslint/ban-types */
import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('transaction')
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({nullable: true})
  public blockNumber: string;

  @Column({nullable: true})
  public transactionHash: string;

  @Column({nullable: true})
  public senderId: string;

  @Column({nullable: true})
  public signature: string;

  @Column({nullable: true})
  public transactionIndex: string;

  @Column({nullable: true})
  public success: string;

  @Column({nullable: true})
  public nonce: string;

  @Column({nullable: true})
  public args: string;

  @Column('jsonb', {nullable: true})
  public events: object[];

}
