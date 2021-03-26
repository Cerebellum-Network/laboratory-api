import {ValidatorEntity} from './entities/validator.entity';
import {TypeOrmModule} from '@nestjs/typeorm';
import {HealthService} from './health.service';
import {HealthController} from './health.controller';
import {Module} from '@nestjs/common';
import {ConfigModule} from '../config/config.module';
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ValidatorEntity])],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [],
})
export class HealthModule {}
