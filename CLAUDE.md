# EfectivoYa

**Actualizado:** 24 Feb 2026 | Billetera digital fintech para Peru — "Tu Dinero Al Instante."

## Funcionalidades activas

- **Recargas:** Usuario sube boucher, admin aprueba, saldo se acredita menos comision por banco
- **Retiros:** A cuentas propias del usuario, sin comision. Atomico con `$transaction`
- **Referidos:** Bono S/. 10 para ambos en primera recarga. Backend activo. **Frontend desactivado** (quitado de Dashboard, Perfil y Registro — reactivar cuando sea necesario)
- **Alertas automaticas:** >3 recargas/hora, boucher duplicado, retiro >80% saldo en 24h
- **Comprobantes PDF:** On-the-fly con PDFKit + Cloudinary
- **Chat soporte:** Socket.io bidireccional (usuario + admin) + FCM push
- **Videos instructivos:** Videos por banco en Cloudinary (MP4/MOV/WEBM, max 50MB). `expo-video`
- **Panel admin:** Dashboard, recargas, retiros, chats, clientes, alertas, config, logs, contenido, admins
- **Bancos usuario:** CRUD completo (crear, editar alias/CCI, eliminar). `useFocusEffect` sincroniza pantallas
- **Editar perfil usuario:** `PUT /api/auth/profile` — nombres, apellidos, whatsapp, direccion?, distrito?, departamento?
- **Ubicación usuario:** `direccion`, `distrito`, `departamento` en registro (obligatorios) y editables desde perfil. Admin los ve en detalle de cliente, recarga y retiro para decidir banco de transferencia con menor comision
- **Biometria login:** `expo-local-authentication` + `expo-secure-store`. Huella/Face ID. Requiere build nativo (no funciona en Expo Go)

## Stack

**Backend:** Node.js 18+, Express 4, TypeScript 5.7, Prisma 5, PostgreSQL, JWT (15m/7d), bcryptjs, Nodemailer, Multer, Cloudinary, PDFKit, Socket.io 4.8, Firebase Admin

**Frontend:** Expo SDK 54, expo-router 6, React Native 0.81, Zustand 5, Axios, socket.io-client, expo-video, expo-document-picker, expo-local-authentication, expo-secure-store, TypeScript 5.9

**Landing:** Astro 5, Tailwind CSS 3, output static → Vercel

## Quick Start

```bash
# Backend
cp efectivoya-backend/.env.example efectivoya-backend/.env  # editar vars requeridas
cd efectivoya-backend && npm install
npx prisma generate && npx prisma db push && npm run prisma:seed
npm run dev          # http://localhost:3000

# App móvil
cd efectivoya-app && npm install --legacy-peer-deps
npx expo start       # QR para dispositivo físico | 'w' para web en :8081

# Landing
cd efectivoya-landing && npm install && npm run dev  # http://localhost:4321
```

## Variables de entorno

**Backend** (`efectivoya-backend/.env`) — requeridas:

| Var | Descripción |
|-----|-------------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/efectivoya_db` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Strings distintos ≥32 chars |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Dashboard Cloudinary |
| `SMTP_USER` / `SMTP_PASS` | Gmail + App Password |

Firebase (`FIREBASE_PROJECT_ID/PRIVATE_KEY/CLIENT_EMAIL`) es **opcional** — guard `FCMService.isConfigured()`.

**App** (`efectivoya-app/.env`) — solo si LAN auto-detect falla:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

## URLs dev / prod

| Entorno | Backend API | Panel admin | Landing |
|---------|------------|-------------|---------|
| Dev | `http://localhost:3000` | Expo web `:8081` | `:4321` |
| Prod | `https://api.efectivoya.net` | EAS Build | Vercel |

Android emulador auto-usa `http://10.0.2.2:3000`. Cambiar `PROD_API_URL` en `efectivoya-app/src/config/api.ts`.

## Deploy / Producción

```bash
# Backend
cd efectivoya-backend && npm run build && node dist/server.js
# En Railway/Render: start script = "node dist/server.js"

# App móvil (EAS Build)
cd efectivoya-app
eas build --platform android --profile production
eas build --platform ios     --profile production

# Landing (Vercel)
cd efectivoya-landing && npm run build   # genera dist/ (output static)
vercel --prod                            # o CI en push a main
```

> `prisma migrate dev` no funciona en shells no-interactivos — usar `prisma db push`. Siempre `npm run build` en backend antes de commit.

## Estructura

