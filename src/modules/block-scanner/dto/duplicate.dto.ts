import {IsNotEmpty} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';

export class DuplicateRequestDto {
  @IsNotEmpty()
  @ApiProperty()
  public network: string;

  @IsNotEmpty()
  @ApiProperty()
  public startTime: string;
}
