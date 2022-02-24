import {Module} from '@nestjs/common';
import {databaseConnections} from './database-connections';
import {DatabaseService} from './database.service';
import {TypeOrmModule} from '@nestjs/typeorm';

@Module({
  imports: [...databaseConnections],
  exports: [TypeOrmModule, DatabaseService],
  providers: [DatabaseService],
})
export class DatabaseModule {}
