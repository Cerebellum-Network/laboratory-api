import {TypeOrmModule} from '@nestjs/typeorm';
import * as ormConfig from './ormconfig';

export const databaseConnections = [TypeOrmModule.forRoot(ormConfig)];
