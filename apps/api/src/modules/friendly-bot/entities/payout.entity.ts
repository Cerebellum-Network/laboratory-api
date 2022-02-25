import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn} from 'typeorm';
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

  @Column({nullable: true})
  public network: string;

  @CreateDateColumn()
  public createdAt: Date;

  @Column({type: 'inet', nullable: true})
  public ip;
}
