import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'body-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // 禁用Nestjs内置body解析器，允许better-auth处理原始数据
  });

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth/')) {
      // 不解析 body，Better Auth 会自行处理原始请求体
      return next()
    }

    // 其他请求路径正常解析 JSON body
    json()(req, res, () => {
      urlencoded({ extended: true })(req, res, next)
    })
  })

  const documentConfig = new DocumentBuilder()
    .setTitle(process.env.APP_NAME + " API")
    .setDescription(process.env.APP_NAME + " API")
    .setVersion("1.0")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: "swagger/json"
  });

  app.enableCors({ origin: '*', credentials: true })
  await app.listen(process.env.BACKEND_PORT ?? 8080);
}
bootstrap();
