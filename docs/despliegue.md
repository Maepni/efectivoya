---                                                                                                                           
Guía de Despliegue en Produccion — EfectivoYa                                                                                 
                                                                                                                            
Resumen de la arquitectura                                                                                                    
                                                                                                                            
Internet
    │
    ▼
[Nginx :443] ─── SSL (Let's Encrypt)
    │
    ├── /api/*  → Backend Node.js (Puerto 3000, PM2)
    ├── /socket.io/* → Socket.io (mismo proceso)
    └── /admin  → Panel admin web (build estático)

[PostgreSQL]  → Base de datos local en VPS
[Cloudinary]  → Archivos (bouchers, PDFs, videos) — ya en la nube
[EAS Build]   → Genera APK/IPA para la app móvil

---
PARTE 1 — Preparar el VPS

1.1 Actualizar el servidor

ssh root@TU_IP_VPS

apt update && apt upgrade -y

1.2 Crear usuario no-root (buena práctica)

adduser deploy
usermod -aG sudo deploy

# Copiar tu clave SSH al nuevo usuario
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Verificar acceso y cambiar a ese usuario
su - deploy

1.3 Configurar firewall

ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
ufw status

---
PARTE 2 — Instalar dependencias

2.1 Node.js 20 LTS

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # debe mostrar v20.x.x
npm -v

2.2 PM2 (process manager)

sudo npm install -g pm2

2.3 PostgreSQL 16

sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

2.4 Nginx

sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

2.5 Certbot (SSL)

sudo apt install -y certbot python3-certbot-nginx

---
PARTE 3 — Configurar PostgreSQL

# Entrar como postgres
sudo -u postgres psql

-- En la consola de psql:
CREATE DATABASE efectivoya_db;
CREATE USER efectivoya_user WITH ENCRYPTED PASSWORD 'TU_PASSWORD_SEGURO';
GRANT ALL PRIVILEGES ON DATABASE efectivoya_db TO efectivoya_user;
\q

---
PARTE 4 — Subir el código al servidor

4.1 Opción A: Git (recomendada)

En tu máquina local, asegúrate de tener el código en un repositorio (GitHub/GitLab):

# En el VPS
mkdir -p /var/www/efectivoya
cd /var/www/efectivoya

git clone https://github.com/TU_USUARIO/TU_REPO.git .

4.2 Opción B: SCP (si no usas Git)

# Desde tu máquina local:
scp -r /home/mapins/Escritorio/efectivoya/efectivoya-backend deploy@TU_IP:/var/www/efectivoya/
scp -r /home/mapins/Escritorio/efectivoya/efectivoya-app deploy@TU_IP:/var/www/efectivoya/

---
PARTE 5 — Configurar y desplegar el Backend

5.1 Variables de entorno

cd /var/www/efectivoya/efectivoya-backend

# Crear el .env de producción
nano .env

Contenido del .env en producción:

# Base de datos
DATABASE_URL=postgresql://efectivoya_user:TU_PASSWORD_SEGURO@localhost:5432/efectivoya_db

# JWT — generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=GENERA_UN_SECRET_64_CHARS_HEX
JWT_REFRESH_SECRET=GENERA_OTRO_SECRET_64_CHARS_HEX_DIFERENTE

# Server
PORT=3000
NODE_ENV=production

# Cloudinary (tus credenciales reales)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Email Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu_app_password_gmail
SMTP_FROM_NAME=EfectivoYa
SMTP_FROM_EMAIL=noreply@tudominio.com

# CORS — tu dominio real
FRONTEND_URL=https://tudominio.com

# Firebase (opcional — si usas push notifications)
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com

Generar los secrets JWT:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Ejecuta dos veces para obtener JWT_SECRET y JWT_REFRESH_SECRET diferentes

5.2 Instalar dependencias y compilar

cd /var/www/efectivoya/efectivoya-backend

npm install
npm run build     # Compila TypeScript → dist/

Verificar que no hay errores de TypeScript antes de continuar.

5.3 Sincronizar la base de datos con Prisma

# NO usar prisma migrate dev en producción
npx prisma db push

# Verificar que el schema se aplicó correctamente
npx prisma studio   # opcional, abre interfaz web en puerto 5555

5.4 Correr el Seed inicial

npm run prisma:seed

Esto crea:
- Admin: admin@efectivoya.com / Admin123!@# (cambiar contraseña después)
- Configuración de comisiones por banco
- 4 registros de videos por banco (sin URL todavía)

5.5 Lanzar con PM2

# Iniciar el backend compilado
pm2 start dist/server.js --name "efectivoya-backend"

# Guardar la configuración de PM2 para que reinicie al reboot
pm2 save
pm2 startup   # sigue las instrucciones que imprime este comando

# Verificar que corre
pm2 status
pm2 logs efectivoya-backend --lines 50

---
PARTE 6 — Panel Admin Web

El panel admin es una app Expo que corre en web. Para producción hay dos opciones:

Opción A: Build estático (recomendada)

# En tu máquina LOCAL (no en el VPS)
cd /home/mapins/Escritorio/efectivoya/efectivoya-app

# Instalar dependencias
npm install --legacy-peer-deps

# Exportar la app web como estático
npx expo export --platform web
# Genera la carpeta dist/

Subir el build al VPS:

# Desde tu máquina local
scp -r dist/ deploy@TU_IP:/var/www/efectivoya/admin-web/

Opción B: Servir con Expo directamente (más simple, menos óptima)

# En el VPS
cd /var/www/efectivoya/efectivoya-app
npm install --legacy-peer-deps
pm2 start "npx expo start --web --port 8081" --name "efectivoya-admin"

---
PARTE 7 — Configurar Nginx

7.1 Crear el config de Nginx

sudo nano /etc/nginx/sites-available/efectivoya

Contenido (ajusta tudominio.com):

# Redirigir HTTP → HTTPS
server {
    listen 80;
    server_name tudominio.com www.tudominio.com api.tudominio.com;
    return 301 https://$host$request_uri;
}

# API Backend (api.tudominio.com)
server {
    listen 443 ssl;
    server_name api.tudominio.com;

    # SSL — Certbot lo completará después
    # ssl_certificate /etc/letsencrypt/live/api.tudominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.tudominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # Headers necesarios para Socket.io
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts para uploads grandes (videos 50MB)
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        client_max_body_size 55M;
    }
}

# Panel Admin Web (tudominio.com)
server {
    listen 443 ssl;
    server_name tudominio.com www.tudominio.com;

    # SSL — Certbot lo completará después
    # ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    root /var/www/efectivoya/admin-web;
    index index.html;

    # SPA routing — redirigir todo a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}

7.2 Activar el sitio

sudo ln -s /etc/nginx/sites-available/efectivoya /etc/nginx/sites-enabled/
sudo nginx -t          # verificar que el config es válido
sudo systemctl reload nginx

---
PARTE 8 — SSL con Let's Encrypt

Requisito: Tu dominio debe apuntar al IP del VPS (registros DNS A configurados) antes de correr Certbot.

# Obtener certificado para ambos dominios
sudo certbot --nginx -d tudominio.com -d www.tudominio.com -d api.tudominio.com

# Certbot modifica automáticamente el nginx.conf con las rutas SSL
# Verificar auto-renovación
sudo certbot renew --dry-run

---
PARTE 9 — Actualizar la URL en la App Móvil

En efectivoya-app/src/config/api.ts ya está configurado:

const PROD_API_URL = 'https://api.efectivoya.com';  // ← cambiar a tu dominio real

Edita el archivo con tu dominio real antes de hacer el build móvil:

const PROD_API_URL = 'https://api.tudominio.com';

---
PARTE 10 — Build de la App Móvil (APK / IPA)

La app móvil usa Expo y requiere EAS Build para generar los binarios nativos (biometría no funciona en Expo Go).

10.1 Instalar EAS CLI

# En tu máquina local
npm install -g eas-cli
eas login    # login con tu cuenta Expo

10.2 Configurar EAS

cd /home/mapins/Escritorio/efectivoya/efectivoya-app
eas build:configure   # genera eas.json

Editar eas.json generado:

{
"cli": {
    "version": ">= 10.0.0"
},
"build": {
    "development": {
    "developmentClient": true,
    "distribution": "internal"
    },
    "preview": {
    "distribution": "internal",
    "android": {
        "buildType": "apk"
    }
    },
    "production": {
    "android": {
        "buildType": "app-bundle"
    }
    }
}
}

10.3 Variables de entorno en EAS

# Configurar la URL de producción en EAS
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.tudominio.com"

10.4 Generar APK (Android)

# APK para distribuir directamente (sin Play Store)
eas build --platform android --profile preview

# AAB para subir a Play Store
eas build --platform android --profile production

10.5 Generar IPA (iOS)

# Requiere cuenta Apple Developer ($99/año)
eas build --platform ios --profile production

EAS Build corre en la nube de Expo y te manda el APK/IPA por email cuando termina (aprox. 10-20 min).

---
PARTE 11 — Seguridad Post-Despliegue

11.1 Cambiar contraseña del admin por defecto

Después del seed, entrar al panel admin y cambiar la contraseña de admin@efectivoya.com.

11.2 Proteger archivos sensibles

# En el VPS, restringir permisos del .env
chmod 600 /var/www/efectivoya/efectivoya-backend/.env
chown deploy:deploy /var/www/efectivoya/efectivoya-backend/.env

11.3 Configurar backups de PostgreSQL

# Crear script de backup diario
sudo nano /etc/cron.daily/backup-efectivoya

#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/var/backups/efectivoya

mkdir -p $BACKUP_DIR

# Dump de la base de datos
sudo -u postgres pg_dump efectivoya_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Mantener solo los últimos 30 días
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

sudo chmod +x /etc/cron.daily/backup-efectivoya

---
PARTE 12 — Flujo de actualizaciones futuras

Cada vez que hagas cambios y quieras desplegar:

# En el VPS
cd /var/www/efectivoya/efectivoya-backend

git pull origin main                  # traer cambios
npm install                            # si hay nuevas dependencias
npm run build                          # compilar TypeScript
npx prisma db push                     # si hay cambios en schema

pm2 restart efectivoya-backend         # reiniciar sin downtime
pm2 logs efectivoya-backend --lines 20 # verificar que arrancó bien

---
Resumen de URLs finales

┌──────────────────────┬──────────────────────────────────┐
│       Servicio       │               URL                │
├──────────────────────┼──────────────────────────────────┤
│ API REST + Socket.io │ https://api.tudominio.com        │
├──────────────────────┼──────────────────────────────────┤
│ Panel Admin Web      │ https://tudominio.com            │
├──────────────────────┼──────────────────────────────────┤
│ Health check         │ https://api.tudominio.com/health │
├──────────────────────┼──────────────────────────────────┤
│ App Android (APK)    │ Descarga directa o Play Store    │
├──────────────────────┼──────────────────────────────────┤
│ App iOS              │ TestFlight o App Store           │
└──────────────────────┴──────────────────────────────────┘

---
Checklist antes de ir live

- DNS apuntando al VPS (A records para tudominio.com y api.tudominio.com)
- Variables de entorno en .env con valores reales (no de ejemplo)
- JWT secrets generados con crypto.randomBytes(64)
- Cloudinary configurado con credenciales reales
- SMTP configurado y probado
- npm run build sin errores TypeScript
- npx prisma db push ejecutado
- npm run prisma:seed ejecutado
- PM2 corriendo y configurado para autostart
- Nginx configurado y SSL activo
- Contraseña admin por defecto cambiada
- PROD_API_URL en api.ts apuntando al dominio real
- EAS Build generado con EXPO_PUBLIC_API_URL de producción
- Backups automáticos configurados
- Firewall activo (solo puertos 22, 80, 443)
