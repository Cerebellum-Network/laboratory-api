import {Controller, Get, Inject, Param, Query} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {BlockScannerService} from './block-scanner.service';
import {ApiGatewayTimeoutResponse, ApiInternalServerErrorResponse, ApiTags} from '@nestjs/swagger';
import {TransactionsDataDto} from './dto/transactions-data.dto';
import {BlocksDataDto} from './dto/blocks-data.dto';
import {LatestBlockDto} from './dto/latest-block.dto';
import {BalanceDto} from './dto/balance.dto';
import {BlockStatusDto} from './dto/block-status.dto';

@Controller('block-scanner')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Block Scanner')
export class BlockScannerController {
  public constructor(
    @Inject(BlockScannerService) private readonly appService: BlockScannerServiceInterface,
    private readonly blockScannerService: BlockScannerService,
  ) {}

  @Get('account-blocks/:accountId')
  public accountBlocks(
    @Query('offset') offset: number,
    @Query('limit') limit: number,
    @Param('accountId') accountId: string,
  ): Promise<BlocksDataDto> {
    return this.blockScannerService.getAccountBlocks(accountId, offset, limit);
  }

  @Get('account-transactions/:accountId')
  public accountTransactions(
    @Query('offset') offset: number,
    @Query('limit') limit: number,
    @Param('accountId') accountId: string,
  ): Promise<TransactionsDataDto> {
    return this.blockScannerService.getTransactions(accountId, offset, limit);
  }

  @Get('latest-block')
  public latestBlock(): Promise<LatestBlockDto> {
    return this.blockScannerService.getLatestBlock();
  }

  @Get('balance/:address')
  public balance(@Param('address') address: string): Promise<BalanceDto> {
    return this.blockScannerService.getBalance(address);
  }

  @Get('health-check')
  public healthCheck(): Promise<any> {
    return this.blockScannerService.healthCheck();
  }

  @Get('block-status')
  public blockStatus(): Promise<BlockStatusDto> {
    return this.blockScannerService.blockStatus();
  }
}
