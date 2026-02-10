# EfectivoYa - Contexto del Proyecto

**Actualizado:** 10 Feb 2026

## Resumen

Billetera digital fintech para Peru. "Tu Dinero Al Instante."

- **Recargas:** Usuario sube boucher, admin aprueba, saldo se acredita menos comision (5%)
- **Retiros:** A cuentas propias del usuario, sin comision. Atomico con `$transaction`
- **Referidos:** Bono S/. 10 para ambos en primera recarga del referido
- **Alertas automaticas:** >3 recargas/hora, boucher duplicado, retiro >80% saldo en 24h
- **Comprobantes PDF:** On-the-fly con PDFKit + Cloudinary
- **Chat soporte:** Socket.io + FCM push notifications
- **Panel admin:** Dashboard, gestion completa (users/config/alertas/logs/contenido/admins/recargas/retiros/chats)

## Estado

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1-7. Backend | Done | API REST completa (18 rutas, 17 controllers) + Socket.io + FCM |
| 8. Frontend base | Done | Auth + Dashboard + Tab navigation |
| 9. Frontend pantallas | Done | Recargas, Retiros, Chat, Perfil — todas funcionales |

**Pendiente:** Panel admin web. Tests automatizados. Editar perfil (backend sin endpoint aun).

## Stack

**Backend:** Node.js 18+, Express 4, TypeScript 5.7, Prisma 5, PostgreSQL, JWT, bcryptjs, Nodemailer, Multer, Cloudinary, PDFKit, Socket.io 4.8, Firebase Admin

**Frontend:** Expo SDK 54, expo-router 6, React Native 0.81, Zustand 5, Axios, socket.io-client, TypeScript 5.9

## Estructura

```
efectivoya-backend/src/
├── controllers/   # 17 controladores (auth, recargas, retiros, chat, admin*, userBanks, etc)
├── middleware/     # auth, adminAuth, upload, validation, errorHandler, rateLimit
├── routes/         # 18 archivos de rutas
├── services/       # 9: otp, email, auditLog, cloudinary, pdf, referidos, alertas, socket, fcm
├── utils/          # jwt, logger, validators, maskData, formatters
├── app.ts          # Express config + 18 rutas registradas
└── server.ts       # http.createServer + Socket.io

efectivoya-app/
├── app/
│   ├── _layout.tsx            # Root: auth guard con isAuthenticated (Zustand)
│   ├── (auth)/                # login, register, verify-otp
│   └── (tabs)/                # index(Dashboard), recargas, retiros, chat, perfil
└── src/
    ├── components/            # Button, Input, Card, LoadingScreen, OperacionCard, BancoCard, ConfirmDialog
    ├── services/              # api, auth, socket, notifications, recargas, retiros, bancos, chat
    ├── store/                 # authStore (Zustand), useStore (global)
    ├── types/                 # 15 interfaces TS
    ├── constants/             # colors (tema dark), layout (spacing, fonts)
    └── config/                # api.ts (URL config dev/prod)
```

## Convenciones

- **Archivos:** `camelCase.tipo.ts` (ej. `adminAuth.controller.ts`)
- **Respuestas API:** `{ success: true/false, data?: {...}, message?: string }`
- **Backend data wrappers:** Profile retorna `{ data: { user: {...} } }`, Dashboard retorna `{ data: { saldo, ... } }`
- **Params no usados:** Prefijar con `_` (ej. `_req`)
- **PrismaClient:** Cada controller instancia su propio `new PrismaClient()`
- **Schema fields:** Espanol snake_case (`remitente_tipo`, `monto_depositado`). Campos `nombres`/`apellidos` (plural)
- **Commits:** `feat:` | `fix:` | `refactor:` | `docs:`
- **Estado frontend:** Zustand (NO Context API). `authStore` para auth, `useStore` para global
- **onDelete Cascade:** Solo UserBank→User y ChatMensaje→ChatSoporte. Resto sin cascade

## Comandos

