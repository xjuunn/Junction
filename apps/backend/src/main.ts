import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
const compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // 禁用Nestjs内置body解析器，允许better-auth处理原始数据
  });

  const documentConfig = new DocumentBuilder()
    .setTitle(process.env.APP_NAME + " API")
    .setDescription(process.env.APP_NAME + " API")
    .setVersion("1.0")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: "swagger/json"
  });

  app.enableCors({
    origin: '*', credentials: true,
  })
  app.use(compression());
  await app.listen(process.env.BACKEND_PORT ?? 8080);
}
bootstrap();
