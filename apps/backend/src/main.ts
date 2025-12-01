import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { BetterAuthIoAdapter } from './adapters/better-auth.adapter';
import { Logger } from '@nestjs/common';
const compression = require('compression');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const documentConfig = new DocumentBuilder()
    .setTitle(process.env.APP_NAME + ' API')
    .setDescription(process.env.APP_NAME + ' API')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('swagger', app, documentFactory, { jsonDocumentUrl: 'swagger/json' });

  const HTTP_TYPE = process.env.HTTP_TYPE ?? 'http';
  const SERVER_HOST = process.env.SERVER_HOST ?? 'localhost';
  const FRONTEND_PORT = process.env.FRONTEND_PORT ?? '3000';
  const allowedOrigins = [
    `${HTTP_TYPE}://${SERVER_HOST}:${FRONTEND_PORT}`,
    `${HTTP_TYPE}://localhost:${FRONTEND_PORT}`,
    `${HTTP_TYPE}://127.0.0.1:${FRONTEND_PORT}`,
    'http://tauri.localhost',
    'tauri://localhost',
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  app.useWebSocketAdapter(new BetterAuthIoAdapter(app, allowedOrigins));

  app.use(compression());

  await app.listen(process.env.BACKEND_PORT ?? 8080);
  logger.log(`Listening on ${process.env.BACKEND_PORT ?? 8080}`);
}
bootstrap();
