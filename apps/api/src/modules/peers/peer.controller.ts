import {ApiInternalServerErrorResponse, ApiGatewayTimeoutResponse, ApiTags} from '@nestjs/swagger';
import {Controller, Logger, Get, Inject, Param} from '@nestjs/common';
import {ConfigService} from '../../../../../libs/config/src';
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
  public treasuryBalance(@Param('network') network: string): Promise<any> {
    return this.peerService.treasuryBalance(network);
  }

  @Get('/total-issuance/:network')
  public totalIssuance(@Param('network') network: string): Promise<any> {
    return this.peerService.totalIssuance(network);
  }
}
