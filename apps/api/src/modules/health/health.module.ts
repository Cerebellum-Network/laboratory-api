import {ValidatorEntity} from './entities/validator.entity';
import {TypeOrmModule} from '@nestjs/typeorm';
import {HealthService} from './health.service';
import {HealthController} from './health.controller';
import {Module} from '@nestjs/common';
import {ConfigModule} from '../../../../../libs/config/src/config.module'
import {CereNetwork} from './cere.network';
import {PolygonNetwork} from './polygon.network';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ValidatorEntity])],
  controllers: [HealthController],
  providers: [HealthService, CereNetwork, PolygonNetwork],
  exports: [],
})
export class HealthModule {}
