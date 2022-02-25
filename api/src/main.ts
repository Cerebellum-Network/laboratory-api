import {AppModule} from './app.module';
import {ConfigModule, ConfigService} from '../../libs/config/src';
import {ValidationPipe} from '@nestjs/common';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {version} from '../../package.json';
// import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';
// import {BlockScannerService} from './modules/block-scanner/block-scanner.service';
import {NestFactory} from '@nestjs/core';
import bodyParser from 'body-parser';
import {NestExpressApplication} from '@nestjs/platform-express';

async function bootstrap() {
  const servicePrefix = 'laboratory';

  const logLevel = process.env.LOG_LEVEL;
  let logLevelParams = [];
  switch(logLevel) {
    case 'debug': {
      logLevelParams = ['debug', 'log', 'warn', 'error'];
      break;
    }
    case 'info': {
      logLevelParams = ['log', 'warn', 'error'];
      break;
    }
    case 'warn': {
      logLevelParams = ['warn', 'error'];
      break;
    }
    case 'error': {
      logLevelParams = ['error'];
      break;
    }
    default: {
      logLevelParams = ['warn', 'error'];
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    {
      bodyParser: false,
      logger: logLevelParams,
    },
  );
  app.use(bodyParser.json());

  app.set('trust proxy', 1);

  const configService = app.select(ConfigModule).get(ConfigService);

  app.enableCors();

  const options = new DocumentBuilder()
    .setTitle('Laboratory API')
    .setDescription('Laboratory API description')
    .setVersion(version)
    .addServer(`/${servicePrefix}`)
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(`${servicePrefix}/swagger`, app, document);

  // const blockScannerService = app.select(BlockScannerModule).get(BlockScannerService);
  // blockScannerService.init();

  app.setGlobalPrefix(servicePrefix);
  app.useGlobalPipes(new ValidationPipe({transform: true}));

  await app.listen(configService.get('PORT') || 1111);
}

bootstrap();
