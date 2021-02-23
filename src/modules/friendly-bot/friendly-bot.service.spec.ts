import {ConfigModule} from '../config/config.module';
import {Test, TestingModule} from '@nestjs/testing';
import {getRepositoryToken} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {PayoutEntity} from './entities/payout.entity';
import {FriendlyBotService} from './friendly-bot.service';

describe('Block scanner', () => {
  let service: FriendlyBotService;

  beforeEach(async (done) => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        FriendlyBotService,
        {
          provide: getRepositoryToken(PayoutEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<FriendlyBotService>(FriendlyBotService);
    done();
  });

  it('Should issue Token', async (done) => {
    const spyServiceIssueToken = jest.spyOn(service, 'issueToken');
    spyServiceIssueToken.mockResolvedValue({
      transactionHash: '0xa3e19ea0fae8b2f855b23350a2632235f3048000b116392aebae386b42cd64b0',
    });
    const result = await service.issueToken('5D7stAd5Rs61oPXYf1Hf5DCW3wj2876nuVAunxLzwGEBYnuS');
    expect(result).toBeTruthy();
    expect(result).toHaveProperty('transactionHash');
    done();
  });
});
