import {Module} from '@nestjs/common';
import {ConfigModule} from '@cere/ms-core';
import {TypeOrmModule} from '@nestjs/typeorm';

@Module({
  imports: [ConfigModule, TypeOrmModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class FriendlyBotModule {}
