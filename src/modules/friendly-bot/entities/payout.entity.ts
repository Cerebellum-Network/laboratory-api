import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn} from 'typeorm';

export enum NetworkEnum {
  TESTNET = '0',
  DEV = '1',
  DEV1 = '2',
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
    enum: NetworkEnum
  })
  public network: NetworkEnum;

  @CreateDateColumn()
  public createdAt: Date;

  @Column({type: 'inet', nullable: true})
  public ip
}
