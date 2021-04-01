import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('validators')
export class ValidatorEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({nullable: true})
  public era: string;

  @Column('simple-array')
  public validator: string[];

  @Column({nullable: true})
  public status: string;

  @CreateDateColumn({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)'})
  public createdAt: Date;
}
