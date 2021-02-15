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

  @Column({nullable: true})
  public authorPublicKey: string;

  @Column()
  public destinationPublicKey: string;

  @Column()
  public timestamp: Date;
}
