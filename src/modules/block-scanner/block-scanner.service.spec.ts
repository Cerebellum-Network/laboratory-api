import {ConfigModule} from '../config/config.module';
import {Test, TestingModule} from '@nestjs/testing';
import {getRepositoryToken} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {BlockScannerService} from './block-scanner.service';
import {BlockEntity} from './entities/block.entity';
import {TransactionEntity} from './entities/transaction.entity';

describe('Block scanner', () => {
  let service: BlockScannerService;

  beforeEach(async (done) => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        BlockScannerService,
        {
          provide: getRepositoryToken(BlockEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<BlockScannerService>(BlockScannerService);
    done();
  });

  it('Should fetch transaction', async (done) => {
    const spyServicegetTransaction = jest.spyOn(service, 'getTransactions');
    spyServicegetTransaction.mockResolvedValue({
      data: [
        {
          transactionHash: '0xa7e86ad69677b263b62bebd3d54883d61b002134c9ae50c4302a42de4bd42c8b',
          senderId: '5ERXjrtMDMA2D76pMeoiyDWPtxNhmv2w86qDMt4KA3YZ5dvA',
          signature:
            '0xe8749234da12a6a544b3144a329e4760d34f0fb76ed1a10017aa8abc374c5e7841541d8a6fcee59307e6d568677af2f8f5594f97764cee972f448ed5b7388f81',
          transactionIndex: '2',
          success: 'true',
          nonce: '16',
          events: [
            {
              id: '57621-2',
              method: 'Transfer',
              module: 'balances',
            },
            {
              id: '57621-2',
              method: 'Deposit',
              module: 'treasury',
            },
            {
              id: '57621-2',
              method: 'ExtrinsicSuccess',
              module: 'system',
            },
          ],
          args: '5ChWtKGAqA3mDTdQKBEjdEWnXiCKM841HniJwyFYZDZeL2Hj,100000000000000',
          method: 'balances.transfer',
          timestamp: new Date(),
        },
      ],
      count: 1,
    });
    const result = await service.getTransactions('5ERXjrtMDMA2D76pMeoiyDWPtxNhmv2w86qDMt4KA3YZ5dvA', 0, 10);
    expect(result).toBeTruthy();
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('count');
    done();
  });
});
