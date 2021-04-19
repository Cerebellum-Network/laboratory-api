/* eslint-disable import/no-cycle */
import {Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity('blocks')
export class BlockEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Index()
  @Column({default: null})
  public blockNumber: number;

  @Column()
  public blockHash: string;

  @Column()
  public parentHash: string;

  @Column()
  public stateRoot: string;

  @Column()
  public extrinsicRoot: string;

  @Column({nullable: true})
  @Index()
  public networkType: string;

  @Column({nullable: true})
  public authorPublicKey: string;

  @Column('timestamp without time zone')
  public timestamp: Date;

}
