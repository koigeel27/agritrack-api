import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const swagger = new DocumentBuilder()
    .setTitle('AgriTrack API')
    .setDescription('Harvest Logbook for small farmers. Sign in with POST /api/auth/login, then press Authorize and paste the token.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`AgriTrack API running on http://localhost:${port}/api  (docs: /api/docs)`);
}
bootstrap();
