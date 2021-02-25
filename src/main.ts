import {AppModule} from './app.module';
import {ConfigModule} from './modules/config/config.module';
import {ConfigService} from './modules/config/config.service';
import {ValidationPipe} from '@nestjs/common';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {version} from '../package.json';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';
import {BlockScannerService} from './modules/block-scanner/block-scanner.service';
import {NestFactory} from '@nestjs/core';
import bodyParser from 'body-parser';
import {NestExpressApplication} from '@nestjs/platform-express';

async function bootstrap() {
  const servicePrefix = 'laboratory';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {bodyParser: false});
  app.use(bodyParser.json());

  app.set('trust proxy', 1);

  const configService = app.select(ConfigModule).get(ConfigService);

  app.enableCors();

  const options = new DocumentBuilder()
    .setTitle('Block Scanner Service')
    .setDescription('The Block Scanner Service API description')
    .setVersion(version)
    .addServer(`/${servicePrefix}`)
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(`${servicePrefix}/swagger`, app, document);

  const blockScannerService = app.select(BlockScannerModule).get(BlockScannerService);
  blockScannerService.startScanning();

  app.setGlobalPrefix(servicePrefix);
  app.useGlobalPipes(new ValidationPipe({transform: true}));

  await app.listen(configService.get('PORT') || 1111);
}

bootstrap();
