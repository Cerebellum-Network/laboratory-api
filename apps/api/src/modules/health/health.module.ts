import {TypeOrmModule} from '@nestjs/typeorm';
import {HealthService} from './health.service';
import {HealthController} from './health.controller';
import {Module} from '@nestjs/common';
import {ConfigModule} from '../../../../../libs/config/src/config.module'
import {CereNetwork} from './cere.network';
import {PolygonNetwork} from './polygon.network';
import {ValidatorEntity} from '../../../../../libs/health/src/entities/validator.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ValidatorEntity])],
  controllers: [HealthController],
  providers: [HealthService, CereNetwork, PolygonNetwork],
  exports: [],
})
export class HealthModule {}
