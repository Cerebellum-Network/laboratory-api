import {HealthService} from './health.service';
import {HealthController} from './health.controller';
import {Module} from '@nestjs/common';
import {ConfigModule} from '../config/config.module';
@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [],
})
export class HealthModule {}
