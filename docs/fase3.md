## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

IMPORTANTE: Las FASES 1 y 2 ya están completadas. Tienes:
- Backend base con Prisma + PostgreSQL ✅
- Sistema de autenticación completo con JWT ✅
- Middleware authMiddleware funcionando ✅

## OBJETIVO DE ESTA FASE
Implementar el módulo completo de gestión de bancos del usuario:
- Registrar bancos (BCP, Interbank, Scotiabank, BBVA)
- Listar bancos del usuario con enmascaramiento de datos sensibles
- Editar bancos existentes
- Eliminar bancos (con validación de retiros pendientes)
- Validaciones robustas de número de cuenta (min 13 dígitos) y CCI (exactamente 20 dígitos)
- Logs de auditoría automáticos

## ESTRUCTURA A CREAR
efectivoya-backend/src/
├── controllers/
│   └── userBanks.controller.ts
├── routes/
│   └── userBanks.routes.ts
└── utils/
└── maskData.util.ts

## INSTRUCCIONES DETALLADAS

### 1. UTILIDAD DE ENMASCARAMIENTO (src/utils/maskData.util.ts)
```typescript
export class MaskDataUtil {
  /**
   * Enmascara un número de cuenta mostrando solo los últimos 4 dígitos
   * Ejemplo: "123456789012345" → "****2345"
   */
  static maskCuenta(cuenta: string): string {
    if (!cuenta || cuenta.length < 4) return cuenta;
    return '****' + cuenta.slice(-4);
  }

  /**
   * Enmascara un CCI mostrando solo los últimos 4 dígitos
   * Ejemplo: "12345678901234567890" → "****7890"
   */
  static maskCCI(cci: string): string {
    if (!cci || cci.length < 4) return cci;
    return '****' + cci.slice(-4);
  }

  /**
   * Enmascara un DNI mostrando solo los últimos 3 dígitos
   * Ejemplo: "12345678" → "*****678"
   */
  static maskDNI(dni: string): string {
    if (!dni || dni.length < 3) return dni;
    return '*'.repeat(dni.length - 3) + dni.slice(-3);
  }

  /**
   * Enmascara un email
   * Ejemplo: "juan.perez@gmail.com" → "j***z@gmail.com"
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return local[0] + '***' + local[local.length - 1] + '@' + domain;
  }
}
```

### 2. CONTROLADOR DE BANCOS (src/controllers/userBanks.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient, BancoEnum } from '@prisma/client';
import { AuthRequest } from '../types';
import { Validators } from '../utils/validators.util';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { MaskDataUtil } from '../utils/maskData.util';

const prisma = new PrismaClient();

export class UserBanksController {
  /**
   * 1. LISTAR BANCOS DEL USUARIO
   * GET /api/user-banks
   */
  static async listBanks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const bancos = await prisma.userBank.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      // Enmascarar datos sensibles
      const bancosEnmascarados = bancos.map(banco => ({
        id: banco.id,
        banco: banco.banco,
        numero_cuenta: MaskDataUtil.maskCuenta(banco.numero_cuenta),
        numero_cuenta_completo: banco.numero_cuenta, // Para uso interno si es necesario
        cci: MaskDataUtil.maskCCI(banco.cci),
        cci_completo: banco.cci, // Para uso interno si es necesario
        alias: banco.alias,
        created_at: banco.created_at,
        updated_at: banco.updated_at
      }));

      Logger.info(`Bancos listados para usuario ${userId}: ${bancos.length} bancos`);

