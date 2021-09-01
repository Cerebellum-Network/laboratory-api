import {BadRequestException, Controller, Get, HttpStatus, Inject, Param, Res} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiGatewayTimeoutResponse,
  ApiTags,
  ApiResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import {HealthService} from './health.service';
import {BlockStatusDto} from './dto/block-status.dto';
import {Response} from 'express';
import {PolygonService} from './polygon.service';

@Controller('health')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Health')
export class HealthController {
  public constructor(
    @Inject(HealthService)
    private readonly healthService: HealthService,
    @Inject(PolygonService)
    private readonly polygonService: PolygonService,
  ) {}

  @ApiResponse({status: 200, description: 'System health fetched successfully.'})
  @Get('health-check/:network')
  public healthCheck(@Param('network') network: string): Promise<any> {
    if (!this.healthService.hasNetwork(network)) {
      throw new BadRequestException(`Invalid network type.`);
    }
    return this.healthService.healthCheck(network);
  }

  @ApiResponse({status: 200, description: 'Block status info fetched successfully.'})
  @Get('block-status/:network')
  public blockStatus(@Param('network') network: string): Promise<BlockStatusDto> {
    if (!this.healthService.hasNetwork(network)) {
      throw new BadRequestException(`Invalid network type.`);
    }
    return this.healthService.blockStatus(network);
  }

  @Get('finalization/:network')
  @ApiResponse({status: 204, description: 'Finalization is healthy.'})
  @ApiNotFoundResponse({description: 'Finalization is unhealthy.'})
  public async finalization(@Param('network') network: string, @Res() res: Response): Promise<any> {
    if (!this.healthService.hasNetwork(network)) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const diff = await this.healthService.finalization(network);
    if (diff) {
      res.status(HttpStatus.NOT_FOUND).send();
    } else {
      res.status(HttpStatus.NO_CONTENT).send();
    }
  }

  @Get('block-production/:network')
  @ApiResponse({status: 204, description: 'Block production is healthy.'})
  @ApiNotFoundResponse({description: 'Block production is unhealthy.'})
  public async blockProduction(@Param('network') network: string, @Res() res: Response): Promise<any> {
    if (!this.healthService.hasNetwork(network)) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const diff = await this.healthService.blockProduction(network);
    if (diff) {
      res.status(HttpStatus.NO_CONTENT).send();
    } else {
      res.status(HttpStatus.NOT_FOUND).send();
    }
  }

  @Get('node-dropped/:network')
  @ApiResponse({status: 204, description: 'Validator node is healthy.'})
  @ApiNotFoundResponse({description: 'Validator node is unhealthy.'})
  public async nodeDropped(@Param('network') network: string, @Res() res: Response): Promise<any> {
    if (!this.healthService.hasNetwork(network)) {
      throw new BadRequestException(`Invalid network type.`);
    }
    const result = await this.healthService.nodeDropped(network);
    if (result) {
      res.status(HttpStatus.NO_CONTENT).send();
    } else {
      res.status(HttpStatus.NOT_FOUND).send();
    }
  }

  @Get('node-dropped-status/:network')
  @ApiNotFoundResponse({description: 'Validator node is unhealthy.'})
  public nodeDroppedStatus(@Param('network') network: string): Promise<any> {
    if (!this.healthService.hasNetwork(network)) {
      throw new BadRequestException(`Invalid network type.`);
    }
    return this.healthService.nodeDroppedStatus(network);
  }

  @Get('balances/:blockchain/:network')
  public async checkMinBalance(
    @Param('network') network: string,
    @Param('blockchain') blockchain: string,
    @Res() res: Response,
  ): Promise<any> {
    if (blockchain === 'cere') {
      if (!this.healthService.hasAccount(network)) {
        throw new BadRequestException(`Invalid network type.`);
      }
      const {status, result} = await this.healthService.checkMinBalance(network);
      if (status) {
        res.status(HttpStatus.NO_CONTENT).send();
      } else {
        res.status(HttpStatus.NOT_FOUND).send(result);
      }
    } else if (blockchain === 'polygon') {
      if (!this.polygonService.hasAccount(network)) {
        throw new BadRequestException(`Invalid network type.`);
      }
      const {status, result} = await this.polygonService.checkMinBalance(network);
      if (status) {
        res.status(HttpStatus.NO_CONTENT).send();
      } else {
        res.status(HttpStatus.NOT_FOUND).send(result);
      }
    } else {
      throw new BadRequestException(`Invalid Blockchain.`);
    }
  }

  @Get('balances/:blockchain/:network/:accountName')
  public async checkMinBalanceForAccount(
    @Param('blockchain') blockchain: string,
    @Param('network') network: string,
    @Param('accountName') accountName: string,
    @Res() res: Response,
  ): Promise<any> {
    if (blockchain === 'cere') {
      if (!this.healthService.hasAccount(network)) {
        throw new BadRequestException(`Invalid network type.`);
      }
      const {account} = this.healthService.getAccount(network);
      const found = account.find((element) => element.name === accountName);
      if (!found) {
        throw new BadRequestException(`Invalid account name.`);
      }
      const {status, result} = await this.healthService.checkMinBalanceOfAccount(network, accountName);
      if (status) {
        res.status(HttpStatus.NO_CONTENT).send();
      } else {
        res.status(HttpStatus.NOT_FOUND).send(result);
      }
    } else if (blockchain === 'polygon') {
      if (!this.polygonService.hasAccount(network)) {
        throw new BadRequestException(`Invalid network type.`);
      }
      const {account} = this.polygonService.getAccount(network);
      const found = account.find((element) => element.name === accountName);
      if (!found) {
        throw new BadRequestException(`Invalid account name.`);
      }
      const {status, result} = await this.polygonService.checkMinBalanceOfAccount(network, accountName);
      if (status) {
        res.status(HttpStatus.NO_CONTENT).send();
      } else {
        res.status(HttpStatus.NOT_FOUND).send(result);
      }
    }
  }
}
