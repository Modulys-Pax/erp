import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateBootstrapEnv } from './shared/security/bootstrap-env.validation';

async function bootstrap() {
  validateBootstrapEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '2mb';
  app.use(bodyParser.json({ limit: jsonBodyLimit }));
  app.use(bodyParser.urlencoded({ limit: jsonBodyLimit, extended: true }));

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
    }),
  );

  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const swaggerEnabled = !isProduction || process.env.SWAGGER_ENABLED === 'true';

  const port = process.env.PORT || 3001;

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ERP Transporte & Logística API')
      .setDescription('API do sistema ERP para transporte e logística')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    console.log(`📚 Swagger disponível em http://localhost:${port}/docs`);
    if (isProduction) {
      console.warn(
        '[SECURITY] Swagger em produção (SWAGGER_ENABLED=true). Restrinja acesso à rota /docs.',
      );
    }
  }

  await app.listen(port);
  console.log(`🚀 Backend rodando em http://localhost:${port}`);
}

bootstrap();
