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
// import {PolygonService} from './polygon.service';

@Controller('health')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Health')
export class HealthController {
  public constructor(
    @Inject(HealthService)
    private readonly healthService: HealthService
  ) {}

  @ApiResponse({status: 200, description: 'System health fetched successfully.'})
  @Get('health-check/:network')
  public async healthCheck(@Param('network') network: string): Promise<any> {
    try {
      const health = await this.healthService.healthCheck(network);
      return health;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiResponse({status: 200, description: 'Block status info fetched successfully.'})
  @Get('block-status/:network')
  public async blockStatus(@Param('network') network: string): Promise<BlockStatusDto> {
    try {
      const health = await this.healthService.blockStatus(network);
      return health
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    
  }

  @Get('finalization/:network')
  @ApiResponse({status: 204, description: 'Finalization is healthy.'})
  @ApiNotFoundResponse({description: 'Finalization is unhealthy.'})
  public async finalization(@Param('network') network: string, @Res() res: Response): Promise<any> {
    try {
      const diff = await this.healthService.finalization(network);
    if (diff) {
      res.status(HttpStatus.NOT_FOUND).send();
    } else {
      res.status(HttpStatus.NO_CONTENT).send();
    }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    
  }

  @Get('block-production/:network')
  @ApiResponse({status: 204, description: 'Block production is healthy.'})
  @ApiNotFoundResponse({description: 'Block production is unhealthy.'})
  public async blockProduction(@Param('network') network: string, @Res() res: Response): Promise<any> {
   try {
    const diff = await this.healthService.blockProduction(network);
    if (diff) {
      res.status(HttpStatus.NO_CONTENT).send();
    } else {
      res.status(HttpStatus.NOT_FOUND).send();
    }
   } catch (error) {
    throw new BadRequestException(error.message);
   }
   
  }

  @Get('node-dropped/:network')
  @ApiResponse({status: 204, description: 'Validator node is healthy.'})
  @ApiNotFoundResponse({description: 'Validator node is unhealthy.'})
  public async nodeDropped(@Param('network') network: string, @Res() res: Response): Promise<any> {
    try {
      const result = await this.healthService.nodeDropped(network);
    if (result) {
      res.status(HttpStatus.NO_CONTENT).send();
    } else {
      res.status(HttpStatus.NOT_FOUND).send();
    }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    
  }

  @Get('node-dropped-status/:network')
  @ApiNotFoundResponse({description: 'Validator node is unhealthy.'})
  public async nodeDroppedStatus(@Param('network') network: string): Promise<any> {
    try {
      const result = await this.healthService.nodeDroppedStatus(network);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    
  }

  @Get('balances/:blockchain/:network')
  public async checkMinBalance(
    @Param('network') network: string,
    @Param('blockchain') blockchain: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const {status, result} = await this.healthService.checkMinBalance(blockchain, network);
      if (status) {
        res.status(HttpStatus.NO_CONTENT).send();
      } else {
        res.status(HttpStatus.NOT_FOUND).send(result);
      }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('balances/:blockchain/:network/:wallet')
  public async checkMinBalanceForAccount(
    @Param('blockchain') blockchain: string,
    @Param('network') network: string,
    @Param('wallet') wallet: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const {status, result} = await this.healthService.checkMinBalanceOfWallet(blockchain, network, wallet);
      if (status) {
        res.status(HttpStatus.NO_CONTENT).send();
      } else {
        res.status(HttpStatus.NOT_FOUND).send(result);
      }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
   
  }
}
