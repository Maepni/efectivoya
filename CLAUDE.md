# EfectivoYa

**Actualizado:** 10 Feb 2026 | Billetera digital fintech para Peru — "Tu Dinero Al Instante."

## Funcionalidades activas

- **Recargas:** Usuario sube boucher, admin aprueba, saldo se acredita menos comision (5%)
- **Retiros:** A cuentas propias del usuario, sin comision. Atomico con `$transaction`
- **Referidos:** Bono S/. 10 para ambos en primera recarga del referido
- **Alertas automaticas:** >3 recargas/hora, boucher duplicado, retiro >80% saldo en 24h
- **Comprobantes PDF:** On-the-fly con PDFKit + Cloudinary
- **Chat soporte:** Socket.io bidireccional (usuario + admin) + FCM push
- **Videos instructivos:** Videos propios por banco subidos a Cloudinary (MP4/MOV/WEBM, max 50MB). Gestionados desde admin config. Reproduccion nativa con `expo-video`
- **Panel admin:** Dashboard, recargas, retiros, chats, clientes, alertas, config (incluye gestion de videos), logs, contenido, admins

## Stack

**Backend:** Node.js 18+, Express 4, TypeScript 5.7, Prisma 5, PostgreSQL, JWT (15m access / 7d refresh), bcryptjs, Nodemailer, Multer, Cloudinary (imagenes + videos), PDFKit, Socket.io 4.8, Firebase Admin

**Frontend:** Expo SDK 54, expo-router 6, React Native 0.81, Zustand 5, Axios, socket.io-client, expo-video, TypeScript 5.9

## Estructura

```
efectivoya-backend/src/
├── controllers/   # 17 (auth, chat, recargas, retiros, userBanks, userDashboard, notifications, admin*)
├── middleware/     # 6 (auth, adminAuth, upload[boucher+video], validation, errorHandler, rateLimit)
├── routes/        # 18 (7 user + 11 admin)
├── services/      # 9 (otp, email, auditLog, cloudinary, pdf, referidos, alertas, socket, fcm)
├── utils/         # jwt, logger, validators, maskData, formatters
├── app.ts         # Express + 18 rutas registradas
└── server.ts      # http.createServer + Socket.io init

efectivoya-app/
├── app/
│   ├── _layout.tsx            # Root: auth guard
│   ├── (auth)/                # login, register, verify-otp
│   ├── (tabs)/                # Dashboard, recargas, retiros, chat, perfil
│   └── (admin)/               # login, dashboard, recargas/[id], retiros/[id], chats/[id], clientes/[id], alertas, config
└── src/
    ├── components/            # 7 shared + 10 admin
    ├── services/              # 9 user + 11 admin (incluye adminVideos.service.ts)
    ├── store/                 # authStore, adminAuthStore, useStore (Zustand)
    ├── types/                 # index.ts, admin.ts, global.d.ts
    ├── hooks/                 # useResponsive.ts
    ├── constants/             # colors (tema dark), layout (spacing, fonts)
    └── config/                # api.ts (URL config dev/prod)
```

## Convenciones

- **Archivos:** `camelCase.tipo.ts` (ej. `adminAuth.controller.ts`)
- **Respuestas API:** `{ success: true/false, data?: {...}, message?: string }`
- **Params no usados:** Prefijar con `_` (ej. `_req`)
- **PrismaClient:** Cada controller instancia su propio `new PrismaClient()`
- **Schema fields:** Espanol snake_case (`remitente_tipo`, `monto_depositado`). Campos `nombres`/`apellidos` (plural)
- **Commits:** `feat:` | `fix:` | `refactor:` | `docs:`
- **Estado frontend:** Zustand (NO Context API). `authStore` user, `adminAuthStore` admin, `useStore` global
- **onDelete Cascade:** Solo UserBank->User y ChatMensaje->ChatSoporte. Resto sin cascade

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

- **Admin:** `admin@efectivoya.com` / `Admin123!@#` -> POST `/api/admin/auth/login`
- **Config:** Comision 5%, limites S/. 1,000 - 100,000, bono referido S/. 10
- **Videos:** 4 registros (BCP, Interbank, Scotiabank, BBVA) con `video_url: null` (sin video real hasta que admin suba)

## Gotchas criticos

