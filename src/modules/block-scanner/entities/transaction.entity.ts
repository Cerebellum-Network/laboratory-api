/* eslint-disable @typescript-eslint/ban-types */
import {Column, Entity, PrimaryGeneratedColumn, ManyToOne} from 'typeorm';
import {BlockEntity} from "./block.entity";

;
@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  public id: number;

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
  public method: string;

  @Column('jsonb', {nullable: true})
  public events: object[];

  @Column({nullable: true})
  public args: string;

  @Column()
  public timestamp: Date;

  @Column({nullable: true})
  public networkType: string;
  
  @ManyToOne(() => BlockEntity, blocks => blocks.blockNumber)
  public block: BlockEntity;
}
