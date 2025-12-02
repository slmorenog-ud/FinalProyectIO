"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const net = __importStar(require("net"));
function isPortAvailable(port) {
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
async function findAvailablePort(startPort, maxAttempts = 10) {
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
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.setGlobalPrefix(process.env.API_PREFIX || 'api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Sistema de Optimización Ferroviaria')
        .setDescription('API para resolver problemas de transporte (Método de Vogel) y optimización de carga (Problema de la Mochila)')
        .setVersion('1.0')
        .addTag('transport', 'Problema de Transporte - Método de Vogel')
        .addTag('cargo', 'Problema de Carga - Mochila 0/1')
        .addTag('optimization', 'Optimización Integrada')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
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
    if (process.env.AUTO_OPEN_BROWSER !== 'false') {
        const open = await import('open').catch(() => null);
        if (open) {
            open.default(`http://localhost:${port}`);
        }
    }
}
bootstrap();
//# sourceMappingURL=main.js.map