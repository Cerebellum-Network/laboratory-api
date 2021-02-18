import {ApiInternalServerErrorResponse, ApiGatewayTimeoutResponse, ApiTags} from '@nestjs/swagger';
import {Controller, Inject, Post, Body, Res, HttpStatus} from '@nestjs/common';
import {ServiceResponse} from '@cere/ms-core';
import {FriendlyBotService} from './friendly-bot.service';
import {AssetDto} from './dto/assets.dto';
import {response} from 'express';

@Controller()
@ApiInternalServerErrorResponse({description: 'Internal server error.', type: ServiceResponse})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.', type: ServiceResponse})
@ApiTags('Friendly Bot')
export class FriendlyBotController {
  public constructor(
    @Inject(FriendlyBotService)
    private readonly friendlyBotService: FriendlyBotService,
  ) {}

  @Post('/asset')
  public async asset(@Body('destination') destination: string ): Promise<AssetDto> {
    const result = await this.friendlyBotService.issueToken(destination);
    return result;
  }
}
