import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn} from 'typeorm';

export enum NetworkEnum {
  TESTNET = 'TESTNET',
  TESTNET_DEV = 'TESTNETDEV',
  TESTNET_DEV1 = 'TESTNETDEV1',
}
@Entity('payouts')
export class PayoutEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public sender: string;

  @Column()
  public value: string;

  @Column()
  public txnHash: string;

  @Column()
  public destination: string;

  @Column({
    type: 'enum',
    enum: NetworkEnum,
  })
  public network: NetworkEnum;

  @CreateDateColumn()
  public createdAt: Date;

  @Column({type: 'inet', nullable: true})
  public ip;
}
