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
    .setTitle(process.env.NUXT_PUBLIC_APP_NAME + ' API')
    .setDescription(process.env.NUXT_PUBLIC_APP_NAME + ' API')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('swagger', app, documentFactory, { jsonDocumentUrl: 'swagger/json' });

  const NUXT_PUBLIC_HTTP_TYPE = process.env.NUXT_PUBLIC_HTTP_TYPE ?? 'http';
  const NUXT_PUBLIC_SERVER_HOST = process.env.NUXT_PUBLIC_SERVER_HOST ?? 'localhost';
  const NUXT_PUBLIC_FRONTEND_PORT = process.env.NUXT_PUBLIC_FRONTEND_PORT ?? '3000';
  const NUXT_PUBLIC_BACKEND_PORT = process.env.NUXT_PUBLIC_BACKEND_PORT ?? '8080';
  const allowedOrigins = [
    `${NUXT_PUBLIC_HTTP_TYPE}://${NUXT_PUBLIC_SERVER_HOST}:${NUXT_PUBLIC_FRONTEND_PORT}`,
    `${NUXT_PUBLIC_HTTP_TYPE}://localhost:${NUXT_PUBLIC_FRONTEND_PORT}`,
    `${NUXT_PUBLIC_HTTP_TYPE}://127.0.0.1:${NUXT_PUBLIC_FRONTEND_PORT}`,
    `${NUXT_PUBLIC_HTTP_TYPE}://localhost:${NUXT_PUBLIC_BACKEND_PORT}`,
    `${NUXT_PUBLIC_HTTP_TYPE}://127.0.0.1:${NUXT_PUBLIC_BACKEND_PORT}`,
    `${NUXT_PUBLIC_HTTP_TYPE}://${NUXT_PUBLIC_SERVER_HOST}:${NUXT_PUBLIC_BACKEND_PORT}`,
    'http://tauri.localhost',
    "https://junct.dpdns.org",
    'tauri://localhost',
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  app.useWebSocketAdapter(new BetterAuthIoAdapter(app, allowedOrigins));

  app.use(compression());

  await app.listen(process.env.NUXT_PUBLIC_BACKEND_PORT ?? 8080);
  logger.log(`Listening on ${process.env.NUXT_PUBLIC_BACKEND_PORT ?? 8080}`);
}
bootstrap();
