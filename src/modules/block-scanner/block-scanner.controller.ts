import {Controller, Get, Inject, Param, Query} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {BlockScannerService} from './block-scanner.service';
import {ApiGatewayTimeoutResponse, ApiInternalServerErrorResponse, ApiTags} from '@nestjs/swagger';
import {ServiceResponse} from '@cere/ms-core';
import {BlockDto} from './dto/block.dto';
import {TransactionDto} from './dto/transaction.dto';

@Controller()
@ApiInternalServerErrorResponse({description: 'Internal server error.', type: ServiceResponse})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.', type: ServiceResponse})
@ApiTags('Block Scanner')
export class BlockScannerController {
  public constructor(
    @Inject(BlockScannerService) private readonly appService: BlockScannerServiceInterface,
    private readonly blockScannerService: BlockScannerService,
  ) {}

  @Get('account-blocks/:accountId')
  public accountBlocks(@Query('offset') offset: number, @Query('limit') limit: number, @Param('accountId') accountId: string): Promise<BlockDto[]> {
    return this.blockScannerService.getAccountTransactions(accountId, offset, limit);
  }

  @Get('account-transactions/:accountId')
  public accountTransactions(@Query('offset') offset: number, @Query('limit') limit: number, @Param('accountId') accountId: string): Promise<TransactionDto[]> {
    return this.blockScannerService.getTransactions(accountId, offset, limit);
  }
}
