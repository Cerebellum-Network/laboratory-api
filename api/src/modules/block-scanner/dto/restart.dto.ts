import {IsNotEmpty} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';

export class PostRestartRequestDto {
  @IsNotEmpty()
  @ApiProperty()
  public network: string;
}