```
efectivoya-backend/src/
├── controllers/   # auth, chat, recargas, retiros, userBanks, userDashboard, notifications, admin*
├── middleware/    # auth, adminAuth, upload(boucher+video), validation, errorHandler, rateLimit
├── routes/        # 7 user + 11 admin
├── services/      # otp, email, auditLog, cloudinary, pdf, referidos, alertas, socket, fcm
├── utils/         # jwt, logger, validators, maskData, formatters
├── app.ts         # Express + rutas registradas
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

efectivoya-landing/src/
├── pages/index.astro          # Única página: ensambla todos los componentes
├── layouts/BaseLayout.astro   # HTML base, Google Fonts (Bebas Neue + Sora), estilos globales
└── components/
    ├── Navbar.astro            # Sticky, hamburger mobile, scroll border
    ├── Hero.astro              # Banner principal: coins animados como fondo, stats strip integrado
    ├── HowItWorks.astro        # 3 pasos con conectores
    ├── Services.astro          # 2 col: texto izq + cards der
    ├── Banks.astro             # Logos de bancos compatibles
    ├── VideosTutoriales.astro  # Tabs por banco con YouTube embed
    ├── WhyUs.astro             # Grid de 6 features
    ├── FAQ.astro               # Acordeón
    ├── Ubicacion.astro         # Mapa / dirección local
    ├── CTAFinal.astro          # Banner final con coins animados
    ├── Footer.astro
    ├── ButtonCTA.astro         # Botón reutilizable (variant: primary|ghost, size: md|lg)
    └── Stats.astro             # ⚠️ OBSOLETO — no se usa en index.astro. Stats viven en Hero.astro
```

## Convenciones

- **Archivos:** `camelCase.tipo.ts` (ej. `adminAuth.controller.ts`)
- **Respuestas API:** `{ success: true/false, data?: {...}, message?: string }`
- **Params no usados:** Prefijar con `_` (ej. `_req`)
- **PrismaClient:** Cada controller instancia su propio `new PrismaClient()`
- **Schema fields:** Espanol snake_case. Campos `nombres`/`apellidos` (plural)
- **Commits:** `feat:` | `fix:` | `refactor:` | `docs:`
- **Estado frontend:** Zustand (NO Context API). `authStore` user, `adminAuthStore` admin, `useStore` global
- **onDelete Cascade:** Solo UserBank->User y ChatMensaje->ChatSoporte. Resto sin cascade
- **Admin API responses:** Backend mapea `user`->`usuario`, Decimals a `Number()`, fechas a ISO strings

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

# Landing (efectivoya-landing/)
npm run dev              # Dev server puerto 4321
npm run build            # Genera dist/ — verificar antes de deploy
npm run preview          # Sirve el build estático para testear localmente
```

## Seed

- **Admin:** `admin@efectivoya.com` / `Admin123!@#` -> POST `/api/admin/auth/login`
- **Config:** Comisiones por banco (BCP/Interbank/Scotiabank/BBVA), limites S/. 1,000 - 100,000, bono referido S/. 10
- **Videos:** 4 registros por banco con `video_url: null`

## Gotchas criticos

### Backend

- `server.ts` usa `http.createServer(app)` (NO `app.listen()`) para Socket.io
- `FCMService.isConfigured()` guard — funciona sin Firebase
- Hard delete usuario: `$transaction` -> ChatSoporte->Referido->AlertaSeguridad->AuditLog->Retiro->Recarga->SET NULL referidos->User
- Specs de fases (`docs/faseN.md`) pueden diferir del schema real. **Siempre verificar contra `schema.prisma`**
- JWT: access 15 min, refresh 7 dias. User y admin tienen `/auth/refresh`
- `CloudinaryService`: `uploadBoucher` (image), `uploadComprobantePDF` (raw), `uploadVideo` (video). `deleteFile` acepta `'image' | 'raw' | 'video'`
- `upload.middleware.ts`: `uploadBoucher` (5MB, img) y `uploadVideo` (50MB, mp4/mov/webm)
- Prisma Decimal se serializa como string en JSON — controllers deben usar `Number()` o `.toNumber()` antes de enviar
- `auth.middleware.ts`: `TokenExpiredError` usa `Logger.debug` (no `.error`) — es esperado, el cliente refresca
- `prisma migrate dev` no funciona en non-interactive shells — usar `prisma db push`
- **`DEPARTAMENTOS_PERU`:** Constante duplicada en `src/utils/validators.util.ts` (backend) y `src/components/DepartamentoPicker.tsx` (frontend). Si se actualiza en uno, actualizar en el otro
- **Usuarios pre-ubicación:** `direccion/distrito/departamento` tienen `@default("")`. Usuarios existentes tendrán strings vacíos. La UI admin usa `|| '—'` para mostrarlos correctamente

