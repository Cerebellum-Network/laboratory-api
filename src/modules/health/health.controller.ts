import {Controller, Get, HttpStatus, Inject, Res} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiGatewayTimeoutResponse,
  ApiTags,
  ApiResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import {HealthService} from './health.service';
import {ConfigService} from '../config/config.service';
import {BlockStatusDto} from './dto/block-status.dto';
import {Response} from 'express';

@Controller('health')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Health')
export class HealthController {
  public constructor(
    @Inject(HealthService)
    private readonly healthService: HealthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiResponse({status: 200, description: 'System health fetched successfully.'})
  @Get('health-check')
  public healthCheck(): Promise<any> {
    return this.healthService.healthCheck();
  }

  @ApiResponse({status: 200, description: 'Block status info fetched successfully.'})
  @Get('block-status')
  public blockStatus(): Promise<BlockStatusDto> {
    return this.healthService.blockStatus();
  }

  @Get('finalization')
  @ApiResponse({status: 204, description: 'Finalization is healthy.'})
  @ApiNotFoundResponse({description: 'Finalization is unhealthy.'})
  public async finalization(@Res() res: Response): Promise<any> {
    const diff = await this.healthService.finalization();
    if (diff) {
      res.status(HttpStatus.NOT_FOUND).send();
    }
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('block-production')
  @ApiResponse({status: 204, description: 'Block production is healthy.'})
  @ApiNotFoundResponse({description: 'Block production is unhealthy.'})
  public async blockProduction(@Res() res: Response): Promise<any> {
    const diff = await this.healthService.blockProduction();
    if (diff) {
      res.status(HttpStatus.NO_CONTENT).send();
    }
    res.status(HttpStatus.NOT_FOUND).send();
  }

  @Get('node-dropped')
  @ApiResponse({status: 204, description: 'Validator node is healthy.'})
  @ApiNotFoundResponse({description: 'Validator node is unhealthy.'})
  public async nodeDropped(@Res() res: Response): Promise<any> {
    const diff = await this.healthService.validatorNode();
    res.send(diff);
  }
}
