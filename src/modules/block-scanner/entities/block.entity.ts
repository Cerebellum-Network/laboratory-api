/* eslint-disable import/no-cycle */
import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('blocks')
export class BlockEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public blockNumber: string;

  @Column()
  public blockHash: string;

  @Column()
  public parentHash: string;

  @Column()
  public stateRoot: string;

  @Column()
  public extrinsicRoot: string;

  @Column()
  public networkType: string;

  @Column({nullable: true})
  public authorPublicKey: string;

  @Column("timestamp without time zone")
  public timestamp: Date;

}
