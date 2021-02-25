import {ApiInternalServerErrorResponse, ApiGatewayTimeoutResponse, ApiTags} from '@nestjs/swagger';
import {Controller, Inject, Post, Body, UseInterceptors, Request, Logger} from '@nestjs/common';
import {RateLimit} from 'nestjs-rate-limiter';
import {ConfigService} from '../config/config.service';
import {FriendlyBotService} from './friendly-bot.service';
import {AssetDto} from './dto/assets.dto';
import {PostAssetRequestDto} from './dto/post-asset-request.dto';

@Controller('friend-bot')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Friendly Bot')
export class FriendlyBotController {
  private requestPerDay = Number(this.configService.get('REQUEST_PER_IP_PER_DAY'));

  private logger = new Logger(FriendlyBotController.name);

  public constructor(
    @Inject(FriendlyBotService)
    private readonly friendlyBotService: FriendlyBotService,
    private readonly configService: ConfigService,
  ) {}

  @RateLimit({
    keyPrefix: 'request-assets',
    points: 3, // TODO: Get this parameter from config
    duration: 86400,
    customResponseSchema: () => {
      return {message: `Test tokens can't be requested more than 3 times in a day`};
    },
  })
  @Post('/request-assets')
  public asset(@Body() postAssetRequest: PostAssetRequestDto, @Request() request): Promise<AssetDto> {
    this.logger.debug(`IP of the client: ${request.ip}`);

    return this.friendlyBotService.issueToken(postAssetRequest.destination);
  }
}
