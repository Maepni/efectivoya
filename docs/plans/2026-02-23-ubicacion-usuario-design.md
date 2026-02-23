# Diseño: Ubicación del usuario (dirección, distrito, departamento)

**Fecha:** 2026-02-23
**Objetivo:** Agregar campos de ubicación geográfica al perfil del usuario para que el administrador pueda tomar mejores decisiones al transferir dinero, eligiendo el banco que minimice comisiones según la región del usuario.

---

## Resumen

Se agregan 3 campos al modelo `User`:
- `direccion` — texto libre (calle, número, referencia)
- `distrito` — texto libre (ej. Miraflores, Surco)
- `departamento` — string validado contra la lista de 25 departamentos del Perú

Los campos son **obligatorios** desde el registro. Los usuarios pueden editarlos luego desde su perfil.

El administrador ve la ubicación en:
1. Detalle de cliente (`/clientes/[id]`)
2. Detalle de recarga (`/recargas/[id]`)
3. Detalle de retiro (`/retiros/[id]`)

---

## Enfoque elegido

**Enfoque A: Campos String en el modelo User.**
Strings directos en la tabla `users`, validación de `departamento` a nivel de controlador. Sin enum de Prisma, sin tabla separada. Sigue el patrón existente del proyecto.

---

## 1. Base de datos

### Cambios en `schema.prisma` — modelo `User`

Agregar después del campo `whatsapp`:

```prisma
direccion    String
distrito     String
departamento String
```

**Migración:** `prisma db push` (no `prisma migrate dev`).

---

## 2. Backend

### Lista de departamentos válidos

Constante en `efectivoya-backend/src/utils/validators.util.ts` (o un nuevo archivo `constants.ts`):

```ts
export const DEPARTAMENTOS_PERU = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
];
```

### `auth.controller.ts`

**`register`:**
- Desestructurar `direccion`, `distrito`, `departamento` del body.
- Validar que los 3 campos estén presentes (no vacíos).
- Validar que `departamento` esté en `DEPARTAMENTOS_PERU`.
- Guardar en `prisma.user.create({ data: { ...existente, direccion, distrito, departamento } })`.

**`updateProfile`:**
- Aceptar `direccion`, `distrito`, `departamento` como campos opcionales.
- Si se envían, validar `departamento` contra la lista.
- Incluir en el `prisma.user.update({ data: { ... } })`.
- Incluir los 3 campos en el `select` de respuesta.

**`getProfile`:**
- Agregar `direccion`, `distrito`, `departamento` al `select`.

**`verifyEmail` y `login`:**
- Agregar los 3 campos al objeto `user` devuelto en la respuesta.

### `adminUsers.controller.ts`

**`getUserDetail`:**
- Asegurarse de que el spread `...user` (ya usa `include`) envíe los nuevos campos. No requiere cambios si se usa `include` sin `select` en el user.

**`listUsers`:**
- Agregar `direccion`, `distrito`, `departamento` al `select` si se quiere filtrar/mostrar en listado (opcional — no se muestra en la tabla de lista, solo en detalle).

### `adminRecargas.controller.ts` y `adminRetiros.controller.ts`

En el `include: { user: { select: {...} } }` de los endpoints de detalle, agregar:
```ts
direccion: true,
distrito: true,
departamento: true,
```

---

## 3. Frontend — App móvil

### Componente reutilizable: `DepartamentoPicker`

Crear `efectivoya-app/src/components/DepartamentoPicker.tsx`.

- Lista de los 25 departamentos.
- Se muestra como un botón que abre un `Modal` con `FlatList` de opciones.
- Compatible con iOS y Android (evita el `Picker` nativo inconsistente).
- Props: `value`, `onSelect`, `error?`.

### Registro `(auth)/register.tsx`

- Agregar al estado `form`: `departamento`, `distrito`, `direccion`.
- Agregar validaciones en `validate()`:
  - `departamento` requerido.
  - `distrito` requerido (no vacío).
  - `direccion` requerido (no vacío).
- Orden en el formulario (después de WhatsApp, antes de contraseña):
  1. `DepartamentoPicker` — label "Departamento"
  2. `Input` — "Distrito" (`autoCapitalize="words"`)
  3. `Input` — "Dirección" (`autoCapitalize="sentences"`)
- Enviar los 3 campos en la llamada `register()`.

### `authStore` — función `register`

Agregar `direccion`, `distrito`, `departamento` al tipo del parámetro y al body del POST.

### Perfil — editar perfil

En la pantalla de edición de perfil existente:
- Agregar los 3 campos al formulario con las mismas validaciones.
- Enviar en `PUT /api/auth/profile`.

---

## 4. Panel admin

### `clientes/[id].tsx`

En la card "Información", agregar después de WhatsApp:

```tsx
<InfoRow label="Departamento" value={user.departamento ?? '—'} />
<InfoRow label="Distrito" value={user.distrito ?? '—'} />
<InfoRow label="Dirección" value={user.direccion ?? '—'} />
```

Actualizar el tipo `AdminUserDetail` en `src/types/admin.ts` para incluir los nuevos campos.

### `recargas/[id].tsx`

En la card de datos del cliente (sección usuario), agregar una sub-sección "Ubicación":

```tsx
<InfoRow label="Departamento" value={recarga.user.departamento ?? '—'} />
<InfoRow label="Distrito" value={recarga.user.distrito ?? '—'} />
<InfoRow label="Dirección" value={recarga.user.direccion ?? '—'} />
```

Actualizar el tipo `AdminRecargaDetalle` en `src/types/admin.ts`.

### `retiros/[id].tsx`

Igual que recargas — agregar sub-sección "Ubicación" con los 3 campos del usuario.

Actualizar el tipo `AdminRetiroDetalle` en `src/types/admin.ts`.

---

## 5. Tipos TypeScript

Actualizar `efectivoya-app/src/types/index.ts`:
- Tipo `User`: agregar `direccion: string`, `distrito: string`, `departamento: string`.

Actualizar `efectivoya-app/src/types/admin.ts`:
- `AdminUserDetail.user`: agregar los 3 campos.
- `AdminRecargaDetalle`: en el objeto `user` anidado, agregar los 3 campos.
- `AdminRetiroDetalle`: ídem.

---

## Archivos afectados

### Backend
- `prisma/schema.prisma` — modelo User
- `src/utils/validators.util.ts` (o nuevo `src/constants/departamentos.ts`)
- `src/controllers/auth.controller.ts`
- `src/controllers/adminUsers.controller.ts`
- `src/controllers/adminRecargas.controller.ts`
- `src/controllers/adminRetiros.controller.ts`

### Frontend
- `src/components/DepartamentoPicker.tsx` — nuevo componente
- `src/store/authStore.ts` — tipo del register
- `src/types/index.ts` — tipo User
- `src/types/admin.ts` — tipos admin
- `app/(auth)/register.tsx`
- `app/(tabs)/perfil.tsx` (o donde esté el editar perfil)
- `app/(admin)/clientes/[id].tsx`
- `app/(admin)/recargas/[id].tsx`
- `app/(admin)/retiros/[id].tsx`

---

## Consideraciones

- **Usuarios existentes:** Al hacer `prisma db push` con campos `String` (no nullable), la migración fallará si hay usuarios en la DB sin esos campos. Solución: usar `String @default("")` temporalmente o poner `String?` y hacer backfill manual, luego cambiar a `String` obligatorio. Decidir antes de ejecutar en producción.
- **TypeScript build:** Ejecutar `npm run build` en backend después de los cambios para verificar.
- **App TypeScript:** Ejecutar `npx tsc --noEmit` en la app para verificar.
