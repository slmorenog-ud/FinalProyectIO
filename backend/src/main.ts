import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as net from 'net';

// Función para verificar si un puerto está disponible
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Función para encontrar un puerto disponible
async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`⚠️  Puerto ${port} ocupado, probando ${port + 1}...`);
  }
  throw new Error(`No se encontró un puerto disponible después de ${maxAttempts} intentos`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS - permitir todos los orígenes locales
  app.enableCors({
    origin: true,  // Permite cualquier origen
    credentials: true,
  });

  // Configurar prefijo global de API
  app.setGlobalPrefix(process.env.API_PREFIX || 'api');

  // Configurar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configurar filtro global de excepciones
  app.useGlobalFilters(new AllExceptionsFilter());

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Sistema de Optimización Ferroviaria')
    .setDescription(
      'API para resolver problemas de transporte (Método de Vogel) y optimización de carga (Problema de la Mochila)',
    )
    .setVersion('1.0')
    .addTag('transport', 'Problema de Transporte - Método de Vogel')
    .addTag('cargo', 'Problema de Carga - Mochila 0/1')
    .addTag('optimization', 'Optimización Integrada')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Buscar puerto disponible automáticamente
  const preferredPort = parseInt(process.env.PORT || '3000', 10);
  const port = await findAvailablePort(preferredPort);
  
  await app.listen(port);
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚂 Sistema de Optimización Ferroviaria - IO1          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Aplicación:  http://localhost:${port}                    ║`);
  console.log(`║  📡 API:         http://localhost:${port}/api                ║`);
  console.log(`║  📚 Swagger:     http://localhost:${port}/api/docs           ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Presiona Ctrl+C para detener el servidor                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Abrir navegador automáticamente (opcional para ejecutable)
  if (process.env.AUTO_OPEN_BROWSER !== 'false') {
    const open = await import('open').catch(() => null);
    if (open) {
      open.default(`http://localhost:${port}`);
    }
  }
}
bootstrap();
