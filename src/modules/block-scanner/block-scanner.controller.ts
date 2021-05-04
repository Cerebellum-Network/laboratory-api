import {BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, UnauthorizedException, Headers} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {BlockScannerService} from './block-scanner.service';
import {ApiGatewayTimeoutResponse, ApiInternalServerErrorResponse, ApiTags} from '@nestjs/swagger';
import {TransactionsDataDto} from './dto/transactions-data.dto';
import {BlocksDataDto} from './dto/blocks-data.dto';
import {LatestBlockDto} from './dto/latest-block.dto';
import {BalanceDto} from './dto/balance.dto';
import {PostRestartRequestDto} from './dto/restart.dto';
import {ConfigService} from '../config/config.service';

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

  @Get('account-blocks/:accountId/:network')
  public accountBlocks(
    @Query('offset') offset: number,
    @Query('limit') limit: number,
    @Param('accountId') accountId: string,
    @Param('network') network: string,
  ): Promise<BlocksDataDto> {
    return this.blockScannerService.getAccountBlocks(accountId, offset, limit, network);
  }

  @Get('account-transactions/:accountId/:network')
  public accountTransactions(
    @Query('offset') offset: number,
    @Query('limit') limit: number,
    @Param('accountId') accountId: string,
    @Param('network') network: string,
  ): Promise<TransactionsDataDto> {
    return this.blockScannerService.getTransactions(accountId, offset, limit, network);
  }

  @Get('latest-block/:network')
  public latestBlock(@Param('network') network: string): Promise<LatestBlockDto> {
    return this.blockScannerService.getLatestBlock(network);
  }

  @Get('balance/:address/:network')
  public balance(@Param('address') address: string, @Param('network') network: string): Promise<BalanceDto> {
    return this.blockScannerService.getBalance(address, network);
  }

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
}
