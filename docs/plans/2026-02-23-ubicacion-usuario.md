# Ubicación de Usuario Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar dirección, distrito y departamento al registro/perfil del usuario, y mostrarlos al admin en detalle de cliente, recarga y retiro.

**Architecture:** 3 campos `String` en el modelo `User` de Prisma con `@default("")` para compatibilidad con usuarios existentes. Validación de `departamento` contra lista de 25 regiones en el backend. Componente `DepartamentoPicker` inline (sin Modal) para funcionar dentro del Modal de editar perfil.

**Tech Stack:** Prisma 5, TypeScript 5.7, Express 4, React Native 0.81, Expo SDK 54, Zustand 5

---

## IMPORTANTE: Migración en producción

Los campos se agregan con `@default("")` para no romper usuarios existentes. Si hay datos en producción, ejecutar `prisma db push` en el backend de producción **antes** de desplegar el nuevo código del frontend.

---

## Task 1: Actualizar schema Prisma — agregar campos de ubicación

**Archivos:**
- Modificar: `efectivoya-backend/prisma/schema.prisma`

**Step 1: Abrir schema.prisma y localizar el modelo User**

El campo `whatsapp` está en línea ~17. Después de `whatsapp` y antes de `saldo_actual`.

**Step 2: Agregar los 3 campos al modelo User**

En `efectivoya-backend/prisma/schema.prisma`, después de `whatsapp String`:

```prisma
whatsapp              String
direccion             String    @default("")
distrito              String    @default("")
departamento          String    @default("")
saldo_actual          Decimal   @default(0) @db.Decimal(12, 2)
```

**Step 3: Ejecutar prisma db push**

```bash
cd efectivoya-backend && npx prisma generate && npx prisma db push
```

Resultado esperado: `Your database is now in sync with your Prisma schema.`

**Step 4: Verificar que Prisma Client se regeneró**

```bash
npx prisma studio
```
Verificar que la tabla `users` tiene las columnas `direccion`, `distrito`, `departamento`.

**Step 5: Commit**

```bash
git add efectivoya-backend/prisma/schema.prisma
git commit -m "feat: agregar campos direccion, distrito, departamento al modelo User"
```

---

## Task 2: Agregar constante DEPARTAMENTOS_PERU al backend

**Archivos:**
- Modificar: `efectivoya-backend/src/utils/validators.util.ts`

**Step 1: Leer el archivo actual**

```bash
# leer efectivoya-backend/src/utils/validators.util.ts
```

**Step 2: Agregar la constante al final del archivo**

Al final de `efectivoya-backend/src/utils/validators.util.ts`, agregar:

```ts
export const DEPARTAMENTOS_PERU: readonly string[] = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
] as const;
```

**Step 3: Commit**

```bash
git add efectivoya-backend/src/utils/validators.util.ts
git commit -m "feat: agregar constante DEPARTAMENTOS_PERU"
```

---

## Task 3: auth.controller.ts — registro con validación de ubicación

**Archivos:**
- Modificar: `efectivoya-backend/src/controllers/auth.controller.ts` líneas 27-136

**Step 1: Importar DEPARTAMENTOS_PERU**

En la línea de importaciones de `auth.controller.ts`, agregar a la importación de `Validators`:

```ts
import { Validators, DEPARTAMENTOS_PERU } from '../utils/validators.util';
```

**Step 2: Actualizar el método register — desestructurar campos nuevos**

Cambiar línea 29:

```ts
// ANTES
const { email, password, nombres, apellidos, dni, whatsapp, codigo_referido_usado } = req.body;

// DESPUÉS
const { email, password, nombres, apellidos, dni, whatsapp, direccion, distrito, departamento, codigo_referido_usado } = req.body;
```

**Step 3: Agregar validaciones de ubicación después de la validación de WhatsApp (línea ~49)**

Después de:
```ts
if (!Validators.isValidWhatsApp(whatsapp)) {
  return res.status(400).json({ success: false, message: 'WhatsApp debe tener 9 dígitos' });
}
```

Agregar:
```ts
if (!direccion || !direccion.trim()) {
  return res.status(400).json({ success: false, message: 'La dirección es requerida' });
}

if (!distrito || !distrito.trim()) {
  return res.status(400).json({ success: false, message: 'El distrito es requerido' });
}

if (!departamento || !DEPARTAMENTOS_PERU.includes(departamento)) {
  return res.status(400).json({ success: false, message: 'Departamento inválido' });
}
```

