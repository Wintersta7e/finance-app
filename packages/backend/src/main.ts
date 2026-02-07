import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { DecimalSerializerInterceptor } from './common/interceptors/decimal-serializer.interceptor';

// Default DATABASE_URL for development (production sets it via Electron main process)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new DecimalSerializerInterceptor());
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Finance API')
    .setDescription('Personal finance tracking API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 8080;
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}`);

  if (process.send) {
    process.send('ready');
  }
}

bootstrap();
