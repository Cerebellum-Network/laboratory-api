import {Module} from '@nestjs/common';
import {BlockScannerController} from './block-scanner.controller';
import {BlockScannerService} from './block-scanner.service';
import {ConfigModule} from '../config/config.module';
import {TypeOrmModule} from '@nestjs/typeorm';
import {BlockEntity} from './entities/block.entity';
import {TransactionEntity} from './entities/transaction.entity';
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([BlockEntity, TransactionEntity]), ConfigModule],
  controllers: [BlockScannerController],
  providers: [BlockScannerService],
  exports: [],
})
export class BlockScannerModule {}