```bash
# Backend (efectivoya-backend/)
npm run dev              # ts-node-dev, puerto 3000
npm run build            # tsc — SIEMPRE verificar antes de commit
npm run prisma:seed      # Seed: admin + config + contenido

# Frontend (efectivoya-app/)
npx expo start --web     # Puerto 8081
npx tsc --noEmit         # Verificar TypeScript
npm install --legacy-peer-deps  # REQUERIDO por conflicto react 19.1 vs 19.2
```

## Seed

- **Admin:** `admin@efectivoya.com` / `Admin123!@#` → POST `/api/admin/auth/login`
- **Config:** Comision 5%, limites S/. 1,000 - 100,000, bono referido S/. 10

## Gotchas Criticos

### Backend
- `server.ts` usa `http.createServer(app)` (NO `app.listen()`) para Socket.io
- `FCMService.isConfigured()` guard — funciona sin Firebase
- Hard delete usuario: `$transaction` → ChatSoporte→Referido→AlertaSeguridad→AuditLog→Retiro→Recarga→SET NULL referidos→User
- Specs de fases (`docs/faseN.md`) pueden diferir del schema real. **Siempre verificar contra `schema.prisma`**

### Backend - Respuestas incompletas de auth
- `POST /auth/login` retorna user SIN: `email_verificado`, `is_active`
- `POST /auth/verify-email` retorna user SIN: `email_verificado`, `is_active`, `dni`, `whatsapp`
- `GET /auth/profile` es el UNICO que retorna todos los campos del user
- `GET /auth/profile` retorna `{ data: { user: {...} } }` (user anidado en data.user)

### Frontend
- `saldo_actual` llega como string (Prisma Decimal) — usar `Number()` antes de `.toFixed()`
- Perfil usuario: `/api/auth/profile` (NO `/api/user/profile`)
- Register: campos `nombres`/`apellidos` (plural), `codigo_referido_usado` (NO `codigo_referido`)
- Verify OTP: `{ userId, otp }` (NO `{ email, otp }`)
- `authStore.refreshUser()` extrae `response.data.user` (no `response.data` directo) porque backend wrappea el user
- `authStore.logout()` usa `try-finally` para garantizar `clearAuth()` siempre ejecute
- `expo-notifications` SDK 54: requiere `shouldShowBanner` + `shouldShowList`

### Safe Area / Edge-to-Edge (Android)
- `app.json` tiene `edgeToEdgeEnabled: true` — la app renderiza borde a borde
- `react-native-safe-area-context` v5.6 esta instalado y en uso
- Tab bar (`_layout.tsx`): usa `useSafeAreaInsets()` para sumar `insets.bottom` a height/paddingBottom
- Modales fullscreen (recargas, retiros, perfil): ScrollViews usan `contentContainerStyle={{ paddingBottom: insets.bottom }}`
- Chat no necesita ajuste — el inputContainer queda dentro de la zona del tab screen
- En web `insets.bottom = 0`, sin impacto

## Bugs Conocidos

- **Editar perfil:** Boton existe en UI pero backend no tiene endpoint de update profile (muestra "proximamente")

## TODOs

- **Panel admin web:** No existe aun
- **Backend:** Endpoint para actualizar perfil de usuario
- **Tests:** 0 escritos. Plan detallado en `docs/tests-pendientes.md`. Framework: Jest + Supertest

## Docs

| Archivo | Contenido |
|---------|-----------|
| `docs/api-endpoints.md` | Endpoints completos (usuario + admin) |
| `docs/modelo-datos.md` | Schema Prisma (14 modelos, 6 enums) |
| `docs/flujos-negocio.md` | Flujos recarga, retiro, referidos |
| `docs/reglas-negocio.md` | Validaciones, limites, comisiones |
| `docs/guia-ui.md` | Paleta colores (tema dark), tipografia |
| `docs/fase9.md` | Spec pantallas Recargas + Retiros |
| `docs/chatperfil.md` | Spec pantallas Chat + Perfil |
| `docs/tests-pendientes.md` | Plan de tests por modulo (auth, validators, middleware, recargas, retiros, referidos, alertas, admin, chat, push) |
