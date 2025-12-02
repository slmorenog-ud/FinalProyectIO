import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransportModule } from './modules/transport/transport.module';
import { CargoModule } from './modules/cargo/cargo.module';
import { OptimizationModule } from './modules/optimization/optimization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Servir frontend estático desde la carpeta 'public'
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*'],
    }),
    TransportModule,
    CargoModule,
    OptimizationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
