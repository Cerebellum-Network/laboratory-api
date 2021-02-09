import {Controller, Get, Inject} from '@nestjs/common';
import {BlockScannerServiceInterface} from './block-scanner.service.interface';
import {BlockScannerService} from './block-scanner.service';
import {ApiGatewayTimeoutResponse, ApiInternalServerErrorResponse, ApiOkResponse} from '@nestjs/swagger';
import {ServiceResponse} from '@cere/ms-core';

@Controller()
@ApiInternalServerErrorResponse({description: 'Internal server error.', type: ServiceResponse})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.', type: ServiceResponse})
export class BlockScannerController {
  public constructor(@Inject(BlockScannerService) private readonly appService: BlockScannerServiceInterface) {}

  @Get()
  @ApiOkResponse({description: 'Hello world!', type: ServiceResponse})
  public getHello(): string {
    return 'Hello world!';
  }
}
