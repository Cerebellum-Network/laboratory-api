import {Module} from '@nestjs/common';
import {BlockScannerController} from './block-scanner.controller';
import {BlockScannerService} from './block-scanner.service';
import {ConfigModule} from '../../../../../libs/config/src';
import {TypeOrmModule} from '@nestjs/typeorm';
import {BlockEntity} from '../../../../../libs/block-scanner/src/entities/block.entity';
import {TransactionEntity} from '../../../../../libs/block-scanner/src/entities/transaction.entity';
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([BlockEntity, TransactionEntity])],
  controllers: [BlockScannerController],
  providers: [BlockScannerService],
  exports: [],
})
export class BlockScannerModule {}
