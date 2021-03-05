import {Controller, Get, HttpStatus, Inject, Logger, Res} from '@nestjs/common';
import {ApiInternalServerErrorResponse, ApiGatewayTimeoutResponse, ApiTags} from '@nestjs/swagger';
import {HealthService} from './health.service';
import {ConfigService} from '../config/config.service';
import {BlockStatusDto} from './dto/block-status.dto';
import {Response} from 'express';

@Controller('health')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Friendly Bot')
export class HealthController {
  private logger = new Logger(HealthController.name);

  public constructor(
    @Inject(HealthService)
    private readonly healthService: HealthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('health-check')
  public healthCheck(): Promise<any> {
    return this.healthService.healthCheck();
  }

  @Get('block-status')
  public blockStatus(): Promise<BlockStatusDto> {
    return this.healthService.blockStatus();
  }

  @Get('finalization')
  public async finalization(@Res() res: Response): Promise<any>{
    const diff = await this.healthService.finalization();
    if (diff) {
     res.status(HttpStatus.NOT_FOUND).send();
    }
     res.status(HttpStatus.NO_CONTENT).send();
  }
}
