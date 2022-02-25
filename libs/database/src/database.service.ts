import {Injectable} from '@nestjs/common';
import {Connection, Repository} from 'typeorm';

@Injectable()
export class DatabaseService {
  public constructor(public readonly connection: Connection) {}

  public getRepository<T>(entity): Repository<T> {
    return this.connection.getRepository(entity);
  }
}
