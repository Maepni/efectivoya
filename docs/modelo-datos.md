# Modelo de Datos - EfectivoYa

## Schema Prisma Completo

Ubicación: `efectivoya-backend/prisma/schema.prisma`

### Modelos Principales

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios de la app (billetera digital) |
| `UserBank` | Cuentas bancarias registradas por usuario |
| `Recarga` | Solicitudes de recarga de saldo |
| `Retiro` | Solicitudes de retiro/transferencia |
| `Admin` | Administradores del sistema |
| `Configuracion` | Configuración global (comisiones, límites) |
| `AuditLog` | Logs de auditoría |
| `Referido` | Sistema de referidos |
| `AlertaSeguridad` | Alertas automáticas de seguridad |
| `ChatSoporte` | Chats de soporte |
| `ChatMensaje` | Mensajes de chat |
| `FAQ` | Preguntas frecuentes |
| `TerminosCondiciones` | Términos y condiciones |
| `PoliticasPrivacidad` | Políticas de privacidad |
| `VideoInstructivo` | Videos de ayuda por banco |

### Enums

```prisma
enum BancoEnum { BCP, Interbank, Scotiabank, BBVA }
enum EstadoOperacion { pendiente, aprobado, rechazado }
enum RolAdmin { super_admin, admin }
enum TipoAlerta { multiples_recargas, retiro_inmediato, boucher_duplicado, patron_sospechoso }
enum EstadoChat { abierto, cerrado }
enum RemitenteChat { usuario, admin }
```

### Campos Importantes User

```prisma
model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  password_hash         String
  nombres               String
  apellidos             String
  dni                   String    @unique  // 8 dígitos
  numero_documento      String
  whatsapp              String              // 9 dígitos
  saldo_actual          Decimal   @default(0) @db.Decimal(12, 2)
  email_verificado      Boolean   @default(false)
  is_active             Boolean   @default(true)
  codigo_referido       String    @unique  // EFECTIVO-XXXXXX
  referido_por          String?
  bono_referido_usado   Boolean   @default(false)
  push_token            String?
}
```

### Campos Importantes Recarga

```prisma
model Recarga {
  numero_operacion      String    @unique
  banco_origen          BancoEnum
  monto_depositado      Decimal   @db.Decimal(12, 2)
  porcentaje_comision   Decimal   @db.Decimal(5, 2)  // Se guarda para histórico
  comision_calculada    Decimal   @db.Decimal(12, 2)
  monto_neto            Decimal   @db.Decimal(12, 2)
  boucher_url           String
  estado                EstadoOperacion @default(pendiente)
  motivo_rechazo        String?
  comprobante_pdf_url   String?
}
```

### Configuración Global

```prisma
model Configuracion {
  porcentaje_comision       Decimal   @default(5.0)    // Comisión recargas
  monto_minimo_recarga      Decimal   @default(1000)   // S/. 1,000
  monto_maximo_recarga      Decimal   @default(100000) // S/. 100,000
  cuenta_recaudadora_numero String
  cuenta_recaudadora_banco  String
  cuenta_recaudadora_titular String
  bono_referido             Decimal   @default(10.0)   // S/. 10
  max_referidos_por_usuario Int       @default(10)
}
```
