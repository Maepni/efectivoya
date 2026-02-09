# EfectivoYa - Contexto del Proyecto

**Actualizado:** 09 Feb 2026

## Resumen

Billetera digital fintech para Peru. "Tu Dinero Al Instante."

- **Recargas:** Usuario sube boucher de deposito bancario, admin aprueba, saldo se acredita menos comision (5% configurable)
- **Retiros:** A cuentas propias del usuario, sin comision. Saldo se descuenta al aprobar (atomico con `$transaction`)
- **Referidos:** Bono S/. 10 para ambos en primera recarga del referido
- **Alertas automaticas:** >3 recargas/hora, boucher duplicado, retiro >80% saldo dentro de 24h
- **Comprobantes PDF:** On-the-fly con PDFKit
- **Panel admin:** Dashboard, gestion usuarios/config/alertas/logs/contenido/admins
- **Chat soporte:** Socket.io + FCM push notifications
- **App movil:** Auth completa (login, registro, OTP), dashboard con saldo/stats, tab navigation

## Estado

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1-7. Backend | Done | API REST completa + Socket.io + FCM |
| 8. Frontend base | Done | Auth + Dashboard + Tabs con placeholders |

**Pendiente:** Pantallas completas de Recargas, Retiros, Chat, Perfil. Panel admin web. Tests.

## Stack

**Backend:** Node.js 18+, Express 4, TypeScript 5.7, Prisma 5, PostgreSQL, JWT, bcryptjs, Nodemailer, Multer, Cloudinary, PDFKit, Socket.io 4.8, Firebase Admin

**Frontend:** Expo SDK 54, expo-router 6, React Native 0.81, Zustand 5, Axios, socket.io-client, TypeScript 5.9

## Estructura

```
efectivoya-backend/src/
├── controllers/   # 17 controladores
├── middleware/     # 6: auth, adminAuth, upload, validation, errorHandler, rateLimit
├── routes/         # 18 archivos de rutas
├── services/       # 9: otp, email, auditLog, cloudinary, pdf, referidos, alertas, socket, fcm
├── utils/          # 5: jwt, logger, validators, maskData, formatters
├── types/          # index.d.ts
├── app.ts          # Express config + rutas
└── server.ts       # http.createServer + Socket.io

efectivoya-app/
├── app/            # expo-router: _layout, (auth)/{login,register,verify-otp}, (tabs)/{5 screens}
└── src/            # types, constants, config, services, store, components
```

## Prisma Schema

14 modelos, 6 enums. Ver `docs/modelo-datos.md` para detalle.

**Campos User criticos:** `nombres` (NO nombre), `apellidos` (NO apellido), `saldo_actual` (Decimal, llega como string al frontend), `email_verificado`, `is_active`, `codigo_referido`

**onDelete Cascade:** Solo `UserBank→User` y `ChatMensaje→ChatSoporte`.

## API - Rutas Clave

| Grupo | Base | Endpoints |
|-------|------|-----------|
| Auth usuario | `/api/auth` | login, register, verify-email, resend-otp, refresh-token, **profile**, logout, etc (9) |
| Dashboard | `/api/user` | dashboard, referido, referidos/lista (3) |
| Admin auth | `/api/admin/auth` | login, profile, logout (3) |
| Admin users | `/api/admin/users` | list, stats, detail, **DELETE /:id**, toggle-status (5) |

> Detalle completo: `docs/api-endpoints.md`

## Convenciones

- **Archivos:** `camelCase.tipo.ts` (ej. `adminAuth.controller.ts`)
- **Respuestas API:** `{ success: true/false, data?: {...}, message?: string }`
- **Params no usados:** Prefijar con `_` (ej. `_req`)
- **PrismaClient:** Cada controller instancia su propio `new PrismaClient()`
- **Schema fields:** Espanol snake_case (`remitente_tipo`, `monto_depositado`)
- **Commits:** `feat:` | `fix:` | `refactor:` | `docs:`

## Comandos

```bash
# Backend (efectivoya-backend/)
npm run dev              # ts-node-dev, puerto 3000
npm run build            # tsc — SIEMPRE verificar antes de commit
npm run prisma:seed      # Seed: admin + config + contenido

# Frontend (efectivoya-app/)
npx expo start --web     # Puerto 8081
npx tsc --noEmit         # Verificar TypeScript
```

## Seed

- **Admin:** `admin@efectivoya.com` / `Admin123!@#` → POST `/api/admin/auth/login` (NO /api/auth/login)
- **Config:** Comision 5%, limites S/. 1,000 - 100,000, bono referido S/. 10

## Gotchas Criticos

**Backend:**
- `server.ts` usa `http.createServer(app)` (NO `app.listen()`) para Socket.io
- `FCMService.isConfigured()` guard — funciona sin Firebase
- Hard delete usuario: `$transaction` en orden ChatSoporte→Referido→AlertaSeguridad→AuditLog→Retiro→Recarga→SET NULL referidos→User
- Specs de fases (docs/faseN.md) difieren del schema real. **Siempre verificar contra schema.prisma**

**Frontend:**
- Perfil usuario: `/api/auth/profile` (NO `/api/user/profile`)
- Register: campos `nombres`/`apellidos` (plural), `codigo_referido_usado`
- Verify OTP: `{ userId, otp }` (NO `{ email, otp }`)
- `saldo_actual` llega como string (Prisma Decimal) — usar `Number()` antes de `.toFixed()`
- `expo-notifications` SDK 54: requiere `shouldShowBanner` + `shouldShowList`
- `--legacy-peer-deps` necesario para instalar paquetes (conflicto react 19.1 vs 19.2)

## Bugs Conocidos

*Ninguno actualmente*

## TODOs

- **Frontend:** Pantallas Recargas, Retiros, Chat (Socket.io), Perfil editable
- **Panel admin web:** No existe aun
- **Tests:** 0 escritos. Plan: `docs/tests-pendientes.md`. Framework: Jest + Supertest

## Docs

| Archivo | Contenido |
|---------|-----------|
| `docs/api-endpoints.md` | Endpoints completos |
| `docs/tests-pendientes.md` | Plan de tests por modulo |
| `docs/fase1.md` - `docs/fase8.md` | Specs por fase |
| `docs/modelo-datos.md` | Schema Prisma (14 modelos) |
| `docs/flujos-negocio.md` | Flujos recarga, retiro, referidos |
| `docs/reglas-negocio.md` | Validaciones, limites, comisiones |
| `docs/guia-ui.md` | Paleta colores, tipografia |
