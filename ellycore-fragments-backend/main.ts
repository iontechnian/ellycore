import { NestFactory } from '@nestjs/core';
import '@nestjs/platform-express';
import { AppModule } from "./app.module.ts";
import { ValidationPipe } from "@nestjs/common";
import "reflect-metadata";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Ellycore Fragments API')
    .setDescription('API for managing and running fragments')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(Deno.env.get('PORT') ?? 3000);
}
bootstrap();