**Step 4: Agregar campos en prisma.user.create**

Cambiar el bloque `data` en `prisma.user.create` (línea ~87):

```ts
const user = await prisma.user.create({
  data: {
    email,
    password_hash,
    nombres: Validators.sanitizeString(nombres),
    apellidos: Validators.sanitizeString(apellidos),
    dni,
    whatsapp,
    direccion: Validators.sanitizeString(direccion),
    distrito: Validators.sanitizeString(distrito),
    departamento,
    codigo_referido,
    referido_por: referrerUser?.id || null
  }
});
```

**Step 5: Commit**

```bash
git add efectivoya-backend/src/controllers/auth.controller.ts
git commit -m "feat: validar y guardar ubicacion en registro de usuario"
```

---

## Task 4: auth.controller.ts — updateProfile, getProfile, verifyEmail, login

**Archivos:**
- Modificar: `efectivoya-backend/src/controllers/auth.controller.ts`

**Step 1: Actualizar updateProfile — desestructurar y validar**

Cambiar línea 466 (método `updateProfile`):

```ts
// ANTES
const { nombres, apellidos, whatsapp } = req.body;

// DESPUÉS
const { nombres, apellidos, whatsapp, direccion, distrito, departamento } = req.body;
```

Después de la validación de `whatsapp` existente, agregar:

```ts
if (departamento !== undefined && !DEPARTAMENTOS_PERU.includes(departamento)) {
  return res.status(400).json({ success: false, message: 'Departamento inválido' });
}
```

**Step 2: Agregar campos al prisma.user.update en updateProfile**

```ts
const user = await prisma.user.update({
  where: { id: req.userId },
  data: {
    nombres: Validators.sanitizeString(nombres),
    apellidos: Validators.sanitizeString(apellidos),
    ...(whatsapp ? { whatsapp } : {}),
    ...(direccion !== undefined ? { direccion: Validators.sanitizeString(direccion) } : {}),
    ...(distrito !== undefined ? { distrito: Validators.sanitizeString(distrito) } : {}),
    ...(departamento !== undefined ? { departamento } : {}),
  },
  select: {
    id: true,
    email: true,
    nombres: true,
    apellidos: true,
    dni: true,
    whatsapp: true,
    saldo_actual: true,
    codigo_referido: true,
    email_verificado: true,
    is_active: true,
    created_at: true,
    direccion: true,
    distrito: true,
    departamento: true,
  },
});
```

**Step 3: Actualizar getProfile — agregar campos al select**

En el método `getProfile` (línea ~519), en el `select`:

```ts
select: {
  id: true,
  email: true,
  nombres: true,
  apellidos: true,
  dni: true,
  whatsapp: true,
  saldo_actual: true,
  codigo_referido: true,
  email_verificado: true,
  is_active: true,
  created_at: true,
  direccion: true,
  distrito: true,
  departamento: true,
}
```

**Step 4: Actualizar verifyEmail — agregar campos al user devuelto**

En el método `verifyEmail` (línea ~180), en el objeto `user` de la respuesta:

```ts
user: {
  id: user.id,
  email: user.email,
  nombres: user.nombres,
  apellidos: user.apellidos,
  dni: user.dni,
  whatsapp: user.whatsapp,
  saldo_actual: user.saldo_actual,
  codigo_referido: user.codigo_referido,
  email_verificado: true,
  is_active: user.is_active,
  direccion: user.direccion,
  distrito: user.distrito,
  departamento: user.departamento,
}
```

**Step 5: Actualizar login — agregar campos al user devuelto**

En el método `login` (línea ~254), en el objeto `user` de la respuesta:

```ts
user: {
  id: user.id,
  email: user.email,
  nombres: user.nombres,
  apellidos: user.apellidos,
  dni: user.dni,
  whatsapp: user.whatsapp,
  saldo_actual: user.saldo_actual,
  codigo_referido: user.codigo_referido,
  email_verificado: user.email_verificado,
  is_active: user.is_active,
  direccion: user.direccion,
  distrito: user.distrito,
  departamento: user.departamento,
}
```