### Backend
- `server.ts` usa `http.createServer(app)` (NO `app.listen()`) para Socket.io
- `FCMService.isConfigured()` guard — funciona sin Firebase
- Hard delete usuario: `$transaction` -> ChatSoporte->Referido->AlertaSeguridad->AuditLog->Retiro->Recarga->SET NULL referidos->User
- Specs de fases (`docs/faseN.md`) pueden diferir del schema real. **Siempre verificar contra `schema.prisma`**
- JWT access token: 15 min. Refresh token: 7 dias. Ambos (user y admin) tienen endpoint `/auth/refresh`
- `CloudinaryService` maneja 3 tipos: `uploadBoucher` (image), `uploadComprobantePDF` (raw), `uploadVideo` (video). `deleteFile` acepta `'image' | 'raw' | 'video'`
- `upload.middleware.ts` exporta `uploadBoucher` (5MB, img) y `uploadVideo` (50MB, mp4/mov/webm)

### Backend - Respuestas auth
- `POST /auth/login` retorna user SIN: `email_verificado`, `is_active`
- `POST /auth/verify-email` retorna user SIN: `email_verificado`, `is_active`, `dni`, `whatsapp`
- `GET /auth/profile` es el UNICO endpoint que retorna todos los campos del user
- `GET /auth/profile` retorna `{ data: { user: {...} } }` (user anidado en data.user)

### Frontend
- `saldo_actual` llega como string (Prisma Decimal) — usar `Number()` antes de `.toFixed()`
- Perfil usuario: `/api/auth/profile` (NO `/api/user/profile`)
- Register: campos `nombres`/`apellidos` (plural), `codigo_referido_usado` (NO `codigo_referido`)
- Verify OTP: `{ userId, otp }` (NO `{ email, otp }`)
- `authStore.refreshUser()` extrae `response.data.user` (no `response.data` directo)
- `authStore.logout()` y `adminAuthStore.logout()` usan `try-finally` para garantizar `clearAuth()`
- `expo-notifications` SDK 54: requiere `shouldShowBanner` + `shouldShowList`
- `adminApi.service.ts`: interceptor refresh automatico con cola. `patchFormData()` para multipart con timeout 120s
- **Video:** `expo-video` (NO `expo-av` — deprecado SDK 54). Hook `useVideoPlayer` + componente `VideoView`. Web usa `<video>` HTML5 nativo

### Safe Area / Edge-to-Edge (Android)
- `app.json` tiene `edgeToEdgeEnabled: true`
- Tab bar: `useSafeAreaInsets()` para sumar `insets.bottom`
- Modales fullscreen: ScrollViews con `paddingBottom: insets.bottom`

### Admin panel
- Componentes: `AdminHeader`, `AdminSidebar`, `AdminTabBar`, `DataTable`, `FilterBar`, `StatusBadge`, `Pagination`, `MetricCard`, `RechazoModal`
- Sidebar: Desktop (>768px). TabBar: Mobile (<768px). Hook: `useResponsive()`
- `adminSocketService` se conecta/desconecta en `_layout.tsx` admin segun `isAuthenticated`
- Chat admin: burbujas invertidas (admin=derecha, user=izquierda), boton cerrar/reabrir
- Config admin: secciones Comisiones, Cuenta Recaudadora, App, Mantenimiento, **Videos Instructivos** (upload por banco con file picker web/native)

## Bugs conocidos

- **Editar perfil:** Boton existe en UI pero backend no tiene endpoint de update profile (muestra "proximamente")

## TODOs

- **Backend:** Endpoint para actualizar perfil de usuario
- **Tests:** 0 escritos. Plan en `docs/tests-pendientes.md`. Framework: Jest + Supertest

## Prisma — modelos y enums

**14 modelos:** User, UserBank, Recarga, Retiro, Admin, Configuracion, AuditLog, Referido, AlertaSeguridad, ChatSoporte, ChatMensaje, FAQ, TerminosCondiciones, PoliticasPrivacidad, VideoInstructivo

**VideoInstructivo:** `id`, `banco` (BancoEnum unique), `video_url` (nullable), `video_cloudinary_id` (nullable), `titulo`, `updated_at`

**6 enums:** BancoEnum (BCP, Interbank, Scotiabank, BBVA), EstadoOperacion (pendiente, aprobado, rechazado), RolAdmin (super_admin, admin), TipoAlerta, EstadoChat (abierto, cerrado), RemitenteChat (usuario, admin)

## Docs

| Archivo | Contenido |
|---------|-----------|
| `docs/api-endpoints.md` | Endpoints completos (usuario + admin) |
| `docs/modelo-datos.md` | Schema Prisma detallado |
| `docs/flujos-negocio.md` | Flujos recarga, retiro, referidos |
| `docs/reglas-negocio.md` | Validaciones, limites, comisiones |
| `docs/guia-ui.md` | Paleta colores (tema dark), tipografia |
| `docs/fase1.md` - `fase9.md` | Specs por fase |
| `docs/chatperfil.md` | Spec pantallas Chat + Perfil |
| `docs/tests-pendientes.md` | Plan de tests por modulo |
