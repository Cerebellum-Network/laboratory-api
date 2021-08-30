import {BadRequestException, Controller, Get, Inject, Param, Res, HttpStatus} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiGatewayTimeoutResponse,
  ApiTags,
} from '@nestjs/swagger';
import {PolygonService} from './polygon.service';
import {Response} from 'express';

@Controller('polygon')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Polygon')
export class PolygonController {
  public constructor(
    @Inject(PolygonService)
    private readonly polygonService: PolygonService
  ) { }

  @Get('balance/:network/:address')
  public fetchBalance(@Param('address') address: string, @Param('network') network: string): Promise<any>{
    return this.polygonService.fetchBalance(network, address);
  }

  @Get('balances/:network')
  public async checkMinBalance(@Param('network') network: string, @Res() res: Response): Promise<any>{
    if (!this.polygonService.accounts.has(network)) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const {status, result} = await this.polygonService.checkMinBalance(network);
    if (status) {
      res.status(HttpStatus.NO_CONTENT).send();
    } else {
      res.status(HttpStatus.NOT_FOUND).send(result);
    }
  }

  @Get('balances/:network/:name')
  public async checkMinBalanceForAccount(@Param('network') network: string, @Param('name') name: string, @Res() res: Response): Promise<any> {
    if (!this.polygonService.accounts.has(network)) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const {account} = this.polygonService.accounts.get(network);
    const found = account.find((element) => element.name === name);
    if (!found) {
      throw new BadRequestException(`Invalid account name.`);
    }
    const {status, result} = await this.polygonService.checkMinBalanceOfAccount(network, name);
    if (status) {
      res.status(HttpStatus.NO_CONTENT).send();
    } else {
      res.status(HttpStatus.NOT_FOUND).send(result);
    }
  }
}
