import {BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, UnauthorizedException, Headers} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {BlockScannerService} from './block-scanner.service';
import {ApiGatewayTimeoutResponse, ApiInternalServerErrorResponse, ApiTags} from '@nestjs/swagger';
import {PostRestartRequestDto} from './dto/restart.dto';
import {ConfigService} from '../../../../../libs/config/src';

@Controller('block-scanner')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Block Scanner')
export class BlockScannerController {
  public constructor(
    @Inject(BlockScannerService) private readonly appService: BlockScannerServiceInterface,
    private readonly blockScannerService: BlockScannerService,
    private readonly configService: ConfigService,
  ) {}

  @Post('restart')
  public async restart(@Headers() headers, @Body() postRestartRequestDto: PostRestartRequestDto): Promise<any>{
    const systemAccessKey = await this.configService.get('ACCESS_KEY_FOR_RESTART');

    if (systemAccessKey !== headers['x-api-key']) {
      throw new UnauthorizedException();
    }

    const isNetwork = this.blockScannerService.networkMap.has(postRestartRequestDto.network);
    if (!isNetwork) {
      throw new BadRequestException(`Invalid network type.`);
    }

    const result = await this.blockScannerService.restart(postRestartRequestDto.network);
    return 'Restarted Successfully';
  }

  @Get('have-duplicates/:network')
  public haveDuplicates(@Query('startTime') startTime: string, @Param('network') network: string): Promise<any>{
    const networkSupported = this.blockScannerService.networkMap.has(network);
    if (!networkSupported) {
      throw new BadRequestException(`Invalid network type.`);
    }

   return this.blockScannerService.haveDuplicates(startTime, network);
  }
}
