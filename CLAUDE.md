# EfectivoYa - Contexto del Proyecto

**Actualizado:** 06 Feb 2026

## Resumen

Billetera digital fintech para Peru. "Tu Dinero Al Instante."

- **Recargas:** Usuario sube boucher de deposito bancario, admin aprueba, saldo se acredita menos comision (5% configurable)
- **Retiros:** A cuentas propias del usuario, sin comision. Saldo se descuenta solo al aprobar (atomico con `$transaction`)
- **Referidos:** Bono S/. 10 para ambos en primera recarga del referido
- **Alertas automaticas:** >3 recargas/hora, boucher duplicado, retiro >80% saldo dentro de 24h de recargar
- **Comprobantes PDF:** Generados on-the-fly con PDFKit (Cloudinary solo como backup, no para servir)
- **Panel admin:** Dashboard metricas, gestion usuarios/config/alertas/logs/contenido/admins

## Estado del Desarrollo

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1. Backend Base | ✅ | Express + TypeScript + Prisma + PostgreSQL |
| 2. Autenticacion | ✅ | Registro, login JWT, OTP email, referidos |
| 3. Bancos usuario | ✅ | CRUD de cuentas bancarias |
| 4. Recargas | ✅ | Depositos con boucher, PDF, alertas |
| 5. Retiros + Dashboard | ✅ | Retiros, dashboard usuario, referidos |
| 6. Panel admin | ✅ | Dashboard, usuarios, config, alertas, logs, contenido, admins |
| 7. Chat + Push | ⏳ | **PROXIMO** - Soporte y notificaciones |
| 8. Frontend | ⏳ | React Native + Expo |

## Stack

**Backend:** Node.js 18+ · Express 4 · TypeScript 5.7 (strict) · Prisma 5 · PostgreSQL · JWT · bcryptjs · Nodemailer · Multer · Cloudinary · PDFKit · uuid

**Frontend (pendiente):** React Native · Expo SDK 52+ · expo-router · Zustand

**tsconfig:** target ES2022, strict, noUnusedLocals, noUnusedParameters, noImplicitReturns

## Estructura Backend

```
efectivoya-backend/src/
├── controllers/   # 15 controladores (auth, adminAuth, adminDashboard, adminUsers,
│                  #   adminConfig, adminAlertas, adminLogs, adminContenido, adminAdmins,
│                  #   userBanks, recargas, adminRecargas, retiros, adminRetiros, userDashboard)
├── middleware/    # 6: auth, adminAuth, upload, validation, errorHandler, rateLimit
├── routes/        # 15 archivos de rutas (mismos nombres que controllers)
├── services/      # 7: otp, email, auditLog, cloudinary, pdf, referidos, alertas
├── utils/         # 5: jwt, logger, validators, maskData, formatters
├── types/         # index.d.ts (AuthRequest, AdminRequest, JWTPayload, RefreshTokenPayload)
├── app.ts         # Express config + 15 grupos de rutas
└── server.ts
prisma/
├── schema.prisma  # 14 modelos, 6 enums
└── seed.ts
```

## API - Resumen de Rutas

**Usuario:** `/api/auth` (9 endpoints) · `/api/user-banks` (5) · `/api/recargas` (5) · `/api/retiros` (3) · `/api/user` (3)

**Admin:** `/api/admin/auth` (3) · `/api/admin/dashboard` (3) · `/api/admin/users` (4) · `/api/admin/config` (3) · `/api/admin/alertas` (4) · `/api/admin/logs` (3) · `/api/admin/contenido` (10) · `/api/admin/admins` (4, solo super_admin) · `/api/admin/recargas` (6) · `/api/admin/retiros` (6)

> Detalle completo en `docs/api-endpoints.md`

## Convenciones de Codigo

| Elemento | Formato | Ejemplo |
|----------|---------|---------|
| Archivos | camelCase.tipo.ts | `adminAuth.controller.ts` |
| Clases | PascalCase | `CloudinaryService` |
| Funciones/vars | camelCase | `formatCurrency` |
| Constantes | UPPER_SNAKE | `MAX_FILE_SIZE` |
| Tablas BD | snake_case | `alertas_seguridad` |

**Respuestas API:** `{ success: true, data: {...}, message?: string }` / `{ success: false, message: string, errors?: [...] }`

**Commits:** `feat:` · `fix:` · `refactor:` · `docs:`

**Parametros no usados:** Prefijar con `_` (ej. `_req`) por `noUnusedParameters`.

**PrismaClient:** Cada controller instancia su propio `new PrismaClient()`.

## Comandos

```bash
cd efectivoya-backend
npm run dev              # Desarrollo (ts-node-dev)
npm run build            # Compilar (tsc) — SIEMPRE verificar antes de commit
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:migrate   # Migraciones
npm run prisma:seed      # Datos iniciales
npm run prisma:studio    # GUI BD
```

## Seed Data

- **Admin:** `admin@efectivoya.com` / `Admin123!@#` (rol: `super_admin`)
- **Config:** Comision 5%, limites S/. 1,000 - 100,000, bono S/. 10
- **Bancos:** BCP, Interbank, Scotiabank, BBVA

## Variables de Entorno

Ver `.env.example`. Requiere: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_*`, `CLOUDINARY_*`.

## Bugs Conocidos

*Ninguno actualmente*

## TODOs

### Fase 7: Chat + Push (proximo)
- [ ] Chat de soporte entre usuario y admin (modelo `ChatSoporte` + `ChatMensaje` ya existen en schema)
- [ ] Notificaciones push (campo `push_token` ya existe en User)

### Tests
No hay tests automatizados. Ver `docs/tests-pendientes.md` para el plan completo de testing.

## Docs Adicionales

| Archivo | Contenido |
|---------|-----------|
| `docs/api-endpoints.md` | Todos los endpoints con metodo, ruta y descripcion |
| `docs/tests-pendientes.md` | Plan completo de tests por modulo |
| `docs/fase1.md` - `docs/fase6.md` | Specs detallados por fase |
| `docs/modelo-datos.md` | Schema Prisma detallado (14 modelos) |
| `docs/flujos-negocio.md` | Flujos de recarga, retiro, referidos |
| `docs/reglas-negocio.md` | Validaciones, limites, comisiones |
| `docs/guia-ui.md` | Paleta de colores, tipografia |
