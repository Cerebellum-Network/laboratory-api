import {Module} from '@nestjs/common';
import {ConfigService} from './config.service';

@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: ConfigService.getDefaultInstance(),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
