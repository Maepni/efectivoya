# EfectivoYa - Contexto del Proyecto

**Actualizado:** 06 Feb 2026

## Resumen

Billetera digital fintech para Peru. Tagline: "Tu Dinero Al Instante"

- **Recargas:** Deposito con boucher + comision 5% configurable
- **Retiros:** A cuentas propias del usuario, sin comision
- **Operaciones:** Requieren aprobacion de admin antes de afectar saldo
- **Referidos:** Bono S/. 10 para ambos en primera recarga
- **Comprobantes PDF:** Se generan on-the-fly desde la API (no desde Cloudinary)

## Estado del Desarrollo

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1. Backend Base | ✅ | Express + TypeScript + Prisma + PostgreSQL |
| 2. Autenticacion | ✅ | Registro, login JWT, OTP email, referidos |
| 3. Bancos usuario | ✅ | CRUD de cuentas bancarias |
| 4. Recargas | ✅ | Depositos con boucher, PDF, alertas |
| 5. Retiros + Dashboard | ✅ | Retiros, dashboard usuario, referidos |
| 6. Panel admin | ⏳ | **PROXIMO** - Gestion completa de operaciones |
| 7. Chat + Push | ⏳ | Soporte y notificaciones |
| 8. Frontend | ⏳ | React Native + Expo |

## Stack

**Backend:** Node.js 18+ · Express 4 · TypeScript 5.7 (strict) · Prisma 5 · PostgreSQL · JWT · bcryptjs · Nodemailer · Multer · Cloudinary · PDFKit

**Frontend (pendiente):** React Native · Expo SDK 52+ · expo-router · Zustand

**tsconfig:** target ES2022, strict, noUnusedLocals, noUnusedParameters, noImplicitReturns

## Estructura Backend

```
efectivoya-backend/src/
├── controllers/     # 8: auth, adminAuth, userBanks, recargas, adminRecargas,
│                    #    retiros, adminRetiros, userDashboard
├── middleware/       # 6: auth, adminAuth, upload, validation, errorHandler, rateLimit
├── routes/          # 8: auth, adminAuth, userBanks, recargas, adminRecargas,
│                    #    retiros, adminRetiros, user
├── services/        # 7: otp, email, auditLog, cloudinary, pdf, referidos, alertas
├── utils/           # 5: jwt, logger, validators, maskData, formatters
├── types/           # index.d.ts (AuthRequest, AdminRequest, JWTPayload)
├── app.ts           # Express config + 8 grupos de rutas
└── server.ts
prisma/
├── schema.prisma    # 14 modelos, 6 enums
└── seed.ts
```

## API Endpoints (8 grupos)

**Auth** `/api/auth` — register, verify-email, login, refresh, resend-otp, forgot-password, reset-password, logout, profile
**Admin Auth** `/api/admin` — login
**User Banks** `/api/user-banks` — CRUD completo + stats
**Recargas** `/api/recargas` — config, video/:banco, solicitar (multipart), historial, /:id/comprobante (PDF directo)
**Admin Recargas** `/api/admin/recargas` — pendientes, stats, listado con filtros, detalle, aprobar, rechazar
**Retiros** `/api/retiros` — solicitar, historial, /:id/comprobante (PDF directo)
**Admin Retiros** `/api/admin/retiros` — pendientes, stats, listado con filtros, detalle, aprobar, rechazar
**Dashboard** `/api/user` — dashboard (stats mes + ultimas 5 ops), referido, referidos/lista

## Convenciones

| Elemento | Formato | Ejemplo |
|----------|---------|---------|
| Archivos | kebab-case.ts | `admin-auth.controller.ts` |
| Clases | PascalCase | `CloudinaryService` |
| Funciones/vars | camelCase | `formatCurrency` |
| Constantes | UPPER_SNAKE | `MAX_FILE_SIZE` |
| Tablas BD | snake_case | `alertas_seguridad` |

**Respuestas API:**
```typescript
{ success: true, data: {...}, message?: string }  // OK
{ success: false, message: string, errors?: [...] }  // Error
```

**Commits:** `feat:` · `fix:` · `refactor:` · `docs:`

## Comandos

```bash
cd efectivoya-backend
npm run dev              # Desarrollo (ts-node-dev)
npm run build            # Compilar (tsc)
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:migrate   # Migraciones
npm run prisma:seed      # Datos iniciales
npm run prisma:studio    # GUI BD
```

## Seed Data

- **Admin:** `admin@efectivoya.com` / `Admin123!@#`
- **Config:** Comision 5%, limites S/. 1,000 - 100,000, bono S/. 10
- **Bancos:** BCP, Interbank, Scotiabank, BBVA

## Variables de Entorno

Ver `.env.example` en `efectivoya-backend/`. Requiere: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, SMTP_*, CLOUDINARY_*.

## Notas Tecnicas

- **Comprobantes PDF:** Los endpoints `/:id/comprobante` generan el PDF on-the-fly con PDFKit y lo sirven directo (`Content-Type: application/pdf`). Cloudinary se usa como backup al aprobar pero NO para servir al usuario (cuentas free bloquean archivos raw/"untrusted").
- **Saldo en retiros:** NO se descuenta hasta que admin aprueba. Se usa transaccion Prisma `$transaction` para atomicidad.
- **Alertas de seguridad:** Se crean automaticamente por multiples recargas (>3/hora), boucher duplicado, y retiro >80% del saldo dentro de 24h de recargar.
- **Formatters.generateNumeroOperacion:** Prefijo `REC-` o `RET-` + fecha YYYYMMDD + 6 chars aleatorios.

## Bugs Conocidos

*Ninguno actualmente*

## TODOs

### Fase 6: Panel Admin (proximo)
- [ ] Dashboard admin con estadisticas globales
- [ ] Gestion de usuarios (activar/desactivar)
- [ ] Gestion de configuracion (comision, limites)
- [ ] Revision de alertas de seguridad

### Tests Pendientes
- [ ] Auth: registro, login, OTP, refresh token
- [ ] Validators: email, DNI, password, WhatsApp, CCI
- [ ] Middleware: auth, adminAuth, rateLimit
- [ ] Recargas: solicitud, aprobacion, rechazo, PDF
- [ ] Retiros: solicitud, aprobacion, rechazo, PDF
- [ ] Referidos: flujo completo de bonos
- [ ] Alertas: multiples recargas, boucher duplicado, retiro inmediato

## Docs Adicionales

| Archivo | Contenido |
|---------|-----------|
| `docs/fase1.md` - `docs/fase5.md` | Instrucciones detalladas por fase |
| `docs/modelo-datos.md` | Schema Prisma detallado (14 modelos) |
| `docs/flujos-negocio.md` | Flujos de recarga, retiro, referidos |
| `docs/reglas-negocio.md` | Validaciones, limites, comisiones |
| `docs/guia-ui.md` | Paleta de colores, tipografia |
