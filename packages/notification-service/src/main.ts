import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('NotificationBootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('PERC Notification Engine API (Engine 8)')
    .setDescription('Central administrative notification microservice for PERC Admission Operations Platform.')
    .setVersion('1.0')
    .addTag('Notification Engine (Engine 8)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.NOTIFICATION_SERVICE_PORT || 3004;
  await app.listen(port);

  logger.log(`🚀 Pure Backend Notification Engine (Engine 8) running on port ${port}`);
  logger.log(`📚 Swagger API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
