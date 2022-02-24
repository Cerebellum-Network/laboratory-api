import {Test, TestingModule} from '@nestjs/testing';
import {ConfigService} from './config.service';
import {ConfigModule} from './config.module';

declare let process: {env: {[key: string]: string}};

describe('ConfigService', () => {
  let service: ConfigService;
  let module: TestingModule;
  // Needs for restore Environment variables after each test
  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = {...OLD_ENV};

    module = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();
    service = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    // This is the default value on .env.test file
    expect(service.get('unitTest1')).toEqual('test1');
  });

  it('should take value of environment variable on top of one in .env file', () => {
    process.env.unitTest1 = 'new test';

    expect(ConfigService.getDefaultInstance().get('unitTest1')).toEqual('new test');
  });

  it('should have environment variable even if there is no one in .env file', () => {
    // This test expects .env.test to have defined the unitTest1=test1 variable
    process.env.testNew = 'new test';

    expect(ConfigService.getDefaultInstance().get('unitTest1')).toEqual('test1');
    expect(ConfigService.getDefaultInstance().get('testNew')).toEqual('new test');
  });
});
