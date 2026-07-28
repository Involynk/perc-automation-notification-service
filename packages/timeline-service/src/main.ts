import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('TimelineBootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const publicDirCandidates = [
    join(process.cwd(), 'packages/timeline-service/public'),
    join(__dirname, '..', 'public'),
    join(__dirname, 'public'),
    join(__dirname, '..', '..', '..', 'packages', 'timeline-service', 'public'),
  ];
  const publicDir = publicDirCandidates.find((dir) => require('fs').existsSync(dir)) || publicDirCandidates[0];
  logger.log(`Serving static assets from: ${publicDir}`);
  app.useStaticAssets(publicDir);

  const config = new DocumentBuilder()
    .setTitle('PERC Conversation Timeline Engine API')
    .setDescription('Central history microservice for workflow automation events.')
    .setVersion('1.0')
    .addTag('Conversation Timeline Engine')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.TIMELINE_SERVICE_PORT || process.env.PORT || 3003;
  await app.listen(port);

  logger.log(`🚀 Timeline Engine Service running on port ${port}`);
  logger.log(`📊 Dashboard: http://localhost:${port}`);
  logger.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
