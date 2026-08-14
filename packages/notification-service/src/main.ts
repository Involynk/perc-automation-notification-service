import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('NotificationService');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('PERC Notification Engine (Engine 8)')
    .setDescription('Centralized operational alert & counselor inbox feed microservice with Kafka streaming.')
    .setVersion('1.0')
    .addTag('Notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.NOTIFICATION_SERVICE_PORT || process.env.PORT || 3004;
  await app.listen(port);
  logger.log(`🚀 PERC Notification Engine is running on port ${port}`);
  logger.log(`📚 Swagger Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
