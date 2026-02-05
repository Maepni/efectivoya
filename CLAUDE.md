# EfectivoYa - Contexto del Proyecto

**Última actualización:** 05 Feb 2026

## Resumen

**EfectivoYa** es una billetera digital fintech para Perú. Tagline: "Tu Dinero Al Instante"

| Funcionalidad | Detalle |
|---------------|---------|
| Recargas | Depósito con boucher + comisión % configurable |
| Retiros | A cuentas propias, sin comisión |
| Operaciones | Todas requieren aprobación de admin |
| Plataformas | Android, iOS, Web PWA |

---

## Estado del Desarrollo

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1. Backend Base | ✅ | Express + TypeScript + Prisma + PostgreSQL |
| 2. Autenticación | ✅ | Registro, login JWT, OTP email, referidos |
| 3. Bancos usuario | ✅ | CRUD de cuentas bancarias del usuario |
| 4. Recargas | ⏳ | **PRÓXIMO** - Sistema de depósitos con boucher |
| 5. Retiros | ⏳ | Sistema de retiros a cuentas |
| 6. Panel admin | ⏳ | Gestión y aprobación de operaciones |
| 7. Chat + Push | ⏳ | Soporte y notificaciones |
| 8. Frontend | ⏳ | React Native + Expo |

---

## Stack Tecnológico

**Backend:** Node.js v18+ · Express · TypeScript · Prisma · PostgreSQL · JWT · bcrypt · Nodemailer

**Frontend (pendiente):** React Native · Expo SDK 52+ · expo-router · Zustand

**Infra (pendiente):** DigitalOcean · Nginx · PM2 · Cloudinary

---

## Estructura del Backend

```
efectivoya-backend/src/
├── controllers/     # auth, userBanks
├── middleware/      # auth, validation, errorHandler, rateLimit
├── routes/          # auth, userBanks
├── services/        # otp, email, auditLog
├── utils/           # jwt, logger, validators, maskData
├── types/           # index.d.ts
├── app.ts           # Config Express
└── server.ts        # Entry point
```

---

## API Implementada

### Auth (`/api/auth`)
| Método | Ruta | Auth |
|--------|------|------|
| POST | `/register` | No |
| POST | `/verify-email` | No |
| POST | `/login` | No |
| POST | `/refresh` | No |
| POST | `/resend-otp` | No |
| POST | `/forgot-password` | No |
| POST | `/reset-password` | No |
| POST | `/logout` | ✅ |
| GET | `/profile` | ✅ |

**Rate limiting:** Login 5/15min · Registro 3/hora · Reset 3/hora

### User Banks (`/api/user-banks`)
| Método | Ruta | Auth |
|--------|------|------|
| GET | `/` | ✅ |
| GET | `/stats` | ✅ |
| GET | `/:id` | ✅ |
| POST | `/` | ✅ |
| PUT | `/:id` | ✅ |
| DELETE | `/:id` | ✅ |

**Bancos:** BCP, Interbank, Scotiabank, BBVA
**Validaciones:** Cuenta (min 13 dígitos) · CCI (exactamente 20 dígitos)

---

## Modelo de Datos (Prisma)

**Tablas principales:**
- `users` - Usuarios con saldo, referidos, verificación email
- `user_banks` - Cuentas bancarias del usuario
- `recargas` - Depósitos pendientes de aprobar
- `retiros` - Retiros pendientes de aprobar
- `admins` - Panel administrativo
- `configuracion` - Comisiones, límites, mensajes
- `audit_logs` - Registro de acciones
- `referidos` - Sistema de referidos con bonos

**Campos de User:** id, email, password_hash, nombres, apellidos, dni (único, 8 dígitos), whatsapp, saldo_actual, email_verificado, codigo_referido, referido_por

---

## Convenciones de Código

| Elemento | Formato | Ejemplo |
|----------|---------|---------|
| Archivos | kebab-case.ts | `auth.controller.ts` |
| Clases | PascalCase | `JWTUtil` |
| Funciones/vars | camelCase | `validateRequest` |
| Constantes | UPPER_SNAKE | `JWT_SECRET` |
| Tablas BD | snake_case | `user_banks` |

**Respuestas API:**
```typescript
{ success: true, data: {...}, message?: string }  // OK
{ success: false, message: string, errors?: [...] }  // Error
```

**Commits:** `feat:` `fix:` `refactor:` `docs:`

---

## Comandos

```bash
cd efectivoya-backend
npm run dev              # Desarrollo con hot reload
npm run build            # Compilar TypeScript
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:studio    # GUI de base de datos
```

---

## Variables de Entorno Requeridas

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/efectivoya_db
JWT_SECRET=min-32-caracteres
JWT_REFRESH_SECRET=otro-min-32-caracteres
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8081
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password
SMTP_FROM_NAME=EfectivoYa
SMTP_FROM_EMAIL=noreply@efectivoya.com
```

---

## TODOs Inmediatos

- [ ] **Fase 4:** Implementar sistema de recargas con boucher
  - Subida de imagen (Cloudinary)
  - Validación de número de operación único
  - Cálculo de comisión según configuración
  - Estado pendiente → aprobado/rechazado

---

## Tests Pendientes

- [ ] Endpoints de autenticación (registro, login, OTP)
- [ ] Validadores (email, DNI, password, WhatsApp, CCI)
- [ ] Middleware de auth y rate limiting
- [ ] Flujo completo de referidos

---

## Bugs Conocidos

*Ninguno actualmente*

---

## Documentación Adicional

| Archivo | Contenido |
|---------|-----------|
| `docs/fase1.md` | Instrucciones Fase 1 (Backend base) |
| `docs/fase2.md` | Instrucciones Fase 2 (Auth) |
| `docs/fase3.md` | Instrucciones Fase 3 (User Banks) |
| `docs/modelo-datos.md` | Schema Prisma detallado |
| `docs/flujos-negocio.md` | Flujos de recarga, retiro, referidos |
| `docs/reglas-negocio.md` | Validaciones, límites, comisiones |
| `docs/guia-ui.md` | Paleta de colores, tipografía |
