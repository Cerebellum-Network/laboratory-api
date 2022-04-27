import {ConfigService} from '../../config/src';
import {TypeOrmModuleOptions} from '@nestjs/typeorm';

const configService = ConfigService.getDefaultInstance();

const migrationsDir = configService.get('MIGRATIONS_DIR') || './src/migrations';
const migrationsFiles = configService.get('MIGRATIONS_FILES') || '*.ts';

const ormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: parseInt(configService.get('DB_PORT'), 10),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
  entities: configService.get('DB_ENTITIES').split(' '),
  logging: configService.get('DB_LOGGING') && configService.get('DB_LOGGING') === 'true',
  maxQueryExecutionTime: parseInt(configService.get('DB_MAX_QUERY_EXECUTION_TIME') || '100', 10),
  keepConnectionAlive: configService.get('DB_CONNECTION_ALIVE') === 'true',
  migrations: [`${migrationsDir}/*${migrationsFiles}`],
  cli: {
    migrationsDir,
  },
};

export = ormConfig;
