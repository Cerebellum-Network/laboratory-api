import {Controller, Get, Inject, Param, Request} from '@nestjs/common';
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
  public accountBlocks(@Request() request): Promise<BlockDto[]> {
    return this.blockScannerService.getAccountTransactions(request.params.accountId, request.query.offset, request.query.limit);
  }

  @Get('account-transaction/:accountId')
  public accountTransactions(@Request() request): Promise<TransactionDto[]> {
    return this.blockScannerService.getTransaction(request.params.accountId, request.query.offset, request.query.limit);
  }
}
