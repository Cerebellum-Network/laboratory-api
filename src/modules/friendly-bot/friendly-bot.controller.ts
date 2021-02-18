import {ApiInternalServerErrorResponse, ApiGatewayTimeoutResponse, ApiTags} from '@nestjs/swagger';
import {Controller, Inject, Post, Body, Logger} from '@nestjs/common';
import {ServiceResponse, ServiceResponseConfig} from '@cere/ms-core';
import {FriendlyBotService} from './friendly-bot.service';
import {AssetDto} from './dto/assets.dto';

@Controller('friend-bot')
@ApiInternalServerErrorResponse({description: 'Internal server error.', type: ServiceResponse})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.', type: ServiceResponse})
@ApiTags('Friendly Bot')
export class FriendlyBotController {
  private readonly logger: Logger = new Logger(FriendlyBotController.name);

  public constructor(
    @Inject(FriendlyBotService)
    private readonly friendlyBotService: FriendlyBotService,
  ) {}

  @Post('/asset')
  public async asset(@Body('destination') destination: string): Promise<ServiceResponse<AssetDto>> {
    try {
      const result = await this.friendlyBotService.issueToken(destination);
      return ServiceResponseConfig.SUCCESS(result);
    } catch (error) {
      this.logger.error('Some error occurred during issuing token ', error.stack);
      this.logger.error(error.stack);
      return ServiceResponseConfig.ERROR({message: error.stack});
    }
  }
}