**Step 6: Commit**

```bash
git add efectivoya-backend/src/controllers/auth.controller.ts
git commit -m "feat: exponer campos de ubicacion en profile, login y verifyEmail"
```

---

## Task 5: adminRecargas.controller.ts — ubicación en detalle de recarga

**Archivos:**
- Modificar: `efectivoya-backend/src/controllers/adminRecargas.controller.ts`

**Step 1: Localizar el método getDetalle (~línea 96)**

El `select` del `user` en `getDetalle` incluye: `id, email, nombres, apellidos, dni, whatsapp, saldo_actual, created_at, referido_por, bono_referido_usado`.

**Step 2: Agregar campos al select del user**

```ts
user: {
  select: {
    id: true,
    email: true,
    nombres: true,
    apellidos: true,
    dni: true,
    whatsapp: true,
    saldo_actual: true,
    created_at: true,
    referido_por: true,
    bono_referido_usado: true,
    direccion: true,
    distrito: true,
    departamento: true,
  }
}
```

**Step 3: Agregar campos al objeto `usuario` en la respuesta JSON (~línea 170)**

```ts
usuario: {
  id: recarga.user.id,
  email: recarga.user.email,
  nombres: recarga.user.nombres,
  apellidos: recarga.user.apellidos,
  dni: recarga.user.dni,
  whatsapp: recarga.user.whatsapp,
  saldoActual: Number(recarga.user.saldo_actual),
  totalRecargas: historialUsuario,
  recargasAprobadas,
  alertasActivas,
  direccion: recarga.user.direccion,
  distrito: recarga.user.distrito,
  departamento: recarga.user.departamento,
},
```

**Step 4: Commit**

```bash
git add efectivoya-backend/src/controllers/adminRecargas.controller.ts
git commit -m "feat: incluir ubicacion del usuario en detalle de recarga admin"
```

---

## Task 6: adminRetiros.controller.ts — ubicación en detalle de retiro

**Archivos:**
- Modificar: `efectivoya-backend/src/controllers/adminRetiros.controller.ts`

**Step 1: Localizar el método getDetalle (~línea 65)**

El `select` del `user` incluye: `id, email, nombres, apellidos, dni, whatsapp, saldo_actual, created_at`.

**Step 2: Agregar campos al select del user**

```ts
user: {
  select: {
    id: true,
    email: true,
    nombres: true,
    apellidos: true,
    dni: true,
    whatsapp: true,
    saldo_actual: true,
    created_at: true,
    direccion: true,
    distrito: true,
    departamento: true,
  }
},
```

**Step 3: Agregar campos al objeto `usuario` en la respuesta JSON (~línea 115)**

```ts
usuario: {
  id: retiro.user.id,
  email: retiro.user.email,
  nombres: retiro.user.nombres,
  apellidos: retiro.user.apellidos,
  dni: retiro.user.dni,
  whatsapp: retiro.user.whatsapp,
  saldo_actual: Number(retiro.user.saldo_actual),
  direccion: retiro.user.direccion,
  distrito: retiro.user.distrito,
  departamento: retiro.user.departamento,
},
```

**Step 4: Commit**

```bash
git add efectivoya-backend/src/controllers/adminRetiros.controller.ts
git commit -m "feat: incluir ubicacion del usuario en detalle de retiro admin"
```

---

## Task 7: Verificar build TypeScript del backend

**Step 1: Compilar backend**

```bash
cd efectivoya-backend && npm run build
```

Resultado esperado: sin errores TypeScript. Si hay errores, corregirlos antes de continuar.

---

## Task 8: Actualizar tipos TypeScript del frontend

**Archivos:**
- Modificar: `efectivoya-app/src/types/index.ts`
- Modificar: `efectivoya-app/src/types/admin.ts`
- Modificar: `efectivoya-app/src/services/auth.service.ts`

**Step 1: Actualizar interfaz User en types/index.ts**

Agregar después de `whatsapp: string`:

