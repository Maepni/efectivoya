# EfectivoYa — Guía de Despliegue en Producción

**VPS:** `bryam@<IP_VPS>` · Ruta base: `/var/www/efectivoya/`
**Repositorio:** `https://github.com/Maepni/efectivoya`

## Infraestructura Prod

| Servicio | URL | Origen |
|----------|-----|--------|
| API Backend | `https://api.efectivoya.net` | pm2 → Node.js puerto 3005 |
| App web | `https://app.efectivoya.net` | nginx → `/var/www/efectivoya/admin-web/` |
| Landing | `https://efectivoya.net` | nginx → `/var/www/efectivoya/landing/` |

---

## Flujos por Tipo de Cambio

---

### 1. Cambio en Backend (TypeScript / rutas / lógica)
> Sin modificación de `schema.prisma`

**Local:**
```bash
cd efectivoya-backend
npm run build          # Verificar que compila sin errores
git add -p             # Revisar cambios
git commit -m "feat/fix: descripción"
git push origin master
```

**VPS:**
```bash
cd /var/www/efectivoya/efectivoya-backend
git pull origin master
npm run build
pm2 restart efectivoya-backend
pm2 logs efectivoya-backend --lines 20   # Verificar que arrancó sin errores
```

---

### 2. Cambio en Backend + Schema Prisma
> Cuando se modifica `efectivoya-backend/prisma/schema.prisma`

**Local:**
```bash
cd efectivoya-backend
npx prisma generate    # Regenerar tipos
npm run build          # Verificar compilación
git add prisma/schema.prisma src/
git commit -m "feat: descripción del cambio de schema"
git push origin master
```

**VPS:**
```bash
cd /var/www/efectivoya/efectivoya-backend
git pull origin master
npx prisma generate    # ← OBLIGATORIO: regenera el cliente Prisma
npx prisma db push     # ← Aplica cambios al schema de la DB (sin borrar datos)
npm run build
pm2 restart efectivoya-backend
pm2 logs efectivoya-backend --lines 20
```

> ⚠️ Nunca usar `prisma migrate dev` en el VPS (requiere shell interactivo). Siempre `prisma db push`.

---

### 3. Cambio en la App Web (Expo)
> Archivos en `efectivoya-app/`

**Local:**
```bash
cd efectivoya-app
npx tsc --noEmit                    # Verificar TypeScript
npx expo export --platform web      # Genera efectivoya-app/dist/
git add src/ app/
git commit -m "feat/fix: descripción"
git push origin master
```

**Subir al VPS (desde local):**
```bash
# Desde la raíz del proyecto
rsync -avz --delete efectivoya-app/dist/ bryam@<IP_VPS>:/var/www/efectivoya/admin-web/
```

> No hace falta reiniciar nginx — los archivos estáticos se sirven directamente.
> Forzar caché en el navegador: `Ctrl+Shift+R` o abrir en incógnito.

---

### 4. Cambio en la Landing (Astro)
> Archivos en `efectivoya-landing/src/`

**Local:**
```bash
cd efectivoya-landing
npm run build          # Verificar build (genera dist/)
npm run preview        # Opcional: previsualizar localmente en :4321
git add src/
git commit -m "feat/fix: descripción"
git push origin master
```

**VPS:**
```bash
cd /var/www/efectivoya/efectivoya-landing
git pull origin master
npm run build
cp -r dist/* /var/www/efectivoya/landing/
```

> Los assets de Astro tienen fingerprint en el nombre (`_astro/index.Abc123.css`), por lo que el caché del navegador se invalida automáticamente.

---

### 5. Cambio en Variables de Entorno del Backend
> Agregar/modificar `.env` en el VPS

**VPS:**
```bash
nano /var/www/efectivoya/efectivoya-backend/.env
# Guardar cambios (Ctrl+O, Enter, Ctrl+X)

pm2 restart efectivoya-backend
pm2 logs efectivoya-backend --lines 10
```

**Caso especial — añadir nuevo origen CORS (`FRONTEND_URL`):**
```bash
# Formato: múltiples orígenes separados por coma
FRONTEND_URL=https://efectivoya.net,https://app.efectivoya.net
```
Después de editar `.env`, reiniciar el backend con pm2.

---

### 6. Cambio en Configuración de Nginx
> Nuevos subdominios, rutas, headers, etc.

**VPS:**
```bash
sudo nano /etc/nginx/sites-available/efectivoya
# Editar la configuración

sudo nginx -t                        # Verificar sintaxis
sudo systemctl reload nginx          # Aplicar sin downtime
```

**Añadir SSL para nuevo subdominio:**
```bash
sudo certbot --nginx -d nuevo.efectivoya.net
# Certbot actualiza nginx automáticamente y recarga
```

---

### 7. Cambio en Ambos (Backend + App Web)
> Cuando un feature require cambios en API y frontend

**Local:**
```bash
# 1. Backend
cd efectivoya-backend && npm run build

# 2. App web
cd ../efectivoya-app && npx tsc --noEmit && npx expo export --platform web

# 3. Commit todo junto
cd ..
git add efectivoya-backend/src/ efectivoya-app/src/ efectivoya-app/app/
git commit -m "feat: descripción del feature completo"
git push origin master
```

**VPS — primero backend, luego frontend:**
```bash
# 1. Backend
cd /var/www/efectivoya/efectivoya-backend
git pull origin master
npm run build && pm2 restart efectivoya-backend

# 2. App web (desde local)
rsync -avz --delete efectivoya-app/dist/ bryam@<IP_VPS>:/var/www/efectivoya/admin-web/
```

---

## Comandos de Verificación

```bash
# Estado de los servicios
pm2 status
pm2 logs efectivoya-backend --lines 50

# Health check de la API
curl -s https://api.efectivoya.net/health | python3 -m json.tool

# Verificar que los tres dominios responden
curl -I https://efectivoya.net
curl -I https://app.efectivoya.net
curl -I https://api.efectivoya.net/health

# Logs de nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## Rollback Rápido

```bash
# Ver commits recientes en VPS
cd /var/www/efectivoya
git log --oneline -10

# Volver al commit anterior
git reset --hard HEAD~1
cd efectivoya-backend && npm run build && pm2 restart efectivoya-backend
```

---

## Checklist Pre-Deploy

- [ ] `npm run build` pasa sin errores localmente
- [ ] `npx tsc --noEmit` pasa en la app (si hubo cambios en app web)
- [ ] Cambios commiteados y pusheados a `master`
- [ ] Si hay cambio de schema: `prisma generate` + `prisma db push` en VPS
- [ ] Si hay cambio de CORS: actualizar `FRONTEND_URL` en `.env` del VPS
- [ ] Verificar con `curl -I` que los dominios responden 200
- [ ] Revisar `pm2 logs` buscando errores tras el reinicio
