import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('bots')
export class BlockEntity {
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

  @CreateDateColumn()
  public createdAt: Date;

  @Column({type: "inet"})
  public ip
}
