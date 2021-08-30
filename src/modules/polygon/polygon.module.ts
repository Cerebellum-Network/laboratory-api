import {Module} from '@nestjs/common';
import {PolygonController} from './polygon.controller';
import {PolygonService} from './polygon.service';
import {ConfigModule} from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [PolygonController],
  providers: [PolygonService],
  exports: [],
})
export class PolygonModule {}
