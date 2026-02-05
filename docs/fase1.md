# FASE 1: Configuración Inicial + Backend Base - EfectivoYa

## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

Resumen: EfectivoYa es una aplicación fintech de billetera digital en Perú. Backend con Node.js + Express + TypeScript + Prisma + PostgreSQL.

## OBJETIVO DE ESTA FASE
Configurar el proyecto backend completo con:
- Node.js + Express.js + TypeScript
- PostgreSQL + Prisma ORM
- Estructura de carpetas profesional
- Middlewares de seguridad
- Utilidades básicas (JWT, logger, validators)
- Configuración lista para agregar rutas en próximas fases

## INSTRUCCIONES DETALLADAS

### 1. CREAR ESTRUCTURA DEL PROYECTO

Crea la siguiente estructura de directorios y archivos:
efectivoya-backend/
├── src/
│   ├── controllers/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── errorHandler.middleware.ts
│   ├── routes/
│   ├── services/
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   ├── logger.util.ts
│   │   └── validators.util.ts
│   ├── types/
│   │   └── index.d.ts
│   ├── app.ts
│   └── server.ts
├── prisma/
│   └── schema.prisma
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md

### 2. PACKAGE.JSON

Crea package.json con estas dependencias exactas:
````json
{
  "name": "efectivoya-backend",
  "version": "1.0.0",
  "description": "Backend API para EfectivoYa - Billetera Digital",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "keywords": ["fintech", "wallet", "peru"],
  "author": "EfectivoYa",
  "license": "MIT",
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.1",
    "express-validator": "^7.2.0",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.10.2",
    "@types/uuid": "^10.0.0",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.2"
  }
}
````

### 3. TSCONFIG.JSON

Crea tsconfig.json optimizado para Node.js:
````json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
````

### 4. .GITIGNORE
node_modules/
dist/
.env
.DS_Store
*.log
.vscode/
.idea/
coverage/

### 5. .ENV.EXAMPLE
````env
# Base de datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/efectivoya_db

# JWT
JWT_SECRET=cambia-este-secret-por-uno-seguro-minimo-32-caracteres
JWT_REFRESH_SECRET=cambia-este-secret-por-otro-diferente-32-caracteres

# Server
PORT=3000
NODE_ENV=development

# Cloudinary (se configurará en fase posterior)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (se configurará en fase posterior)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:8081
````

### 6. PRISMA SCHEMA

Crea prisma/schema.prisma con este contenido EXACTO:
````prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// USUARIOS
model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  password_hash         String
  nombres               String
  apellidos             String
  dni                   String    @unique
  numero_documento      String
  whatsapp              String
  saldo_actual          Decimal   @default(0) @db.Decimal(12, 2)
  email_verificado      Boolean   @default(false)
  is_active             Boolean   @default(true)
  codigo_referido       String    @unique
  referido_por          String?
  bono_referido_usado   Boolean   @default(false)
  push_token            String?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  // Relaciones
  bancos                UserBank[]
  recargas              Recarga[]
  retiros               Retiro[]
  audit_logs_user       AuditLog[] @relation("UserLogs")
  chats                 ChatSoporte[]
  alertas               AlertaSeguridad[]
  referidos_hechos      Referido[] @relation("Referrer")
  referidos_recibidos   Referido[] @relation("Referred")
  referente             User?     @relation("UserReferrals", fields: [referido_por], references: [id])
  referidos             User[]    @relation("UserReferrals")

  @@map("users")
}

// BANCOS DEL USUARIO
model UserBank {
  id              String   @id @default(uuid())
  user_id         String
  banco           BancoEnum
  numero_cuenta   String
  cci             String
  alias           String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  retiros         Retiro[]

  @@map("user_banks")
}

enum BancoEnum {
  BCP
  Interbank
  Scotiabank
  BBVA
}

