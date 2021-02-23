import {Controller, Get} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';

@ApiTags('Infrastructure')
@Controller()
export class HealthCheckController {
  @Get('health-check')
  public getName(): string {
    return 'OK';
  }
}
