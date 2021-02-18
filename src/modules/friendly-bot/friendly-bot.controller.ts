import {ApiInternalServerErrorResponse, ApiGatewayTimeoutResponse, ApiTags} from '@nestjs/swagger';
import {Controller, Inject, Post, Body} from '@nestjs/common';
import {FriendlyBotService} from './friendly-bot.service';
import {AssetDto} from './dto/assets.dto';
import {PostAssetRequestDto} from './dto/post-asset-request.dto';

@Controller('friend-bot')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Friendly Bot')
export class FriendlyBotController {
  public constructor(
    @Inject(FriendlyBotService)
    private readonly friendlyBotService: FriendlyBotService,
  ) {}

  @Post('/asset')
  public asset(@Body() postAssetRequest: PostAssetRequestDto): Promise<AssetDto> {
    return this.friendlyBotService.issueToken(postAssetRequest.destination);
  }
}
