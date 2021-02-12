import {Module} from '@nestjs/common';
import {BlockScannerController} from './block-scanner.controller';
import {BlockScannerService} from './block-scanner.service';
import {ConfigModule} from '@cere/ms-core';
import {TypeOrmModule} from '@nestjs/typeorm';
import {BlockEntity} from './entities/block.entity';
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([BlockEntity])],
  controllers: [BlockScannerController],
  providers: [BlockScannerService],
  exports: [],
})
export class BlockScannerModule {}
