import dotenv from 'dotenv';
import {Injectable} from '@nestjs/common';
import {IConfigService} from './config.service.interface';

function getEnv() {
  return process.env.NODE_ENV || 'local';
}

@Injectable()
export class ConfigService implements IConfigService {
  public constructor(path: string) {
    dotenv.config({path});
  }

  public get(key: string): string {
    return process.env[key];
  }

  public getEnv(): string {
    return getEnv();
  }

  public static getDefaultInstance(): IConfigService {
    const appFolderPath = process.argv[2];
    const path = `${process.cwd()}/${appFolderPath}/.env.${getEnv()}`;
    return new ConfigService(path);
  }
}
