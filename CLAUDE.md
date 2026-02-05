# EfectivoYa - Contexto del Proyecto

**Última actualización:** 04 Feb 2026

## Resumen

**EfectivoYa** es una billetera digital fintech para Perú.

| Aspecto | Detalle |
|---------|---------|
| Funcionalidad principal | Recargar saldo (con comisión %), retirar a cuentas propias (sin comisión) |
| Flujo de operaciones | Todas requieren aprobación de admin |
| Tagline | "Tu Dinero Al Instante" |
| Plataformas | Android, iOS, Web PWA |

---

## Estado del Desarrollo

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1. Backend Base | ✅ | Express + TypeScript + Prisma + PostgreSQL |
| 2. Autenticación | ✅ | Registro, login JWT, OTP email, referidos |
| 3. Bancos usuario | ⏳ | CRUD de cuentas bancarias |
| 4. Recargas | ⏳ | Sistema de depósitos con boucher |
| 5. Retiros | ⏳ | Sistema de retiros a cuentas |
| 6. Panel admin | ⏳ | Gestión de operaciones |
| 7. Chat + Push | ⏳ | Soporte y notificaciones |
| 8. Frontend | ⏳ | React Native + Expo |
| 9. Deploy | ⏳ | Testing + producción |

---

## Stack Tecnológico

**Backend (activo):** Node.js v18+ · Express · TypeScript · Prisma · PostgreSQL · JWT · bcrypt · Nodemailer

**Frontend (pendiente):** React Native · Expo SDK 52+ · expo-router · Zustand · React Native Paper

**Infra (pendiente):** DigitalOcean · Nginx · PM2 · Cloudinary · Vercel

---

## Estructura del Proyecto

```
efectivoya/
├── CLAUDE.md
├── docs/
│   ├── fase1.md, fase2.md      # Instrucciones por fase
│   ├── modelo-datos.md         # Schema Prisma
│   ├── flujos-negocio.md       # Flujos de usuario/admin
│   ├── reglas-negocio.md       # Validaciones y límites
│   └── guia-ui.md              # Colores y estilos
└── efectivoya-backend/
    ├── src/
    │   ├── controllers/        # auth.controller.ts
    │   ├── middleware/         # auth, validation, errorHandler, rateLimit
    │   ├── routes/             # auth.routes.ts
    │   ├── services/           # otp, email, auditLog
    │   ├── utils/              # jwt, logger, validators
    │   ├── types/              # index.d.ts
    │   ├── app.ts              # Config Express
    │   └── server.ts           # Entry point
    └── prisma/
        └── schema.prisma
```

---

## API Endpoints Implementados

### Autenticación (`/api/auth`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/register` | Registro + envía OTP | No |
| POST | `/verify-email` | Verificar OTP | No |
| POST | `/login` | Login → tokens JWT | No |
| POST | `/refresh` | Renovar access token | No |
| POST | `/resend-otp` | Reenviar OTP | No |
| POST | `/forgot-password` | Solicitar reset | No |
| POST | `/reset-password` | Cambiar contraseña | No |
| POST | `/logout` | Cerrar sesión | ✅ |
| GET | `/profile` | Obtener perfil | ✅ |

**Rate limiting:** Login 5/15min · Registro 3/hora · Reset 3/hora

---

## Convenciones de Código

| Elemento | Formato | Ejemplo |
|----------|---------|---------|
| Archivos | kebab-case.ts | `auth.controller.ts` |
| Clases | PascalCase | `JWTUtil` |
| Funciones/vars | camelCase | `validateRequest` |
| Constantes | UPPER_SNAKE | `JWT_SECRET` |
| Tablas BD | snake_case plural | `users`, `user_banks` |

**Respuestas API:**
```typescript
{ success: true, data: {...}, message?: string }  // OK
{ success: false, message: string, errors?: [...] }  // Error
```

**Commits:** `feat:` `fix:` `refactor:` `docs:`

---

## Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/efectivoya_db

# JWT
JWT_SECRET=min-32-caracteres-seguro
JWT_REFRESH_SECRET=otro-min-32-caracteres

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8081

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=app-password-de-google
SMTP_FROM_NAME=EfectivoYa
SMTP_FROM_EMAIL=noreply@efectivoya.com

# Cloudinary (fase posterior)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## TODOs Inmediatos

- [ ] Configurar PostgreSQL local + DATABASE_URL
- [ ] Ejecutar `npm run prisma:migrate`
- [ ] Configurar SMTP en `.env` (Gmail app password)
- [ ] **Fase 3:** CRUD de bancos del usuario

---

## Tests Pendientes

- [ ] Endpoints de autenticación (registro, login, OTP)
- [ ] Validadores (email, DNI, password, WhatsApp, CCI)
- [ ] Middleware de auth
- [ ] Rate limiting
- [ ] Flujo completo de referidos

---

## Bugs Conocidos

*Ninguno actualmente*

---

## Comandos Útiles

```bash
cd efectivoya-backend
npm run dev              # Desarrollo con hot reload
npm run build            # Compilar TypeScript
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:studio    # GUI de base de datos
```

---

## Documentación Detallada

| Archivo | Contenido |
|---------|-----------|
| `docs/modelo-datos.md` | Schema Prisma completo |
| `docs/flujos-negocio.md` | Flujos de recarga, retiro, referidos |
| `docs/reglas-negocio.md` | Validaciones, límites, comisiones |
| `docs/guia-ui.md` | Paleta de colores, tipografía |
| `docs/fase1.md` | Instrucciones Fase 1 |
| `docs/fase2.md` | Instrucciones Fase 2 |
