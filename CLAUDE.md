# EfectivoYa - Contexto del Proyecto

**Última actualización:** 04 Feb 2026

## Resumen

**EfectivoYa** es una app fintech de billetera digital para Perú.

**Funcionalidades:**
- Recargar saldo via depósito bancario (con comisión %)
- Retirar saldo a cuentas propias (sin comisión)
- Todas las operaciones requieren aprobación de admin

**Tagline:** "Tu Dinero Al Instante"

**Plataformas:** Android, iOS, Web PWA

---

## Estado del Desarrollo

### Fase 1: Backend Base ✅ COMPLETADA
- Proyecto Node.js + Express + TypeScript configurado
- Prisma + PostgreSQL con schema completo
- Middlewares de seguridad (helmet, cors, auth)
- Utilidades: JWT, logger, validators
- Health check funcionando en puerto 3000

### Fase 2: Autenticación ✅ COMPLETADA
- Registro con validaciones robustas
- Verificación de email con OTP (6 dígitos, 10 min expiración)
- Login con JWT (access 15min + refresh 7d)
- Recuperación de contraseña
- Sistema de referidos (EFECTIVO-XXXXXX)
- Logs de auditoría automáticos
- Envío de emails HTML con Nodemailer
- Rate limiting en rutas críticas

### Próximas Fases
- **Fase 3:** Gestión de bancos del usuario (CRUD)
- **Fase 4:** Sistema de recargas
- **Fase 5:** Sistema de retiros
- **Fase 6:** Panel administrativo
- **Fase 7:** Chat soporte + Push notifications
- **Fase 8:** Frontend React Native + Expo
- **Fase 9:** Testing + Deployment

---

## Stack Tecnológico

### Backend
```
Node.js v18+ | Express.js | TypeScript | Prisma | PostgreSQL
JWT (access 15min + refresh 7d) | bcrypt (10 rounds)
Multer + Cloudinary | pdfkit | Nodemailer | Socket.io | FCM
```

### Frontend (pendiente)
```
React Native | Expo SDK 52+ | expo-router
Zustand | React Native Paper | expo-local-authentication
expo-secure-store | socket.io-client | expo-notifications
```

### Infraestructura
```
DigitalOcean VPS | Nginx | PM2 | Let's Encrypt
PostgreSQL | Cloudinary | Vercel (web) | GitHub
```

---

## Estructura del Proyecto

```
efectivoya/
├── CLAUDE.md                    # Este archivo
├── docs/
│   ├── fase1.md                 # Instrucciones Fase 1
│   ├── modelo-datos.md          # Schema Prisma detallado
│   ├── flujos-negocio.md        # Flujos de usuario/admin
│   ├── reglas-negocio.md        # Validaciones y límites
│   └── guia-ui.md               # Colores, tipografía, estilos
└── efectivoya-backend/
    ├── src/
    │   ├── controllers/         # Lógica de negocio
    │   ├── middleware/          # auth, validation, errorHandler
    │   ├── routes/              # Definición de rutas
    │   ├── services/            # email, pdf, cloudinary, etc.
    │   ├── utils/               # jwt, logger, validators
    │   ├── types/               # TypeScript types
    │   ├── app.ts               # Config Express
    │   └── server.ts            # Entry point
    └── prisma/
        └── schema.prisma        # Modelo de datos completo
```

---

## Convenciones de Código

### Nomenclatura
- **Archivos:** `kebab-case.ts` (ej: `auth.controller.ts`)
- **Clases:** `PascalCase` (ej: `JWTUtil`)
- **Funciones/variables:** `camelCase` (ej: `validateRequest`)
- **Constantes:** `UPPER_SNAKE_CASE` (ej: `JWT_SECRET`)
- **Tablas BD:** `snake_case` plural (ej: `users`, `user_banks`)

### Respuestas API
```typescript
// Éxito
{ success: true, data: {...}, message?: string }

// Error
{ success: false, message: string, errors?: [...] }
```

### Commits
```
feat: nueva funcionalidad
fix: corrección de bug
refactor: mejora de código
docs: documentación
```

---

## Variables de Entorno

```env
# Requeridas
DATABASE_URL=postgresql://user:pass@localhost:5432/efectivoya_db
JWT_SECRET=min-32-caracteres
JWT_REFRESH_SECRET=otro-min-32-caracteres
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8081

# Fases posteriores
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

---

## TODOs Inmediatos

- [ ] Configurar PostgreSQL local y DATABASE_URL
- [ ] Ejecutar `npm run prisma:migrate` para crear tablas
- [ ] Configurar variables SMTP en .env para envío de emails
- [ ] Implementar Fase 3: Gestión de bancos del usuario (CRUD)

---

## Bugs Conocidos

*Ninguno actualmente*

---

## Tests Pendientes

- [ ] Health check endpoint
- [ ] Validadores (email, DNI, password, WhatsApp, CCI)
- [ ] Middleware de autenticación
- [ ] Generación de tokens JWT

---

## Comandos Útiles

```bash
# Backend
cd efectivoya-backend
npm run dev              # Desarrollo
npm run build            # Compilar
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:studio    # GUI de base de datos
```

---

## Documentación Adicional

Para información detallada, consultar:
- `docs/modelo-datos.md` - Schema completo de Prisma
- `docs/flujos-negocio.md` - Flujos de recarga, retiro, referidos
- `docs/reglas-negocio.md` - Validaciones y límites de negocio
- `docs/guia-ui.md` - Paleta de colores y estilos
- `docs/fase1.md` - Instrucciones de implementación Fase 1
