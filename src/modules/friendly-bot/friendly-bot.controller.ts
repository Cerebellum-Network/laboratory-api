import {ApiInternalServerErrorResponse, ApiGatewayTimeoutResponse, ApiTags} from '@nestjs/swagger';
import {Controller, Request, Inject, Post} from '@nestjs/common';
import {ServiceResponse} from '@cere/ms-core';
import {FriendlyBotService} from './friendly-bot.service';

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
  public asset(@Request() request): any {
    return 'Hello World';
  }
}