      return res.json({
        success: true,
        data: {
          bancos: bancosEnmascarados,
          total: bancos.length
        }
      });
    } catch (error) {
      Logger.error('Error en listBanks:', error);
      return res.status(500).json({ success: false, message: 'Error al listar bancos' });
    }
  }

  /**
   * 2. OBTENER BANCO POR ID
   * GET /api/user-banks/:id
   */
  static async getBankById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const banco = await prisma.userBank.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!banco) {
        return res.status(404).json({ success: false, message: 'Banco no encontrado' });
      }

      // Enmascarar datos sensibles
      const bancoEnmascarado = {
        id: banco.id,
        banco: banco.banco,
        numero_cuenta: MaskDataUtil.maskCuenta(banco.numero_cuenta),
        numero_cuenta_completo: banco.numero_cuenta,
        cci: MaskDataUtil.maskCCI(banco.cci),
        cci_completo: banco.cci,
        alias: banco.alias,
        created_at: banco.created_at,
        updated_at: banco.updated_at
      };

      return res.json({
        success: true,
        data: { banco: bancoEnmascarado }
      });
    } catch (error) {
      Logger.error('Error en getBankById:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener banco' });
    }
  }

  /**
   * 3. REGISTRAR BANCO
   * POST /api/user-banks
   */
  static async registerBank(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { banco, numero_cuenta, cci, alias } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Validar banco
      const bancosValidos = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'];
      if (!bancosValidos.includes(banco)) {
        return res.status(400).json({
          success: false,
          message: 'Banco inválido. Opciones: BCP, Interbank, Scotiabank, BBVA'
        });
      }

      // Validar número de cuenta
      if (!Validators.isValidNumeroCuenta(numero_cuenta)) {
        return res.status(400).json({
          success: false,
          message: 'Número de cuenta inválido. Debe tener al menos 13 dígitos'
        });
      }

      // Validar CCI
      if (!Validators.isValidCCI(cci)) {
        return res.status(400).json({
          success: false,
          message: 'CCI inválido. Debe tener exactamente 20 dígitos'
        });
      }

      // Validar alias (opcional)
      if (alias && alias.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El alias no puede tener más de 50 caracteres'
        });
      }

      // Verificar que no exista el mismo banco con la misma cuenta
      const bancoExistente = await prisma.userBank.findFirst({
        where: {
          user_id: userId,
          banco: banco as BancoEnum,
          numero_cuenta
        }
      });

      if (bancoExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes registrado este banco con este número de cuenta'
        });
      }

      // Crear banco
      const nuevoBanco = await prisma.userBank.create({
        data: {
          user_id: userId,
          banco: banco as BancoEnum,
          numero_cuenta: numero_cuenta.trim(),
          cci: cci.trim(),
          alias: alias ? Validators.sanitizeString(alias) : null
        }
      });

      // Audit log
      await AuditLogService.log('banco_registrado', req, userId, undefined, {
        banco_id: nuevoBanco.id,
        banco: banco,
        alias: alias || null
      });

      Logger.info(`Banco registrado para usuario ${userId}: ${banco}`);

      // Enmascarar datos en respuesta
      return res.status(201).json({
        success: true,
        message: 'Banco registrado exitosamente',
        data: {
          banco: {
            id: nuevoBanco.id,
            banco: nuevoBanco.banco,
            numero_cuenta: MaskDataUtil.maskCuenta(nuevoBanco.numero_cuenta),
            cci: MaskDataUtil.maskCCI(nuevoBanco.cci),
            alias: nuevoBanco.alias,
            created_at: nuevoBanco.created_at
          }
        }
      });
    } catch (error) {
      Logger.error('Error en registerBank:', error);
      return res.status(500).json({ success: false, message: 'Error al registrar banco' });
    }
  }

  /**
   * 4. EDITAR BANCO
   * PUT /api/user-banks/:id
   */
  static async updateBank(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { numero_cuenta, cci, alias } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Verificar que el banco pertenece al usuario
      const bancoExistente = await prisma.userBank.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!bancoExistente) {
        return res.status(404).json({
          success: false,
          message: 'Banco no encontrado o no te pertenece'
        });
      }

      // Preparar datos a actualizar
      const dataToUpdate: any = {};

      // Validar y actualizar número de cuenta si se proporciona
      if (numero_cuenta !== undefined) {
        if (!Validators.isValidNumeroCuenta(numero_cuenta)) {
          return res.status(400).json({
            success: false,
            message: 'Número de cuenta inválido. Debe tener al menos 13 dígitos'
          });
        }
        dataToUpdate.numero_cuenta = numero_cuenta.trim();
      }

      // Validar y actualizar CCI si se proporciona
      if (cci !== undefined) {
        if (!Validators.isValidCCI(cci)) {
          return res.status(400).json({
            success: false,
            message: 'CCI inválido. Debe tener exactamente 20 dígitos'
          });
        }
        dataToUpdate.cci = cci.trim();
      }

      // Actualizar alias si se proporciona
      if (alias !== undefined) {
        if (alias && alias.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'El alias no puede tener más de 50 caracteres'
          });
        }
        dataToUpdate.alias = alias ? Validators.sanitizeString(alias) : null;
      }

      // Si no hay nada que actualizar
      if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }

      // Actualizar banco
      const bancoActualizado = await prisma.userBank.update({
        where: { id },
        data: dataToUpdate
      });

      // Audit log
      await AuditLogService.log('banco_editado', req, userId, undefined, {
        banco_id: id,
        campos_actualizados: Object.keys(dataToUpdate)
      });

      Logger.info(`Banco actualizado: ${id} - Usuario: ${userId}`);

      // Enmascarar datos en respuesta
      return res.json({
        success: true,
        message: 'Banco actualizado exitosamente',
        data: {
          banco: {
            id: bancoActualizado.id,
            banco: bancoActualizado.banco,
            numero_cuenta: MaskDataUtil.maskCuenta(bancoActualizado.numero_cuenta),
            cci: MaskDataUtil.maskCCI(bancoActualizado.cci),
            alias: bancoActualizado.alias,
            updated_at: bancoActualizado.updated_at
          }
        }
      });
    } catch (error) {
      Logger.error('Error en updateBank:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar banco' });
    }
  }

  /**
   * 5. ELIMINAR BANCO
   * DELETE /api/user-banks/:id
   */
  static async deleteBank(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Verificar que el banco pertenece al usuario
      const banco = await prisma.userBank.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!banco) {
        return res.status(404).json({
          success: false,
          message: 'Banco no encontrado o no te pertenece'
        });
      }

      // Verificar que no hay retiros pendientes con este banco
      const retirosPendientes = await prisma.retiro.findFirst({
        where: {
          user_bank_id: id,
          estado: 'pendiente'
        }
      });

      if (retirosPendientes) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar este banco porque tienes retiros pendientes asociados'
        });
      }

      // Eliminar banco
      await prisma.userBank.delete({
        where: { id }
      });

      // Audit log
      await AuditLogService.log('banco_eliminado', req, userId, undefined, {
        banco_id: id,
        banco: banco.banco,
        alias: banco.alias
      });

      Logger.info(`Banco eliminado: ${id} - Usuario: ${userId}`);

      return res.json({
        success: true,
        message: 'Banco eliminado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en deleteBank:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar banco' });
    }
  }

  /**
   * 6. OBTENER ESTADÍSTICAS DE BANCOS
   * GET /api/user-banks/stats
   */
  static async getBankStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Contar bancos por tipo
      const bancos = await prisma.userBank.findMany({
        where: { user_id: userId },
        select: { banco: true }
      });

      const stats = {
        total: bancos.length,
        por_banco: {
          BCP: bancos.filter(b => b.banco === 'BCP').length,
          Interbank: bancos.filter(b => b.banco === 'Interbank').length,
          Scotiabank: bancos.filter(b => b.banco === 'Scotiabank').length,
          BBVA: bancos.filter(b => b.banco === 'BBVA').length
        }
      };

      return res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      Logger.error('Error en getBankStats:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  }
}
```

### 3. RUTAS DE BANCOS (src/routes/userBanks.routes.ts)
```typescript
import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserBanksController } from '../controllers/userBanks.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// 1. Listar bancos del usuario
router.get('/', UserBanksController.listBanks);