```ts
export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  dni: string;
  whatsapp: string;
  direccion: string;
  distrito: string;
  departamento: string;
  saldo_actual: number | string;
  codigo_referido: string;
  email_verificado: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Actualizar interfaz RegisterData en types/index.ts**

```ts
export interface RegisterData {
  nombres: string;
  apellidos: string;
  email: string;
  dni: string;
  whatsapp: string;
  direccion: string;
  distrito: string;
  departamento: string;
  password: string;
  codigo_referido_usado?: string;
}
```

**Step 3: Actualizar AdminUserDetail en types/admin.ts**

En la interfaz `AdminUserDetail`, dentro de `user:`, agregar después de `whatsapp: string`:

```ts
direccion: string;
distrito: string;
departamento: string;
```

**Step 4: Actualizar AdminRecargaDetalle en types/admin.ts**

En la interfaz `AdminRecargaDetalle`, dentro de `usuario:`, agregar después de `alertasActivas: number`:

```ts
direccion: string;
distrito: string;
departamento: string;
```

**Step 5: Actualizar AdminRetiroDetalle en types/admin.ts**

En la interfaz `AdminRetiroDetalle`, dentro de `retiro.usuario:`, agregar después de `saldo_actual: number | string`:

```ts
direccion: string;
distrito: string;
departamento: string;
```

**Step 6: Actualizar auth.service.ts — tipo de updateProfile**

Cambiar la firma del método `updateProfile` en línea 115:

```ts
async updateProfile(data: {
  nombres: string;
  apellidos: string;
  whatsapp?: string;
  direccion?: string;
  distrito?: string;
  departamento?: string;
}): Promise<ApiResponse<{ user: User }>>
```

**Step 7: Commit**

```bash
git add efectivoya-app/src/types/index.ts efectivoya-app/src/types/admin.ts efectivoya-app/src/services/auth.service.ts
git commit -m "feat: actualizar tipos TS para campos de ubicacion"
```

---

## Task 9: Crear componente DepartamentoPicker

**Archivos:**
- Crear: `efectivoya-app/src/components/DepartamentoPicker.tsx`

> **Nota:** Este componente usa una lista inline expandible (sin `Modal`) para funcionar dentro del modal de editar perfil en iOS. Ver gotcha de CLAUDE.md: "Modal anidado iOS: NO usar Modal dentro de otro Modal".

**Step 1: Crear el archivo**

`efectivoya-app/src/components/DepartamentoPicker.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export const DEPARTAMENTOS_PERU: readonly string[] = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
] as const;

interface DepartamentoPickerProps {
  value: string;
  onSelect: (departamento: string) => void;
  error?: string;
}

