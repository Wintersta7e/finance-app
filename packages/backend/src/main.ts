import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
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
  app.use('/api/import', json({ limit: '52mb' }));
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['null']  // Electron file:// sends Origin: null
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  });

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

  if (process.env.NODE_ENV !== 'production') {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('Finance API')
      .setDescription('Personal finance tracking API')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  if (process.send) {
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        app.close()
          .then(() => process.exit(0))
          .catch((err) => {
            console.error('Graceful shutdown failed:', err);
            process.exit(1);
          });
      }
    });
  }

  const port = process.env.PORT || 8080;
  await app.listen(port, '127.0.0.1');

  console.log(`Backend running on http://127.0.0.1:${port}`);

  if (process.send) {
    process.send('ready');
  }
}

bootstrap();
