import {Module} from '@nestjs/common';
import {ConfigModule} from '../../../../libs/config/src';
import {PeerController} from './peer.controller';
import {PeerService} from './peer.service';

@Module({
  imports: [ConfigModule],
  controllers: [PeerController],
  providers: [PeerService],
  exports: [],
})
export class PeerModule {}