// 2. Obtener estadísticas
router.get('/stats', UserBanksController.getBankStats);

// 3. Obtener banco por ID
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  UserBanksController.getBankById
);

// 4. Registrar banco
router.post(
  '/',
  [
    body('banco')
      .isIn(['BCP', 'Interbank', 'Scotiabank', 'BBVA'])
      .withMessage('Banco debe ser: BCP, Interbank, Scotiabank o BBVA'),
    body('numero_cuenta')
      .isString()
      .notEmpty()
      .isNumeric()
      .isLength({ min: 13 })
      .withMessage('Número de cuenta debe tener al menos 13 dígitos'),
    body('cci')
      .isString()
      .notEmpty()
      .isNumeric()
      .isLength({ min: 20, max: 20 })
      .withMessage('CCI debe tener exactamente 20 dígitos'),
    body('alias')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Alias no puede tener más de 50 caracteres')
  ],
  validateRequest,
  UserBanksController.registerBank
);

// 5. Editar banco
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('numero_cuenta')
      .optional()
      .isString()
      .isNumeric()
      .isLength({ min: 13 })
      .withMessage('Número de cuenta debe tener al menos 13 dígitos'),
    body('cci')
      .optional()
      .isString()
      .isNumeric()
      .isLength({ min: 20, max: 20 })
      .withMessage('CCI debe tener exactamente 20 dígitos'),
    body('alias')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Alias no puede tener más de 50 caracteres')
  ],
  validateRequest,
  UserBanksController.updateBank
);

// 6. Eliminar banco
router.delete(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  UserBanksController.deleteBank
);

export default router;
```

### 4. ACTUALIZAR APP.TS

Agrega la importación y el uso de las rutas de bancos:
```typescript
// ... imports existentes ...
import authRoutes from './routes/auth.routes';
import userBanksRoutes from './routes/userBanks.routes';

// ... middlewares existentes ...

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/user-banks', userBanksRoutes); // ← AGREGAR ESTA LÍNEA

// ... error handlers ...
```

### 5. ACTUALIZAR VALIDADORES (src/utils/validators.util.ts)

Agrega estos métodos si no existen:
```typescript
// ... métodos existentes ...

static isValidNumeroCuenta(cuenta: string): boolean {
  // Solo números, mínimo 13 dígitos
  return /^\d{13,}$/.test(cuenta);
}