### Backend — Rutas criticas

- Perfil usuario (GET): `GET /api/auth/profile` — unico con todos los campos, wrapeado `{ data: { user: {...} } }`
- Perfil usuario (PUT): `PUT /api/auth/profile` — `{ nombres, apellidos, whatsapp?, direccion?, distrito?, departamento? }` (autenticado)
- Login admin: `POST /api/admin/auth/login` (NO `/api/auth/login`)
- `POST /auth/login` retorna user SIN: `email_verificado`, `is_active`
- `POST /auth/verify-email` retorna user SIN: `email_verificado`, `is_active`, `dni`, `whatsapp`

### Frontend — rutas y campos

- Register: campos `nombres`/`apellidos` (plural), `direccion`/`distrito`/`departamento` (obligatorios). Sin `codigo_referido_usado` (referidos desactivados en UI)
- Verify OTP: `{ userId, otp }` (NO `{ email, otp }`)
- Dashboard: backend envia `saldo_disponible`, `este_mes.cantidad_recargas` (referidos presentes en response pero no se muestran en UI)
- `authStore.refreshUser()` extrae `response.data.user` (doble wrapper)
- `authStore.logout()` y `adminAuthStore.logout()` usan `try-finally`
- `adminApi.service.ts`: interceptor refresh con cola. `patchFormData()` para multipart 120s timeout
- Socket reconnect: llamar `socketService.reconnect()` despues del `refreshUser()`

### Frontend — biometria

- `loginWithBiometric()` en `authStore`: lee `bio_refresh_token` de SecureStore → POST `/api/auth/refresh` directo (axios sin interceptor) → guarda tokens en AsyncStorage → llama `getProfile()`
- El token se guarda en SecureStore automaticamente al hacer login normal exitoso. Se borra en `clearAuth()`
- Plugin en `app.json`: `"expo-local-authentication"` en `plugins[]`
- Permisos: `NSFaceIDUsageDescription` (iOS), `USE_BIOMETRIC` + `USE_FINGERPRINT` (Android)
- **Requiere EAS Build o `npx expo prebuild` + build nativo.** NO funciona en Expo Go
- En login screen: `checkBiometrics()` verifica hardware + enrollment + bio_token antes de mostrar el boton

### Frontend — media / archivos

- **Android galeria:** `expo-document-picker` con `type: 'image/*'`. NO usar `expo-image-picker` en Android (Photo Picker no muestra fotos de WhatsApp/SD)
- **iOS galeria:** `expo-image-picker.launchImageLibraryAsync`. Manejar `accessPrivileges === 'limited'` con Alert + `Linking.openSettings()`
- **Modal anidado iOS:** NO usar `Modal`/ConfirmDialog dentro de otro Modal. Usar `Alert.alert` nativo
- **`DepartamentoPicker` en Modal iOS:** Pasar prop `noInnerScroll` cuando el picker está dentro de un `Modal` (ej: modal editar perfil). Sin ella el `ScrollView` anidado puede bloquearse en iOS. En pantallas normales no hace falta
- **Video:** `expo-video` (NO `expo-av`). Hook `useVideoPlayer` + `VideoView`. Web usa `<video>` HTML5
- **Comprobantes PDF:** Usar `operacion.comprobante_pdf_url` con `Linking.openURL()`. Los endpoints retornan bytes crudos
- **UserBank eliminable:** `user_bank_id` en Retiro es `String?` con `onDelete: SetNull`

### Frontend — Chat iOS

- `KeyboardAvoidingView`: `behavior="padding"`, `keyboardVerticalOffset={49 + insets.bottom}` (tab bar real)
- Listener `Keyboard.addListener('keyboardDidShow')` hace scroll al bottom cuando sube teclado (solo iOS)
- Input tiene `returnKeyType="send"` y `onSubmitEditing={handleSend}`
- Verificar `socketService.isConnected()` antes de enviar

### Safe Area / Edge-to-Edge (Android)

- `app.json`: `edgeToEdgeEnabled: true`
- Tab bar: `useSafeAreaInsets()` para sumar `insets.bottom`
- Modales fullscreen: ScrollViews con `paddingBottom: insets.bottom`
- Permisos Android: `CAMERA`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VISUAL_USER_SELECTED`, `USE_BIOMETRIC`, `USE_FINGERPRINT`
- Permisos iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSFaceIDUsageDescription`