// RECARGAS
model Recarga {
  id                    String    @id @default(uuid())
  numero_operacion      String    @unique
  user_id               String
  banco_origen          BancoEnum
  monto_depositado      Decimal   @db.Decimal(12, 2)
  porcentaje_comision   Decimal   @db.Decimal(5, 2)
  comision_calculada    Decimal   @db.Decimal(12, 2)
  monto_neto            Decimal   @db.Decimal(12, 2)
  boucher_url           String
  estado                EstadoOperacion @default(pendiente)
  admin_id              String?
  motivo_rechazo        String?
  comprobante_pdf_url   String?
  created_at            DateTime  @default(now())
  processed_at          DateTime?

  user                  User      @relation(fields: [user_id], references: [id])
  admin                 Admin?    @relation(fields: [admin_id], references: [id])

  @@map("recargas")
}

// RETIROS
model Retiro {
  id                    String    @id @default(uuid())
  numero_operacion      String    @unique
  user_id               String
  user_bank_id          String
  monto                 Decimal   @db.Decimal(12, 2)
  estado                EstadoOperacion @default(pendiente)
  admin_id              String?
  motivo_rechazo        String?
  comprobante_pdf_url   String?
  created_at            DateTime  @default(now())
  processed_at          DateTime?

  user                  User      @relation(fields: [user_id], references: [id])
  banco                 UserBank  @relation(fields: [user_bank_id], references: [id])
  admin                 Admin?    @relation(fields: [admin_id], references: [id])

  @@map("retiros")
}

enum EstadoOperacion {
  pendiente
  aprobado
  rechazado
}

// ADMINISTRADORES
model Admin {
  id                String    @id @default(uuid())
  email             String    @unique
  password_hash     String
  nombre            String
  rol               RolAdmin
  is_active         Boolean   @default(true)
  created_at        DateTime  @default(now())

  recargas_procesadas   Recarga[]
  retiros_procesados    Retiro[]
  audit_logs            AuditLog[] @relation("AdminLogs")
  chats                 ChatSoporte[]
  alertas_revisadas     AlertaSeguridad[]
  configuracion_updates Configuracion[]

  @@map("admins")
}

enum RolAdmin {
  super_admin
  admin
}

// CONFIGURACIÓN GLOBAL
model Configuracion {
  id                        Int       @id @default(1)
  porcentaje_comision       Decimal   @default(5.0) @db.Decimal(5, 2)
  monto_minimo_recarga      Decimal   @default(1000) @db.Decimal(12, 2)
  monto_maximo_recarga      Decimal   @default(100000) @db.Decimal(12, 2)
  cuenta_recaudadora_numero String
  cuenta_recaudadora_banco  String
  cuenta_recaudadora_titular String
  mantenimiento_activo      Boolean   @default(false)
  mensaje_mantenimiento     String?
  version_minima_android    String    @default("1.0.0")
  version_minima_ios        String    @default("1.0.0")
  forzar_actualizacion      Boolean   @default(false)
  bono_referido             Decimal   @default(10.0) @db.Decimal(12, 2)
  max_referidos_por_usuario Int       @default(10)
  updated_at                DateTime  @updatedAt
  updated_by                String?

  admin                     Admin?    @relation(fields: [updated_by], references: [id])

  @@map("configuracion")
}

// LOGS DE AUDITORÍA
model AuditLog {
  id          String   @id @default(uuid())
  user_id     String?
  admin_id    String?
  accion      String
  ip_address  String
  user_agent  String
  detalles    Json?
  created_at  DateTime @default(now())

  user        User?    @relation("UserLogs", fields: [user_id], references: [id])
  admin       Admin?   @relation("AdminLogs", fields: [admin_id], references: [id])

  @@index([user_id])
  @@index([admin_id])
  @@index([accion])
  @@index([created_at])
  @@map("audit_logs")
}

