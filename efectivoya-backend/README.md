# EfectivoYa Backend

API REST para la aplicación de billetera digital EfectivoYa.

## Stack Tecnológico

- Node.js + Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication

## Instalación

1. Clonar el repositorio

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. Configurar base de datos:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Iniciar servidor de desarrollo:
```bash
npm run dev
```

## Scripts Disponibles

- `npm run dev` - Servidor de desarrollo con hot reload
- `npm run build` - Compilar TypeScript a JavaScript
- `npm start` - Iniciar servidor en producción
- `npm run prisma:generate` - Generar cliente de Prisma
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:studio` - Abrir Prisma Studio

## Estructura del Proyecto

```
src/
├── controllers/   # Lógica de negocio
├── middleware/    # Middlewares personalizados
├── routes/        # Definición de rutas
├── services/      # Servicios auxiliares
├── utils/         # Utilidades
├── types/         # Tipos TypeScript
├── app.ts         # Configuración de Express
└── server.ts      # Punto de entrada
```

## Health Check

```bash
curl http://localhost:3000/health
```

## Licencia

MIT
