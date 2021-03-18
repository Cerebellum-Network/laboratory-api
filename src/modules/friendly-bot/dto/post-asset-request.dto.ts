import {NetworkEnum} from "../entities/payout.entity";
import {IsNotEmpty} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';

export class PostAssetRequestDto {
  @IsNotEmpty()
  @ApiProperty()
  public destination: string;

  public network: NetworkEnum;
}