// REFERIDOS
model Referido {
  id                      String    @id @default(uuid())
  referrer_id             String
  referred_id             String
  bono_otorgado           Boolean   @default(false)
  fecha_primera_recarga   DateTime?
  created_at              DateTime  @default(now())

  referrer                User      @relation("Referrer", fields: [referrer_id], references: [id])
  referred                User      @relation("Referred", fields: [referred_id], references: [id])

  @@unique([referrer_id, referred_id])
  @@map("referidos")
}

// ALERTAS DE SEGURIDAD
model AlertaSeguridad {
  id            String    @id @default(uuid())
  user_id       String
  tipo          TipoAlerta
  descripcion   String
  detalles      Json?
  revisada      Boolean   @default(false)
  admin_id      String?
  created_at    DateTime  @default(now())
  reviewed_at   DateTime?

  user          User      @relation(fields: [user_id], references: [id])
  admin         Admin?    @relation(fields: [admin_id], references: [id])

  @@index([revisada])
  @@index([created_at])
  @@map("alertas_seguridad")
}

enum TipoAlerta {
  multiples_recargas
  retiro_inmediato
  boucher_duplicado
  patron_sospechoso
}

// CHAT SOPORTE
model ChatSoporte {
  id          String         @id @default(uuid())
  user_id     String
  admin_id    String?
  estado      EstadoChat     @default(abierto)
  created_at  DateTime       @default(now())
  closed_at   DateTime?

  user        User           @relation(fields: [user_id], references: [id])
  admin       Admin?         @relation(fields: [admin_id], references: [id])
  mensajes    ChatMensaje[]

  @@map("chat_soporte")
}

enum EstadoChat {
  abierto
  cerrado
}

// MENSAJES DE CHAT
model ChatMensaje {
  id              String      @id @default(uuid())
  chat_id         String
  remitente_tipo  RemitenteChat
  remitente_id    String
  mensaje         String
  leido           Boolean     @default(false)
  created_at      DateTime    @default(now())

  chat            ChatSoporte @relation(fields: [chat_id], references: [id], onDelete: Cascade)

  @@index([chat_id])
  @@map("chat_mensajes")
}

enum RemitenteChat {
  usuario
  admin
}

// FAQ
model FAQ {
  id          String   @id @default(uuid())
  pregunta    String
  respuesta   String
  orden       Int
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@map("faqs")
}

// TÉRMINOS Y CONDICIONES
model TerminosCondiciones {
  id          Int      @id @default(1)
  contenido   String
  version     String
  updated_at  DateTime @updatedAt

  @@map("terminos_condiciones")
}

// POLÍTICAS DE PRIVACIDAD
model PoliticasPrivacidad {
  id          Int      @id @default(1)
  contenido   String
  version     String
  updated_at  DateTime @updatedAt

  @@map("politicas_privacidad")
}

// VIDEOS INSTRUCTIVOS
model VideoInstructivo {
  id          String    @id @default(uuid())
  banco       BancoEnum @unique
  youtube_url String
  titulo      String
  updated_at  DateTime  @updatedAt

  @@map("videos_instructivos")
}
````

### 7. TIPOS (src/types/index.d.ts)
````typescript
import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminRol?: 'super_admin' | 'admin';
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}
````

### 8. UTILIDADES

#### src/utils/logger.util.ts
````typescript
export class Logger {
  static info(message: string, ...args: any[]) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}
````

#### src/utils/jwt.util.ts
````typescript
import jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me';

export class JWTUtil {
  static generateAccessToken(userId: string, email: string): string {
    const payload: JWTPayload = { userId, email };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  }

  static generateRefreshToken(userId: string, tokenId: string): string {
    const payload: RefreshTokenPayload = { userId, tokenId };
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  }
}
````

#### src/utils/validators.util.ts
````typescript
export class Validators {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidDNI(dni: string): boolean {
    return /^\d{8}$/.test(dni);
  }

  static isValidWhatsApp(whatsapp: string): boolean {
    return /^\d{9}$/.test(whatsapp);
  }

  static isValidPassword(password: string): boolean {
    // Min 8 chars, 1 uppercase, 1 number, 1 symbol
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasMinLength && hasUppercase && hasNumber && hasSymbol;
  }

