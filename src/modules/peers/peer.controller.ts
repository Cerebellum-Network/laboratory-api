import {ApiInternalServerErrorResponse, ApiGatewayTimeoutResponse, ApiTags} from '@nestjs/swagger';
import {Controller, Logger, Get, Inject, Param} from '@nestjs/common';
import {ConfigService} from '../config/config.service';
import {PeerService} from './peer.service';

@Controller('peer')
@ApiInternalServerErrorResponse({description: 'Internal server error.'})
@ApiGatewayTimeoutResponse({description: 'Gateway timeout exception.'})
@ApiTags('Peer')
export class PeerController {
  private logger = new Logger(PeerController.name);

  public constructor(
    private readonly configService: ConfigService,
    @Inject(PeerService)
    private readonly peerService: PeerService,
  ) {}

  @Get('/details/:network')
  public async details(@Param('network') network: string): Promise<any> {
    const result = await this.peerService.fetch(network);
    return result;
  }

  @Get('/treasury-balance/:network')
  public async treasuryBalance(@Param('network') network: string): Promise<any>{
    const balance = await this.peerService.treasuryBalance(network);
    return balance;
  }
}