### Logo / Assets

- Logo actual: `assets/icon.png` (1024×1024 PNG). Se usa como imagen en login (100px), AdminSidebar (40px), AdminHeader mobile (32px)
- Para un logo real: disenar 512×512 PNG transparente, reemplazar `assets/icon.png`, `assets/favicon.png` y `assets/adaptive-icon.png`

### Admin panel

- Componentes: `AdminHeader`, `AdminSidebar`, `AdminTabBar`, `DataTable`, `FilterBar`, `StatusBadge`, `Pagination`, `MetricCard`, `RechazoModal`
- Sidebar: Desktop (>768px). TabBar: Mobile (<768px). Hook: `useResponsive()`
- `adminSocketService` se conecta/desconecta en `_layout.tsx` segun `isAuthenticated`
- Chat admin: burbujas invertidas (admin=derecha, user=izquierda)
- Config: 2 columnas desktop. Videos debajo. Sin cuenta recaudadora en UI. `cuenta_recaudadora_*` existe en schema pero no se expone
- **Panel admin corre en web:** `Alert.alert` NO funciona. Usar `setMessage()` + banner inline (patron en `retiros/[id].tsx`)

### Landing — gotchas

- **`Stats.astro` NO se renderiza en `index.astro`** — Los datos de estadísticas viven en `Hero.astro` como un strip integrado en el banner. Editar `Stats.astro` no tendrá efecto visible hasta reintegrarlo
- **Hero coins z-index:** `hero-coins-bg` (z:1) → `coins-fade` (z:2) → `hero-inner/stats-strip` (z:3). Respetar esta jerarquía al añadir elementos al hero
- **`animation-fill-mode: backwards` REQUERIDO en coins** — Sin él las monedas aparecen congeladas/visibles al cargar antes de que arranque la animación. Aplica a `.coin` en `Hero.astro` y `.cta-coin` en `CTAFinal.astro`
- **`hero-spacer`:** El segundo div del grid en `Hero.astro` es un spacer vacío que mantiene el layout 2 columnas en desktop (texto izq, coins visibles en der). En mobile se oculta con `display: none`
- **`coins-fade` en Hero:** Gradiente lineal (izq→der) que oscurece la zona del texto y deja visible la derecha. En mobile es un overlay uniforme `rgba`. Ajustar si se cambia el layout
- **CTAFinal coins:** Misma animación que Hero pero con vignette radial central para proteger el texto centrado. Posiciones distribuidas en los bordes (evitan el centro)

## Bugs conocidos

- **Error SplashScreen en dev:** `No native splash screen registered for given view controller` — solo ocurre en desarrollo con hot reload (Expo SDK 54). No aparece en build de produccion. No requiere fix
- **Biometria en Expo Go:** No funciona por falta de modulos nativos compilados. Requiere EAS Build

## TODOs

- **Tests:** 0 escritos. Plan detallado en `docs/tests-pendientes.md`. Framework: Jest + Supertest
- **Logo real:** Disenar logo EfectivoYa y reemplazar `assets/icon.png` (actualmente icono generico de Expo)
- **Referidos frontend:** Reactivar en Dashboard, Perfil y Registro cuando se decida

## Prisma — modelos y enums

**15 modelos:** User, UserBank, Recarga, Retiro (`referencia_banco String?`), Admin, Configuracion, AuditLog, Referido, AlertaSeguridad, ChatSoporte, ChatMensaje, FAQ, TerminosCondiciones, PoliticasPrivacidad, VideoInstructivo

**6 enums:** BancoEnum (BCP, Interbank, Scotiabank, BBVA), EstadoOperacion (pendiente, aprobado, rechazado), RolAdmin (super_admin, admin), TipoAlerta, EstadoChat (abierto, cerrado), RemitenteChat (usuario, admin)

## Docs

| Archivo | Contenido |
|---------|-----------|
| `docs/api-endpoints.md` | Endpoints completos (usuario + admin) |
| `docs/modelo-datos.md` | Schema Prisma detallado |
| `docs/flujos-negocio.md` | Flujos recarga, retiro, referidos |
| `docs/reglas-negocio.md` | Validaciones, limites, comisiones |
| `docs/guia-ui.md` | Paleta colores (tema dark), tipografia |
| `docs/fase1.md` - `fase9.md` | Specs por fase (pueden diferir del schema actual) |
| `docs/tests-pendientes.md` | Plan de tests por modulo |
