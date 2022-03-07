import {Controller, Get, Param, Query} from '@nestjs/common';
import {BlockScannerService} from './block-scanner.service';
import {ApiGatewayTimeoutResponse, ApiInternalServerErrorResponse, ApiTags} from '@nestjs/swagger';
import {TransactionsDataDto} from './dto/transactions-data.dto';
import {BlocksDataDto} from './dto/blocks-data.dto';
import {BalanceDto} from './dto/balance.dto';

@Controller('block-scanner')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Block Scanner')
export class BlockScannerController {
  public constructor(private readonly blockScannerService: BlockScannerService) {}

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

  @Get('balance/:address/:network')
  public balance(@Param('address') address: string, @Param('network') network: string): Promise<BalanceDto> {
    return this.blockScannerService.getBalance(address, network);
  }
}