  static isValidNumeroCuenta(cuenta: string): boolean {
    return /^\d{13,}$/.test(cuenta);
  }

  static isValidCCI(cci: string): boolean {
    return /^\d{20}$/.test(cci);
  }

  static sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, '');
  }
}
````

### 9. MIDDLEWARES

#### src/middleware/auth.middleware.ts
````typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = JWTUtil.verifyAccessToken(token);
      req.userId = decoded.userId;
      req.email = decoded.email;
      next();
    } catch (error) {
      Logger.error('Token inválido:', error);
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    Logger.error('Error en authMiddleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error de autenticación'
    });
  }
};
````

#### src/middleware/validation.middleware.ts
````typescript
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  
  next();
};
````

#### src/middleware/errorHandler.middleware.ts
````typescript
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger.util';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Logger.error('Error capturado:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
````

### 10. APP.TS
````typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.middleware';
import { Logger } from './utils/logger.util';

const app: Application = express();

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EfectivoYa API está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Rutas (se agregarán en próximas fases)
// app.use('/api/auth', authRoutes);
// app.use('/api/user-banks', authMiddleware, userBanksRoutes);
// etc.

// Error handler (debe estar al final)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

export default app;
````

### 11. SERVER.TS
````typescript
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { Logger } from './utils/logger.util';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  Logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  Logger.info(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});
````

### 12. README.MD
````markdown
# EfectivoYa Backend

API REST para la aplicación de billetera digital EfectivoYa.

## Stack Tecnológico

- Node.js + Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
```bash
   npm install
```

3. Configurar variables de entorno:
```bash
   cp .env.example .env
   # Editar .env con tus credenciales
```

4. Configurar base de datos:
```bash
   npm run prisma:generate
   npm run prisma:migrate
```

5. Iniciar servidor de desarrollo:
```bash
   npm run dev
```

## Scripts Disponibles

- `npm run dev` - Servidor de desarrollo con hot reload
- `npm run build` - Compilar TypeScript a JavaScript
- `npm start` - Iniciar servidor en producción
- `npm run prisma:generate` - Generar cliente de Prisma
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:studio` - Abrir Prisma Studio

## Estructura del Proyecto
````
src/
├── controllers/   # Lógica de negocio
├── middleware/    # Middlewares personalizados
├── routes/        # Definición de rutas
├── services/      # Servicios auxiliares
├── utils/         # Utilidades
├── types/         # Tipos TypeScript
├── app.ts         # Configuración de Express
└── server.ts      # Punto de entrada
Health Check
bashcurl http://localhost:3000/health
````

## Licencia

MIT
````

## VALIDACIÓN FINAL

Después de crear todos los archivos:

1. Ejecuta `npm install` para instalar dependencias
2. Crea un archivo .env basado en .env.example
3. Configura DATABASE_URL con tu PostgreSQL local
4. Ejecuta `npm run prisma:generate`
5. Ejecuta `npm run prisma:migrate` para crear las tablas
6. Ejecuta `npm run dev` para iniciar el servidor
7. Verifica que responde en http://localhost:3000/health

## RESULTADO ESPERADO

Al finalizar esta fase tendrás:
✅ Proyecto backend configurado con TypeScript
✅ Prisma conectado a PostgreSQL
✅ Estructura de carpetas profesional
✅ Middlewares de seguridad implementados
✅ Utilidades para JWT, logging y validaciones
✅ Base de datos con todos los modelos creados
✅ Servidor funcionando en puerto 3000
✅ Health check endpoint disponible
✅ Listo para agregar rutas de autenticación en FASE 2

## NOTAS IMPORTANTES

- NO modifiques el schema de Prisma, está completo y final
- Los JWT secrets en .env deben ser diferentes entre sí
- Usa PostgreSQL 14+ para mejor compatibilidad
- El servidor debe responder en /health antes de continuar