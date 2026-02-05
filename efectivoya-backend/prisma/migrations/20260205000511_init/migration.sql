-- CreateEnum
CREATE TYPE "BancoEnum" AS ENUM ('BCP', 'Interbank', 'Scotiabank', 'BBVA');

-- CreateEnum
CREATE TYPE "EstadoOperacion" AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "RolAdmin" AS ENUM ('super_admin', 'admin');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('multiples_recargas', 'retiro_inmediato', 'boucher_duplicado', 'patron_sospechoso');

-- CreateEnum
CREATE TYPE "EstadoChat" AS ENUM ('abierto', 'cerrado');

-- CreateEnum
CREATE TYPE "RemitenteChat" AS ENUM ('usuario', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "numero_documento" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "saldo_actual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "codigo_referido" TEXT NOT NULL,
    "referido_por" TEXT,
    "bono_referido_usado" BOOLEAN NOT NULL DEFAULT false,
    "push_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_banks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "banco" "BancoEnum" NOT NULL,
    "numero_cuenta" TEXT NOT NULL,
    "cci" TEXT NOT NULL,
    "alias" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recargas" (
    "id" TEXT NOT NULL,
    "numero_operacion" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "banco_origen" "BancoEnum" NOT NULL,
    "monto_depositado" DECIMAL(12,2) NOT NULL,
    "porcentaje_comision" DECIMAL(5,2) NOT NULL,
    "comision_calculada" DECIMAL(12,2) NOT NULL,
    "monto_neto" DECIMAL(12,2) NOT NULL,
    "boucher_url" TEXT NOT NULL,
    "estado" "EstadoOperacion" NOT NULL DEFAULT 'pendiente',
    "admin_id" TEXT,
    "motivo_rechazo" TEXT,
    "comprobante_pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "recargas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retiros" (
    "id" TEXT NOT NULL,
    "numero_operacion" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_bank_id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoOperacion" NOT NULL DEFAULT 'pendiente',
    "admin_id" TEXT,
    "motivo_rechazo" TEXT,
    "comprobante_pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "retiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolAdmin" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "porcentaje_comision" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "monto_minimo_recarga" DECIMAL(12,2) NOT NULL DEFAULT 1000,
    "monto_maximo_recarga" DECIMAL(12,2) NOT NULL DEFAULT 100000,
    "cuenta_recaudadora_numero" TEXT NOT NULL,
    "cuenta_recaudadora_banco" TEXT NOT NULL,
    "cuenta_recaudadora_titular" TEXT NOT NULL,
    "mantenimiento_activo" BOOLEAN NOT NULL DEFAULT false,
    "mensaje_mantenimiento" TEXT,
    "version_minima_android" TEXT NOT NULL DEFAULT '1.0.0',
    "version_minima_ios" TEXT NOT NULL DEFAULT '1.0.0',
    "forzar_actualizacion" BOOLEAN NOT NULL DEFAULT false,
    "bono_referido" DECIMAL(12,2) NOT NULL DEFAULT 10.0,
    "max_referidos_por_usuario" INTEGER NOT NULL DEFAULT 10,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "admin_id" TEXT,
    "accion" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "detalles" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referidos" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_id" TEXT NOT NULL,
    "bono_otorgado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_primera_recarga" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_seguridad" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "detalles" JSONB,
    "revisada" BOOLEAN NOT NULL DEFAULT false,
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "alertas_seguridad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_soporte" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "admin_id" TEXT,
    "estado" "EstadoChat" NOT NULL DEFAULT 'abierto',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "chat_soporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_mensajes" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "remitente_tipo" "RemitenteChat" NOT NULL,
    "remitente_id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminos_condiciones" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "contenido" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminos_condiciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "politicas_privacidad" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "contenido" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "politicas_privacidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos_instructivos" (
    "id" TEXT NOT NULL,
    "banco" "BancoEnum" NOT NULL,
    "youtube_url" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_instructivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "users_codigo_referido_key" ON "users"("codigo_referido");

-- CreateIndex
CREATE UNIQUE INDEX "recargas_numero_operacion_key" ON "recargas"("numero_operacion");

-- CreateIndex
CREATE UNIQUE INDEX "retiros_numero_operacion_key" ON "retiros"("numero_operacion");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_accion_idx" ON "audit_logs"("accion");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "referidos_referrer_id_referred_id_key" ON "referidos"("referrer_id", "referred_id");

-- CreateIndex
CREATE INDEX "alertas_seguridad_revisada_idx" ON "alertas_seguridad"("revisada");

-- CreateIndex
CREATE INDEX "alertas_seguridad_created_at_idx" ON "alertas_seguridad"("created_at");

-- CreateIndex
CREATE INDEX "chat_mensajes_chat_id_idx" ON "chat_mensajes"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "videos_instructivos_banco_key" ON "videos_instructivos"("banco");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referido_por_fkey" FOREIGN KEY ("referido_por") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_banks" ADD CONSTRAINT "user_banks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargas" ADD CONSTRAINT "recargas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargas" ADD CONSTRAINT "recargas_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros" ADD CONSTRAINT "retiros_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros" ADD CONSTRAINT "retiros_user_bank_id_fkey" FOREIGN KEY ("user_bank_id") REFERENCES "user_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros" ADD CONSTRAINT "retiros_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referidos" ADD CONSTRAINT "referidos_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referidos" ADD CONSTRAINT "referidos_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_seguridad" ADD CONSTRAINT "alertas_seguridad_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_seguridad" ADD CONSTRAINT "alertas_seguridad_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_soporte" ADD CONSTRAINT "chat_soporte_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_soporte" ADD CONSTRAINT "chat_soporte_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mensajes" ADD CONSTRAINT "chat_mensajes_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat_soporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
