/* eslint-disable import/no-cycle */
import {Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity('blocks')
export class BlockEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Index()
  @Column({nullable: true})
  public blockNumber: number;

  @Column({nullable: true})
  public blockHash: string;

  @Column({nullable: true})
  public parentHash: string;

  @Column({nullable: true})
  public stateRoot: string;

  @Column({nullable: true})
  public extrinsicRoot: string;

  @Column({nullable: true})
  @Index()
  public networkType: string;

  @Column({nullable: true})
  public authorPublicKey: string;

  @Column({type: 'timestamp without time zone', nullable: true})
  public timestamp: Date;

}