static isValidCCI(cci: string): boolean {
  // Solo números, exactamente 20 dígitos
  return /^\d{20}$/.test(cci);
}
```

## PRUEBAS MANUALES

Después de implementar, prueba estos endpoints con Postman o curl:

### 1. Listar Bancos (vacío inicialmente)
```bash
curl -X GET http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer tu-access-token"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "bancos": [],
    "total": 0
  }
}
```

### 2. Registrar Banco
```bash
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer tu-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "banco": "BCP",
    "numero_cuenta": "1234567890123",
    "cci": "12345678901234567890",
    "alias": "Mi cuenta principal"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Banco registrado exitosamente",
  "data": {
    "banco": {
      "id": "uuid...",
      "banco": "BCP",
      "numero_cuenta": "****0123",
      "cci": "****7890",
      "alias": "Mi cuenta principal",
      "created_at": "2026-02-04T..."
    }
  }
}
```

### 3. Listar Bancos (con datos)
```bash
curl -X GET http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer tu-access-token"
```

### 4. Editar Banco
```bash
curl -X PUT http://localhost:3000/api/user-banks/uuid-del-banco \
  -H "Authorization: Bearer tu-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "Cuenta de ahorros BCP"
  }'
```

### 5. Obtener Estadísticas
```bash
curl -X GET http://localhost:3000/api/user-banks/stats \
  -H "Authorization: Bearer tu-access-token"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 1,
      "por_banco": {
        "BCP": 1,
        "Interbank": 0,
        "Scotiabank": 0,
        "BBVA": 0
      }
    }
  }
}
```

### 6. Eliminar Banco
```bash
curl -X DELETE http://localhost:3000/api/user-banks/uuid-del-banco \
  -H "Authorization: Bearer tu-access-token"
```

### 7. Intentar Eliminar Banco con Retiro Pendiente (debe fallar)
```bash
# Primero crear un retiro pendiente (esto se hará en fase 4)
# Luego intentar eliminar el banco asociado
curl -X DELETE http://localhost:3000/api/user-banks/uuid-del-banco \
  -H "Authorization: Bearer tu-access-token"
```

**Respuesta esperada:**
```json
{
  "success": false,
  "message": "No puedes eliminar este banco porque tienes retiros pendientes asociados"
}
```

## VALIDACIONES A PROBAR

### Número de Cuenta
```bash
# ❌ Debe fallar (solo 12 dígitos)
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"banco": "BCP", "numero_cuenta": "123456789012", "cci": "12345678901234567890"}'

# ✅ Debe funcionar (13 dígitos)
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"banco": "BCP", "numero_cuenta": "1234567890123", "cci": "12345678901234567890"}'

# ❌ Debe fallar (contiene letras)
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"banco": "BCP", "numero_cuenta": "123456789012A", "cci": "12345678901234567890"}'
```

### CCI
```bash
# ❌ Debe fallar (19 dígitos)
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"banco": "BCP", "numero_cuenta": "1234567890123", "cci": "1234567890123456789"}'

# ❌ Debe fallar (21 dígitos)
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"banco": "BCP", "numero_cuenta": "1234567890123", "cci": "123456789012345678901"}'

# ✅ Debe funcionar (20 dígitos exactos)
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"banco": "BCP", "numero_cuenta": "1234567890123", "cci": "12345678901234567890"}'
```

### Banco Inválido
```bash
# ❌ Debe fallar
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"banco": "BancoRandom", "numero_cuenta": "1234567890123", "cci": "12345678901234567890"}'
```

### Sin Autenticación
```bash
# ❌ Debe fallar con 401
curl -X GET http://localhost:3000/api/user-banks
```

## RESULTADO ESPERADO

Al finalizar esta fase tendrás:
✅ CRUD completo de bancos del usuario
✅ Validaciones robustas de número de cuenta (min 13 dígitos)
✅ Validaciones robustas de CCI (exactamente 20 dígitos)
✅ Enmascaramiento de datos sensibles en respuestas (****1234)
✅ Protección contra eliminación de bancos con retiros pendientes
✅ Logs de auditoría para todas las operaciones
✅ Estadísticas de bancos por tipo
✅ Todas las rutas protegidas con JWT
✅ Manejo robusto de errores

## NOTAS IMPORTANTES

- Número de cuenta: mínimo 13 dígitos, solo números
- CCI: exactamente 20 dígitos, solo números
- Alias es opcional, máximo 50 caracteres
- Los datos sensibles se enmascaran en las respuestas pero se guardan completos en BD
- No se puede eliminar un banco si tiene retiros pendientes
- Bancos válidos: BCP, Interbank, Scotiabank, BBVA
- Cada operación genera un log de auditoría
- Un usuario puede registrar múltiples bancos del mismo tipo con diferentes cuentas