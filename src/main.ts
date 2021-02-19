import {AppModule} from './app.module';
import {CereApplication, ConfigModule, ConfigService, CrashlyticModule, CrashlyticService} from '@cere/ms-core';
import {ValidationPipe} from '@nestjs/common';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {version} from '../package.json';
import {BlockScannerModule} from './modules/block-scanner/block-scanner.module';
import {BlockScannerService} from './modules/block-scanner/block-scanner.service';

async function bootstrap() {
  const servicePrefix = 'laboratory';

  const app = await CereApplication.create(AppModule);

  const configService = app.select(ConfigModule).get(ConfigService);
  const crashlyticService: CrashlyticService = app.select(CrashlyticModule).get(CrashlyticService);
  crashlyticService.init(configService.getCrashlyticKey(), configService.getEnv());

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
