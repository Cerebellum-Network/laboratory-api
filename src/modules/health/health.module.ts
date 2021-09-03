import {PolygonNetwork} from './polygon.network';
import {BLOCKCHAIN_INTERFACE} from './blockchain.interface';
import {ValidatorEntity} from './entities/validator.entity';
import {TypeOrmModule} from '@nestjs/typeorm';
import {HealthService} from './health.service';
import {HealthController} from './health.controller';
import {Module} from '@nestjs/common';
import {ConfigModule} from '../config/config.module';
import {CereNetwork} from './cere.network';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ValidatorEntity])],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: BLOCKCHAIN_INTERFACE,
      useClass: CereNetwork,
    },
    // {
    //   provide: BLOCKCHAIN_INTERFACE,
    //   useClass: PolygonNetwork,
    // },
  ],
  exports: [],
})
export class HealthModule {}