export function DepartamentoPicker({ value, onSelect, error }: DepartamentoPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Departamento *</Text>
      <TouchableOpacity
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={20} color={Colors.gray} style={styles.icon} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value || 'Selecciona tu departamento'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {open && (
        <View style={styles.list}>
          <ScrollView
            nestedScrollEnabled
            style={styles.listScroll}
            keyboardShouldPersistTaps="handled"
          >
            {DEPARTAMENTOS_PERU.map((dep) => (
              <TouchableOpacity
                key={dep}
                style={[styles.item, value === dep && styles.itemSelected]}
                onPress={() => {
                  onSelect(dep);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.itemText, value === dep && styles.itemTextSelected]}>
                  {dep}
                </Text>
                {value === dep && (
                  <Ionicons name="checkmark" size={16} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Layout.spacing.md,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 14,
    backgroundColor: Colors.cardBackground,
    gap: Layout.spacing.sm,
  },
  triggerError: {
    borderColor: Colors.error,
  },
  icon: {
    marginRight: 4,
  },
  triggerText: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.gray,
  },
  errorText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.error,
    marginTop: 4,
  },
  list: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    marginTop: 4,
    backgroundColor: Colors.cardBackground,
    maxHeight: 200,
  },
  listScroll: {
    maxHeight: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemSelected: {
    backgroundColor: `${Colors.primary}15`,
  },
  itemText: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
  itemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
git add efectivoya-app/src/components/DepartamentoPicker.tsx
git commit -m "feat: crear componente DepartamentoPicker inline"
```

---

## Task 10: Actualizar pantalla de registro

**Archivos:**
- Modificar: `efectivoya-app/app/(auth)/register.tsx`

**Step 1: Importar DepartamentoPicker**

Agregar a los imports:

```tsx
import { DepartamentoPicker } from '../../src/components/DepartamentoPicker';
```

**Step 2: Agregar campos al estado form**

Cambiar el `useState` del form:

```tsx
const [form, setForm] = useState({
  nombres: '',
  apellidos: '',
  email: '',
  dni: '',
  whatsapp: '',
  departamento: '',
  distrito: '',
  direccion: '',
  password: '',
  confirmPassword: '',
});
```

**Step 3: Agregar validaciones en la función validate()**

Después de la validación de `whatsapp`, agregar:

```tsx
if (!form.departamento) newErrors.departamento = 'Departamento requerido';
if (!form.distrito.trim()) newErrors.distrito = 'Distrito requerido';
if (!form.direccion.trim()) newErrors.direccion = 'Dirección requerida';
```

**Step 4: Agregar campos al llamado de register()**

```tsx
const result = await register({
  nombres: form.nombres.trim(),
  apellidos: form.apellidos.trim(),
  email: form.email.trim().toLowerCase(),
  dni: form.dni.trim(),
  whatsapp: form.whatsapp.trim(),
  departamento: form.departamento,
  distrito: form.distrito.trim(),
  direccion: form.direccion.trim(),
  password: form.password,
});
```

**Step 5: Agregar campos en el JSX — después del Input de WhatsApp y antes del Input de contraseña**

```tsx
{/* Después del Input de WhatsApp */}

<DepartamentoPicker
  value={form.departamento}
  onSelect={(dep) => {
    setForm((prev) => ({ ...prev, departamento: dep }));
    if (errors.departamento) setErrors((prev) => ({ ...prev, departamento: '' }));
  }}
  error={errors.departamento}
/>

<Input
  label="Distrito"
  icon="map-outline"
  placeholder="Ej: Miraflores"
  value={form.distrito}
  onChangeText={(v) => updateField('distrito', v)}
  error={errors.distrito}
  autoCapitalize="words"
/>

<Input
  label="Dirección"
  icon="home-outline"
  placeholder="Ej: Av. Principal 123"
  value={form.direccion}
  onChangeText={(v) => updateField('direccion', v)}
  error={errors.direccion}
  autoCapitalize="sentences"
/>

{/* Luego el Input de contraseña existente */}
```

**Step 6: Commit**

```bash
git add efectivoya-app/app/(auth)/register.tsx
git commit -m "feat: agregar campos de ubicacion al formulario de registro"
```

---

## Task 11: Actualizar pantalla de perfil — editar perfil

**Archivos:**
- Modificar: `efectivoya-app/app/(tabs)/perfil.tsx`

**Step 1: Importar DepartamentoPicker**

```tsx
import { DepartamentoPicker } from '../../src/components/DepartamentoPicker';
```

**Step 2: Agregar campos al estado editData (~línea 45)**

```tsx
const [editData, setEditData] = useState({
  nombres: user?.nombres || '',
  apellidos: user?.apellidos || '',
  whatsapp: user?.whatsapp || '',
  departamento: user?.departamento || '',
  distrito: user?.distrito || '',
  direccion: user?.direccion || '',
});
```

**Step 3: Actualizar el useEffect de sincronización (~línea 67)**

```tsx
useEffect(() => {
  setEditData({
    nombres: user?.nombres || '',
    apellidos: user?.apellidos || '',
    whatsapp: user?.whatsapp || '',
    departamento: user?.departamento || '',
    distrito: user?.distrito || '',
    direccion: user?.direccion || '',
  });
}, [user]);
```

**Step 4: Actualizar handleUpdateProfile para enviar los nuevos campos**

```tsx
const response = await authService.updateProfile({
  nombres: editData.nombres.trim(),
  apellidos: editData.apellidos.trim(),
  ...(editData.whatsapp.trim() ? { whatsapp: editData.whatsapp.trim() } : {}),
  ...(editData.departamento ? { departamento: editData.departamento } : {}),
  ...(editData.distrito.trim() ? { distrito: editData.distrito.trim() } : {}),
  ...(editData.direccion.trim() ? { direccion: editData.direccion.trim() } : {}),
});
```

**Step 5: Agregar campos en el Modal de Editar Perfil**

Dentro del `ScrollView` del Modal "Editar Perfil", después del `Input` de WhatsApp y antes del `Button` de guardar:

```tsx
<DepartamentoPicker
  value={editData.departamento}
  onSelect={(dep) => setEditData({ ...editData, departamento: dep })}
/>

<Input
  label="Distrito"
  placeholder="Ej: Miraflores"
  value={editData.distrito}
  onChangeText={(text) => setEditData({ ...editData, distrito: text })}
  icon="map-outline"
  autoCapitalize="words"
/>

<Input
  label="Dirección"
  placeholder="Ej: Av. Principal 123"
  value={editData.direccion}
  onChangeText={(text) => setEditData({ ...editData, direccion: text })}
  icon="home-outline"
  autoCapitalize="sentences"
/>
```

**Step 6: Commit**

```bash
git add efectivoya-app/app/(tabs)/perfil.tsx
git commit -m "feat: agregar campos de ubicacion al formulario de editar perfil"
```

---

## Task 12: Panel admin — detalle de cliente

**Archivos:**
- Modificar: `efectivoya-app/app/(admin)/clientes/[id].tsx`

**Step 1: Localizar la card "Información" (~línea 151)**

La card tiene `InfoRow` para Email, DNI, WhatsApp, Código referido, Saldo, Registrado.

**Step 2: Agregar 3 InfoRow después de WhatsApp**

```tsx
<InfoRow label="Email" value={user.email} />
<InfoRow label="DNI" value={user.dni} />
<InfoRow label="WhatsApp" value={user.whatsapp} />
<InfoRow label="Departamento" value={user.departamento || '—'} />
<InfoRow label="Distrito" value={user.distrito || '—'} />
<InfoRow label="Dirección" value={user.direccion || '—'} />
<InfoRow label="Código referido" value={user.codigo_referido} />
```

**Step 3: Commit**

```bash
git add efectivoya-app/app/(admin)/clientes/[id].tsx
git commit -m "feat: mostrar ubicacion del usuario en detalle de cliente admin"
```

---

## Task 13: Panel admin — detalle de recarga

**Archivos:**
- Modificar: `efectivoya-app/app/(admin)/recargas/[id].tsx`

**Step 1: Leer el archivo para identificar dónde se muestran los datos del usuario**

Buscar la sección donde se renderizan `data.usuario.email`, `data.usuario.nombres`, etc.

**Step 2: Agregar sección "Ubicación" en la card del usuario**

Después de la fila de WhatsApp del usuario (o donde se muestren los datos del usuario), agregar:

```tsx
{/* Sub-sección ubicación */}
<View style={styles.ubicacionHeader}>
  <Text style={styles.ubicacionTitle}>Ubicación</Text>
</View>
<InfoRow label="Departamento" value={data.usuario.departamento || '—'} />
<InfoRow label="Distrito" value={data.usuario.distrito || '—'} />
<InfoRow label="Dirección" value={data.usuario.direccion || '—'} />
```

Si la pantalla no tiene un componente `InfoRow` local, crear uno similar al de `clientes/[id].tsx` o usar `Text` directamente:

```tsx
<View style={styles.infoRow}>
  <Text style={styles.infoLabel}>Departamento</Text>
  <Text style={styles.infoValue}>{data.usuario.departamento || '—'}</Text>
</View>
```

> **Nota:** La pantalla ya tiene un patrón de `InfoRow` — seguir el mismo estilo visual.

**Step 3: Commit**

```bash
git add efectivoya-app/app/(admin)/recargas/[id].tsx
git commit -m "feat: mostrar ubicacion del usuario en detalle de recarga admin"
```

---

## Task 14: Panel admin — detalle de retiro

**Archivos:**
- Modificar: `efectivoya-app/app/(admin)/retiros/[id].tsx`

**Step 1: Localizar dónde se renderizan los datos del usuario en la pantalla**

Buscar `data.retiro.usuario.email`, `data.retiro.usuario.nombres`, etc.

**Step 2: Agregar los 3 campos de ubicación junto a los datos del usuario**

Siguiendo el mismo patrón visual de la pantalla:

```tsx
{/* Ubicación del usuario */}
<View style={styles.infoRow}>
  <Text style={styles.infoLabel}>Departamento</Text>
  <Text style={styles.infoValue}>{data.retiro.usuario.departamento || '—'}</Text>
</View>
<View style={styles.infoRow}>
  <Text style={styles.infoLabel}>Distrito</Text>
  <Text style={styles.infoValue}>{data.retiro.usuario.distrito || '—'}</Text>
</View>
<View style={styles.infoRow}>
  <Text style={styles.infoLabel}>Dirección</Text>
  <Text style={styles.infoValue}>{data.retiro.usuario.direccion || '—'}</Text>
</View>
```

> **Importante:** `retiros/[id].tsx` usa `Alert.alert` → `setMessage()` + banner inline para web. NO agregar `Alert.alert` para errores relacionados con ubicación.

**Step 3: Commit**

```bash
git add efectivoya-app/app/(admin)/retiros/[id].tsx
git commit -m "feat: mostrar ubicacion del usuario en detalle de retiro admin"
```

---

## Task 15: Verificar TypeScript del frontend

**Step 1: Verificar compilación TypeScript**

```bash
cd efectivoya-app && npx tsc --noEmit
```

Resultado esperado: sin errores. Si hay errores de tipos, corregirlos.

**Errores comunes:**
- `Property 'direccion' does not exist on type 'User'` → verificar Task 8 Step 1
- `Property 'departamento' does not exist on type 'AdminUserDetail'` → verificar Task 8 Step 3
- `Argument of type ... is not assignable` en `updateProfile` → verificar Task 8 Step 6

---

## Task 16: Prueba manual end-to-end

**Step 1: Iniciar backend**

```bash
cd efectivoya-backend && npm run dev
```

**Step 2: Iniciar app**

```bash
cd efectivoya-app && npx expo start
```

**Step 3: Flujo de registro**

1. Ir a la pantalla de registro.
2. Verificar que aparecen los campos "Departamento", "Distrito" y "Dirección" después de WhatsApp.
3. Intentar registrarse sin llenar el departamento → debe aparecer error.
4. Seleccionar un departamento del picker (verificar que la lista de 25 departamentos abre y cierra correctamente).
5. Completar registro exitoso → ir a verify OTP → login.

**Step 4: Editar perfil**

1. Ir a Perfil → Editar Perfil.
2. Verificar que los campos de ubicación aparecen con los valores actuales.
3. Cambiar el departamento y guardar.
4. Verificar que el cambio se refleja.

**Step 5: Panel admin — cliente**

1. Login como admin (`admin@efectivoya.com` / `Admin123!@#`).
2. Ir a Clientes → seleccionar el usuario registrado.
3. Verificar que la card "Información" muestra "Departamento", "Distrito" y "Dirección".

**Step 6: Panel admin — recarga**

1. El usuario de prueba realiza una recarga.
2. En el admin, ir al detalle de esa recarga.
3. Verificar que en la sección del usuario aparece la ubicación.

**Step 7: Panel admin — retiro** (si hay un retiro pendiente)

1. Ir al detalle de un retiro.
2. Verificar que aparecen Departamento, Distrito y Dirección.

---

## Resumen de archivos modificados

| Archivo | Cambio |
|---------|--------|
| `efectivoya-backend/prisma/schema.prisma` | +3 campos en User |
| `efectivoya-backend/src/utils/validators.util.ts` | +DEPARTAMENTOS_PERU |
| `efectivoya-backend/src/controllers/auth.controller.ts` | register, updateProfile, getProfile, login, verifyEmail |
| `efectivoya-backend/src/controllers/adminRecargas.controller.ts` | getDetalle — select + response |
| `efectivoya-backend/src/controllers/adminRetiros.controller.ts` | getDetalle — select + response |
| `efectivoya-app/src/types/index.ts` | User + RegisterData |
| `efectivoya-app/src/types/admin.ts` | AdminUserDetail + AdminRecargaDetalle + AdminRetiroDetalle |
| `efectivoya-app/src/services/auth.service.ts` | tipo updateProfile |
| `efectivoya-app/src/components/DepartamentoPicker.tsx` | NUEVO |
| `efectivoya-app/app/(auth)/register.tsx` | +3 campos |
| `efectivoya-app/app/(tabs)/perfil.tsx` | +3 campos en editar |
| `efectivoya-app/app/(admin)/clientes/[id].tsx` | +3 InfoRow |
| `efectivoya-app/app/(admin)/recargas/[id].tsx` | +3 filas ubicación |
| `efectivoya-app/app/(admin)/retiros/[id].tsx` | +3 filas ubicación |
