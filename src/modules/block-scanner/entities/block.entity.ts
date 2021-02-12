import {Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity('blocks')
export class BlockEntity{
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public blockNumber: string


  @Column()
  public blockHash: string

  @Column()
  public parentHash: string

  @Column()
  public stateRoot: string

  @Column()
  public ExtrinsicRoot: string

  @Column()
  public authodId: string

  @Column()
  public timeStamp: string

}