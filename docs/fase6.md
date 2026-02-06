# FASE 6: Panel Administrativo Completo - EfectivoYa

## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

IMPORTANTE: Las FASES 1-5 ya están completadas. Tienes:
- Backend base con Prisma + PostgreSQL ✅
- Sistema de autenticación (usuarios) ✅
- Gestión de bancos ✅
- Sistema de recargas completo ✅
- Sistema de retiros completo ✅
- Dashboard del usuario ✅

## OBJETIVO DE ESTA FASE
Implementar el panel administrativo completo con:
- Autenticación de administradores (login admin separado)
- Dashboard con métricas clave (usuarios, recargas, retiros, alertas)
- Gestión de usuarios (listar, buscar, ver detalle, suspender/activar)
- Gestión de configuración global (comisiones, límites, cuenta recaudadora)
- Gestión de alertas de seguridad (listar, marcar como revisadas)
- Visualización de logs de auditoría
- Gestión de contenido (FAQs, términos, políticas, videos instructivos)
- Gestión de administradores (crear, editar, listar)
- Estadísticas avanzadas y reportes

## ESTRUCTURA A CREAR
efectivoya-backend/src/
├── controllers/
│   ├── adminAuth.controller.ts
│   ├── adminDashboard.controller.ts
│   ├── adminUsers.controller.ts
│   ├── adminConfig.controller.ts
│   ├── adminAlertas.controller.ts
│   ├── adminLogs.controller.ts
│   ├── adminContenido.controller.ts
│   └── adminAdmins.controller.ts
└── routes/
├── adminAuth.routes.ts
├── adminDashboard.routes.ts
├── adminUsers.routes.ts
├── adminConfig.routes.ts
├── adminAlertas.routes.ts
├── adminLogs.routes.ts
├── adminContenido.routes.ts
└── adminAdmins.routes.ts

## INSTRUCCIONES DETALLADAS

### 1. CONTROLADOR DE AUTENTICACIÓN ADMIN (src/controllers/adminAuth.controller.ts)
```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { AdminRequest } from '../types';

const prisma = new PrismaClient();

export class AdminAuthController {
  /**
   * 1. LOGIN ADMIN
   * POST /api/admin/auth/login
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      // Buscar admin
      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        await AuditLogService.log('admin_login_fallido', req, undefined, undefined, { email });
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, admin.password_hash);
      if (!validPassword) {
        await AuditLogService.log('admin_login_fallido', req, undefined, admin.id, { email });
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar cuenta activa
      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta de administrador ha sido desactivada'
        });
      }

      // Generar tokens
      const accessToken = JWTUtil.generateAccessToken(admin.id, admin.email);
      const tokenId = uuidv4();
      const refreshToken = JWTUtil.generateRefreshToken(admin.id, tokenId);

      // Audit log
      await AuditLogService.log('admin_login', req, undefined, admin.id);

      Logger.info(`Admin login exitoso: ${admin.email}`);

      return res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          accessToken,
          refreshToken,
          admin: {
            id: admin.id,
            email: admin.email,
            nombre: admin.nombre,
            rol: admin.rol
          }
        }
      });
    } catch (error) {
      Logger.error('Error en admin login:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión'
      });
    }
  }

  /**
   * 2. OBTENER PERFIL ADMIN
   * GET /api/admin/auth/profile
   */
  static async getProfile(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          is_active: true,
          created_at: true
        }
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Administrador no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { admin }
      });
    } catch (error) {
      Logger.error('Error en getProfile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener perfil'
      });
    }
  }

  /**
   * 3. LOGOUT ADMIN
   * POST /api/admin/auth/logout
   */
  static async logout(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Audit log
      await AuditLogService.log('admin_logout', req, undefined, adminId);

      Logger.info(`Admin logout: ${req.adminEmail}`);

      return res.json({
        success: true,
        message: 'Sesión cerrada correctamente'
      });
    } catch (error) {
      Logger.error('Error en logout:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
  }
}
```

### 2. CONTROLADOR DE DASHBOARD ADMIN (src/controllers/adminDashboard.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class AdminDashboardController {
  /**
   * 1. MÉTRICAS GENERALES
   * GET /api/admin/dashboard/metrics
   */
  static async getMetrics(req: AdminRequest, res: Response): Promise<Response> {
    try {
      // Obtener todas las métricas en paralelo
      const [
        totalUsuarios,
        usuariosActivos,
        totalRecargas,
        recargasPendientes,
        totalRetiros,
        retirosPendientes,
        alertasPendientes,
        saldoTotalPlataforma,
        recargasHoy,
        retirosHoy
      ] = await Promise.all([
        // Usuarios
        prisma.user.count(),
        prisma.user.count({ where: { is_active: true } }),
        
        // Recargas
        prisma.recarga.count(),
        prisma.recarga.count({ where: { estado: 'pendiente' } }),
        
        // Retiros
        prisma.retiro.count(),
        prisma.retiro.count({ where: { estado: 'pendiente' } }),
        
        // Alertas
        prisma.alertaSeguridad.count({ where: { revisada: false } }),
        
        // Saldo total
        prisma.user.aggregate({
          _sum: { saldo_actual: true }
        }),
        
        // Hoy
        prisma.recarga.count({
          where: {
            created_at: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.retiro.count({
          where: {
            created_at: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]);

      // Métricas financieras del mes
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [recargasMes, retirosMes] = await Promise.all([
        prisma.recarga.aggregate({
          where: {
            estado: 'aprobado',
            processed_at: { gte: inicioMes }
          },
          _sum: {
            monto_depositado: true,
            comision_calculada: true,
            monto_neto: true
          }
        }),
        prisma.retiro.aggregate({
          where: {
            estado: 'aprobado',
            processed_at: { gte: inicioMes }
          },
          _sum: { monto: true }
        })
      ]);

      return res.json({
        success: true,
        data: {
          usuarios: {
            total: totalUsuarios,
            activos: usuariosActivos,
            inactivos: totalUsuarios - usuariosActivos
          },
          operaciones: {
            recargas: {
              total: totalRecargas,
              pendientes: recargasPendientes,
              hoy: recargasHoy
            },
            retiros: {
              total: totalRetiros,
              pendientes: retirosPendientes,
              hoy: retirosHoy
            }
          },
          alertas: {
            pendientes: alertasPendientes
          },
          financiero: {
            saldo_total_plataforma: saldoTotalPlataforma._sum.saldo_actual?.toNumber() || 0,
            este_mes: {
              total_depositado: recargasMes._sum.monto_depositado?.toNumber() || 0,
              comisiones_generadas: recargasMes._sum.comision_calculada?.toNumber() || 0,
              neto_recargado: recargasMes._sum.monto_neto?.toNumber() || 0,
              total_retirado: retirosMes._sum.monto?.toNumber() || 0
            }
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener métricas'
      });
    }
  }

  /**
   * 2. ACTIVIDAD RECIENTE
   * GET /api/admin/dashboard/recent-activity
   */
  static async getRecentActivity(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { limit = '10' } = req.query;
      const limitNum = parseInt(limit as string);

      const [
        recargasRecientes,
        retirosRecientes,
        usuariosNuevos
      ] = await Promise.all([
        prisma.recarga.findMany({
          take: limitNum,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true
              }
            }
          }
        }),
        prisma.retiro.findMany({
          take: limitNum,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true
              }
            }
          }
        }),
        prisma.user.findMany({
          take: limitNum,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            email: true,
            nombres: true,
            apellidos: true,
            created_at: true,
            email_verificado: true
          }
        })
      ]);

      return res.json({
        success: true,
        data: {
          recargas_recientes: recargasRecientes,
          retiros_recientes: retirosRecientes,
          usuarios_nuevos: usuariosNuevos
        }
      });
    } catch (error) {
      Logger.error('Error en getRecentActivity:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener actividad reciente'
      });
    }
  }

  /**
   * 3. GRÁFICOS DE TENDENCIAS (últimos 7 días)
   * GET /api/admin/dashboard/trends
   */
  static async getTrends(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      hace7Dias.setHours(0, 0, 0, 0);

      // Obtener recargas por día
      const recargasPorDia = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as fecha,
          COUNT(*) as cantidad,
          SUM(monto_neto) as monto_total
        FROM recargas
        WHERE created_at >= ${hace7Dias}
          AND estado = 'aprobado'
        GROUP BY DATE(created_at)
        ORDER BY fecha ASC
      `;

      // Obtener retiros por día
      const retirosPorDia = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as fecha,
          COUNT(*) as cantidad,
          SUM(monto) as monto_total
        FROM retiros
        WHERE created_at >= ${hace7Dias}
          AND estado = 'aprobado'
        GROUP BY DATE(created_at)
        ORDER BY fecha ASC
      `;

      // Obtener nuevos usuarios por día
      const usuariosPorDia = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as fecha,
          COUNT(*) as cantidad
        FROM users
        WHERE created_at >= ${hace7Dias}
        GROUP BY DATE(created_at)
        ORDER BY fecha ASC
      `;

      return res.json({
        success: true,
        data: {
          recargas_por_dia: recargasPorDia,
          retiros_por_dia: retirosPorDia,
          usuarios_por_dia: usuariosPorDia
        }
      });
    } catch (error) {
      Logger.error('Error en getTrends:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener tendencias'
      });
    }
  }
}
```

### 3. CONTROLADOR DE GESTIÓN DE USUARIOS (src/controllers/adminUsers.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { MaskDataUtil } from '../utils/maskData.util';

const prisma = new PrismaClient();

export class AdminUsersController {
  /**
   * 1. LISTAR USUARIOS
   * GET /api/admin/users
   */
  static async listUsers(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { search, page = '1', limit = '20', is_active } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      // Filtro de búsqueda
      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { nombres: { contains: search as string, mode: 'insensitive' } },
          { apellidos: { contains: search as string, mode: 'insensitive' } },
          { dni: { contains: search as string } }
        ];
      }

      // Filtro de activos
      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            nombres: true,
            apellidos: true,
            dni: true,
            whatsapp: true,
            saldo_actual: true,
            is_active: true,
            email_verificado: true,
            created_at: true,
            _count: {
              select: {
                recargas: true,
                retiros: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.user.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      Logger.error('Error en listUsers:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar usuarios'
      });
    }
  }

  /**
   * 2. OBTENER DETALLE DE USUARIO
   * GET /api/admin/users/:id
   */
  static async getUserDetail(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          bancos: true,
          recargas: {
            orderBy: { created_at: 'desc' },
            take: 10
          },
          retiros: {
            orderBy: { created_at: 'desc' },
            take: 10,
            include: {
              banco: true
            }
          },
          referidos_hechos: {
            include: {
              referred: {
                select: {
                  nombres: true,
                  apellidos: true,
                  email: true
                }
              }
            }
          },
          referido_por_relacion: {
            include: {
              referrer: {
                select: {
                  nombres: true,
                  apellidos: true,
                  codigo_referido: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Estadísticas del usuario
      const [totalRecargado, totalRetirado, alertas] = await Promise.all([
        prisma.recarga.aggregate({
          where: {
            user_id: id,
            estado: 'aprobado'
          },
          _sum: { monto_neto: true }
        }),
        prisma.retiro.aggregate({
          where: {
            user_id: id,
            estado: 'aprobado'
          },
          _sum: { monto: true }
        }),
        prisma.alertaSeguridad.findMany({
          where: { user_id: id },
          orderBy: { created_at: 'desc' },
          take: 5
        })
      ]);

      return res.json({
        success: true,
        data: {
          user: {
            ...user,
            dni: MaskDataUtil.maskDNI(user.dni),
            dni_completo: user.dni // Solo para admins
          },
          estadisticas: {
            total_recargado: totalRecargado._sum.monto_neto?.toNumber() || 0,
            total_retirado: totalRetirado._sum.monto?.toNumber() || 0,
            saldo_actual: user.saldo_actual.toNumber()
          },
          alertas_recientes: alertas
        }
      });
    } catch (error) {
      Logger.error('Error en getUserDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalle del usuario'
      });
    }
  }

  /**
   * 3. SUSPENDER/ACTIVAR USUARIO
   * PATCH /api/admin/users/:id/toggle-status
   */
  static async toggleUserStatus(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;
      const { motivo } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { is_active: true, email: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const nuevoEstado = !user.is_active;

      const userActualizado = await prisma.user.update({
        where: { id },
        data: { is_active: nuevoEstado }
      });

      // Audit log
      await AuditLogService.log(
        nuevoEstado ? 'usuario_activado' : 'usuario_suspendido',
        req,
        id,
        adminId,
        { motivo: motivo || 'Sin motivo especificado' }
      );

      Logger.info(
        `Usuario ${nuevoEstado ? 'activado' : 'suspendido'}: ${user.email} por admin ${adminId}`
      );

      return res.json({
        success: true,
        message: `Usuario ${nuevoEstado ? 'activado' : 'suspendido'} exitosamente`,
        data: {
          user: {
            id: userActualizado.id,
            email: userActualizado.email,
            is_active: userActualizado.is_active
          }
        }
      });
    } catch (error) {
      Logger.error('Error en toggleUserStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar estado del usuario'
      });
    }
  }

  /**
   * 4. ESTADÍSTICAS DE USUARIOS
   * GET /api/admin/users/stats
   */
  static async getUsersStats(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const [
        totalUsuarios,
        verificados,
        activos,
        conSaldo,
        registrosHoy,
        registrosEsteMes
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { email_verificado: true } }),
        prisma.user.count({ where: { is_active: true } }),
        prisma.user.count({
          where: {
            saldo_actual: { gt: 0 }
          }
        }),
        prisma.user.count({
          where: {
            created_at: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.user.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      ]);

      return res.json({
        success: true,
        data: {
          total: totalUsuarios,
          verificados,
          activos,
          con_saldo: conSaldo,
          registros_hoy: registrosHoy,
          registros_este_mes: registrosEsteMes
        }
      });
    } catch (error) {
      Logger.error('Error en getUsersStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas'
      });
    }
  }
}
### 4. CONTROLADOR DE CONFIGURACIÓN (src/controllers/adminConfig.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class AdminConfigController {
  /**
   * 1. OBTENER CONFIGURACIÓN
   * GET /api/admin/config
   */
  static async getConfig(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const config = await prisma.configuracion.findUnique({
        where: { id: 1 }
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      return res.json({
        success: true,
        data: { config }
      });
    } catch (error) {
      Logger.error('Error en getConfig:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener configuración'
      });
    }
  }

  /**
   * 2. ACTUALIZAR CONFIGURACIÓN
   * PATCH /api/admin/config
   */
  static async updateConfig(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const {
        porcentaje_comision,
        monto_minimo_recarga,
        monto_maximo_recarga,
        cuenta_recaudadora_numero,
        cuenta_recaudadora_banco,
        cuenta_recaudadora_titular,
        mantenimiento_activo,
        version_minima_android,
        version_minima_ios,
        forzar_actualizacion,
        bono_referido,
        max_referidos_por_usuario
      } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const dataToUpdate: any = {};

      if (porcentaje_comision !== undefined) {
        const porcentaje = parseFloat(porcentaje_comision);
        if (porcentaje < 0 || porcentaje > 100) {
          return res.status(400).json({
            success: false,
            message: 'El porcentaje de comisión debe estar entre 0 y 100'
          });
        }
        dataToUpdate.porcentaje_comision = porcentaje;
      }

      if (monto_minimo_recarga !== undefined) {
        dataToUpdate.monto_minimo_recarga = parseFloat(monto_minimo_recarga);
      }

      if (monto_maximo_recarga !== undefined) {
        dataToUpdate.monto_maximo_recarga = parseFloat(monto_maximo_recarga);
      }

      if (cuenta_recaudadora_numero !== undefined) {
        dataToUpdate.cuenta_recaudadora_numero = cuenta_recaudadora_numero;
      }

      if (cuenta_recaudadora_banco !== undefined) {
        dataToUpdate.cuenta_recaudadora_banco = cuenta_recaudadora_banco;
      }

      if (cuenta_recaudadora_titular !== undefined) {
        dataToUpdate.cuenta_recaudadora_titular = cuenta_recaudadora_titular;
      }

      if (mantenimiento_activo !== undefined) {
        dataToUpdate.mantenimiento_activo = Boolean(mantenimiento_activo);
      }

      if (version_minima_android !== undefined) {
        dataToUpdate.version_minima_android = version_minima_android;
      }

      if (version_minima_ios !== undefined) {
        dataToUpdate.version_minima_ios = version_minima_ios;
      }

      if (forzar_actualizacion !== undefined) {
        dataToUpdate.forzar_actualizacion = Boolean(forzar_actualizacion);
      }

      if (bono_referido !== undefined) {
        dataToUpdate.bono_referido = parseFloat(bono_referido);
      }

      if (max_referidos_por_usuario !== undefined) {
        dataToUpdate.max_referidos_por_usuario = parseInt(max_referidos_por_usuario);
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }

      const configActualizada = await prisma.configuracion.update({
        where: { id: 1 },
        data: dataToUpdate
      });

      // Audit log
      await AuditLogService.log('configuracion_actualizada', req, undefined, adminId, {
        campos_actualizados: Object.keys(dataToUpdate)
      });

      Logger.info(`Configuración actualizada por admin ${adminId}`);

      return res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: { config: configActualizada }
      });
    } catch (error) {
      Logger.error('Error en updateConfig:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar configuración'
      });
    }
  }

  /**
   * 3. ACTIVAR/DESACTIVAR MODO MANTENIMIENTO
   * PATCH /api/admin/config/maintenance
   */
  static async toggleMaintenance(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { activo } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const config = await prisma.configuracion.update({
        where: { id: 1 },
        data: {
          mantenimiento_activo: Boolean(activo)
        }
      });

      // Audit log
      await AuditLogService.log(
        activo ? 'mantenimiento_activado' : 'mantenimiento_desactivado',
        req,
        undefined,
        adminId
      );

      Logger.info(`Modo mantenimiento ${activo ? 'activado' : 'desactivado'} por admin ${adminId}`);

      return res.json({
        success: true,
        message: `Modo mantenimiento ${activo ? 'activado' : 'desactivado'}`,
        data: {
          mantenimiento_activo: config.mantenimiento_activo
        }
      });
    } catch (error) {
      Logger.error('Error en toggleMaintenance:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar modo mantenimiento'
      });
    }
  }
}
```

### 5. CONTROLADOR DE ALERTAS (src/controllers/adminAlertas.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class AdminAlertasController {
  /**
   * 1. LISTAR ALERTAS
   * GET /api/admin/alertas
   */
  static async listAlertas(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { tipo, revisada, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (tipo) {
        where.tipo = tipo;
      }

      if (revisada !== undefined) {
        where.revisada = revisada === 'true';
      }

      const [alertas, total] = await Promise.all([
        prisma.alertaSeguridad.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.alertaSeguridad.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          alertas,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      Logger.error('Error en listAlertas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar alertas'
      });
    }
  }

  /**
   * 2. MARCAR ALERTA COMO REVISADA
   * PATCH /api/admin/alertas/:id/revisar
   */
  static async marcarRevisada(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const alerta = await prisma.alertaSeguridad.update({
        where: { id },
        data: { revisada: true }
      });

      // Audit log
      await AuditLogService.log('alerta_revisada', req, alerta.user_id, adminId, {
        alerta_id: id,
        tipo: alerta.tipo
      });

      return res.json({
        success: true,
        message: 'Alerta marcada como revisada',
        data: { alerta }
      });
    } catch (error) {
      Logger.error('Error en marcarRevisada:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al marcar alerta como revisada'
      });
    }
  }

  /**
   * 3. MARCAR TODAS COMO REVISADAS
   * PATCH /api/admin/alertas/revisar-todas
   */
  static async marcarTodasRevisadas(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const resultado = await prisma.alertaSeguridad.updateMany({
        where: { revisada: false },
        data: { revisada: true }
      });

      // Audit log
      await AuditLogService.log('alertas_masivas_revisadas', req, undefined, adminId, {
        cantidad: resultado.count
      });

      Logger.info(`${resultado.count} alertas marcadas como revisadas por admin ${adminId}`);

      return res.json({
        success: true,
        message: `${resultado.count} alertas marcadas como revisadas`,
        data: {
          cantidad_actualizada: resultado.count
        }
      });
    } catch (error) {
      Logger.error('Error en marcarTodasRevisadas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al marcar alertas como revisadas'
      });
    }
  }

  /**
   * 4. ESTADÍSTICAS DE ALERTAS
   * GET /api/admin/alertas/stats
   */
  static async getStats(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const [
        totalAlertas,
        pendientes,
        revisadas,
        porTipo
      ] = await Promise.all([
        prisma.alertaSeguridad.count(),
        prisma.alertaSeguridad.count({ where: { revisada: false } }),
        prisma.alertaSeguridad.count({ where: { revisada: true } }),
        prisma.alertaSeguridad.groupBy({
          by: ['tipo'],
          _count: true
        })
      ]);

      return res.json({
        success: true,
        data: {
          total: totalAlertas,
          pendientes,
          revisadas,
          por_tipo: porTipo.map(item => ({
            tipo: item.tipo,
            cantidad: item._count
          }))
        }
      });
    } catch (error) {
      Logger.error('Error en getStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas'
      });
    }
  }
}
```

### 6. CONTROLADOR DE LOGS (src/controllers/adminLogs.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class AdminLogsController {
  /**
   * 1. LISTAR LOGS DE AUDITORÍA
   * GET /api/admin/logs
   */
  static async listLogs(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { accion, user_id, admin_id, page = '1', limit = '50' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (accion) {
        where.accion = { contains: accion as string, mode: 'insensitive' };
      }

      if (user_id) {
        where.user_id = user_id;
      }

      if (admin_id) {
        where.admin_id = admin_id;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true
              }
            },
            admin: {
              select: {
                email: true,
                nombre: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.auditLog.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      Logger.error('Error en listLogs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar logs'
      });
    }
  }

  /**
   * 2. OBTENER LOG POR ID
   * GET /api/admin/logs/:id
   */
  static async getLogById(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              email: true,
              nombres: true,
              apellidos: true
            }
          },
          admin: {
            select: {
              email: true,
              nombre: true
            }
          }
        }
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Log no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { log }
      });
    } catch (error) {
      Logger.error('Error en getLogById:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener log'
      });
    }
  }

  /**
   * 3. ESTADÍSTICAS DE LOGS
   * GET /api/admin/logs/stats
   */
  static async getStats(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const hace24h = new Date();
      hace24h.setHours(hace24h.getHours() - 24);

      const [
        totalLogs,
        logsHoy,
        accionesMasComunes
      ] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({
          where: {
            created_at: { gte: hace24h }
          }
        }),
        prisma.auditLog.groupBy({
          by: ['accion'],
          _count: true,
          orderBy: {
            _count: {
              accion: 'desc'
            }
          },
          take: 10
        })
      ]);

      return res.json({
        success: true,
        data: {
          total_logs: totalLogs,
          logs_ultimas_24h: logsHoy,
          acciones_mas_comunes: accionesMasComunes.map(item => ({
            accion: item.accion,
            cantidad: item._count
          }))
        }
      });
    } catch (error) {
      Logger.error('Error en getStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas'
      });
    }
  }
}
```

### 7. CONTROLADOR DE CONTENIDO (src/controllers/adminContenido.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class AdminContenidoController {
  /**
   * 1. LISTAR FAQs
   * GET /api/admin/contenido/faqs
   */
  static async listFAQs(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const faqs = await prisma.fAQ.findMany({
        orderBy: { orden: 'asc' }
      });

      return res.json({
        success: true,
        data: { faqs }
      });
    } catch (error) {
      Logger.error('Error en listFAQs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar FAQs'
      });
    }
  }

  /**
   * 2. CREAR FAQ
   * POST /api/admin/contenido/faqs
   */
  static async createFAQ(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { pregunta, respuesta, orden } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const faq = await prisma.fAQ.create({
        data: {
          pregunta,
          respuesta,
          orden: orden || 999
        }
      });

      // Audit log
      await AuditLogService.log('faq_creada', req, undefined, adminId, {
        faq_id: faq.id
      });

      return res.status(201).json({
        success: true,
        message: 'FAQ creada exitosamente',
        data: { faq }
      });
    } catch (error) {
      Logger.error('Error en createFAQ:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear FAQ'
      });
    }
  }

  /**
   * 3. ACTUALIZAR FAQ
   * PATCH /api/admin/contenido/faqs/:id
   */
  static async updateFAQ(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;
      const { pregunta, respuesta, orden } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const dataToUpdate: any = {};
      if (pregunta !== undefined) dataToUpdate.pregunta = pregunta;
      if (respuesta !== undefined) dataToUpdate.respuesta = respuesta;
      if (orden !== undefined) dataToUpdate.orden = parseInt(orden);

      const faq = await prisma.fAQ.update({
        where: { id },
        data: dataToUpdate
      });

      // Audit log
      await AuditLogService.log('faq_actualizada', req, undefined, adminId, {
        faq_id: id
      });

      return res.json({
        success: true,
        message: 'FAQ actualizada exitosamente',
        data: { faq }
      });
    } catch (error) {
      Logger.error('Error en updateFAQ:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar FAQ'
      });
    }
  }

  /**
   * 4. ELIMINAR FAQ
   * DELETE /api/admin/contenido/faqs/:id
   */
  static async deleteFAQ(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      await prisma.fAQ.delete({
        where: { id }
      });

      // Audit log
      await AuditLogService.log('faq_eliminada', req, undefined, adminId, {
        faq_id: id
      });

      return res.json({
        success: true,
        message: 'FAQ eliminada exitosamente'
      });
    } catch (error) {
      Logger.error('Error en deleteFAQ:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar FAQ'
      });
    }
  }

  /**
   * 5. OBTENER TÉRMINOS
   * GET /api/admin/contenido/terminos
   */
  static async getTerminos(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const terminos = await prisma.terminosCondiciones.findUnique({
        where: { id: 1 }
      });

      return res.json({
        success: true,
        data: { terminos }
      });
    } catch (error) {
      Logger.error('Error en getTerminos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener términos'
      });
    }
  }

  /**
   * 6. ACTUALIZAR TÉRMINOS
   * PATCH /api/admin/contenido/terminos
   */
  static async updateTerminos(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { contenido, version } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const terminos = await prisma.terminosCondiciones.upsert({
        where: { id: 1 },
        update: {
          contenido,
          version: version || '1.0'
        },
        create: {
          id: 1,
          contenido,
          version: version || '1.0'
        }
      });

      // Audit log
      await AuditLogService.log('terminos_actualizados', req, undefined, adminId);

      return res.json({
        success: true,
        message: 'Términos actualizados exitosamente',
        data: { terminos }
      });
    } catch (error) {
      Logger.error('Error en updateTerminos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar términos'
      });
    }
  }

  /**
   * 7. OBTENER POLÍTICAS
   * GET /api/admin/contenido/politicas
   */
  static async getPoliticas(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const politicas = await prisma.politicasPrivacidad.findUnique({
        where: { id: 1 }
      });

      return res.json({
        success: true,
        data: { politicas }
      });
    } catch (error) {
      Logger.error('Error en getPoliticas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener políticas'
      });
    }
  }

  /**
   * 8. ACTUALIZAR POLÍTICAS
   * PATCH /api/admin/contenido/politicas
   */
  static async updatePoliticas(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { contenido, version } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const politicas = await prisma.politicasPrivacidad.upsert({
        where: { id: 1 },
        update: {
          contenido,
          version: version || '1.0'
        },
        create: {
          id: 1,
          contenido,
          version: version || '1.0'
        }
      });

      // Audit log
      await AuditLogService.log('politicas_actualizadas', req, undefined, adminId);

      return res.json({
        success: true,
        message: 'Políticas actualizadas exitosamente',
        data: { politicas }
      });
    } catch (error) {
      Logger.error('Error en updatePoliticas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar políticas'
      });
    }
  }

  /**
   * 9. LISTAR VIDEOS INSTRUCTIVOS
   * GET /api/admin/contenido/videos
   */
  static async listVideos(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const videos = await prisma.videoInstructivo.findMany({
        orderBy: { banco: 'asc' }
      });

      return res.json({
        success: true,
        data: { videos }
      });
    } catch (error) {
      Logger.error('Error en listVideos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar videos'
      });
    }
  }

  /**
   * 10. ACTUALIZAR VIDEO INSTRUCTIVO
   * PATCH /api/admin/contenido/videos/:banco
   */
  static async updateVideo(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { banco } = req.params;
      const { youtube_url, titulo } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const video = await prisma.videoInstructivo.update({
        where: { banco: banco as any },
        data: {
          youtube_url,
          titulo
        }
      });

      // Audit log
      await AuditLogService.log('video_actualizado', req, undefined, adminId, {
        banco
      });

      return res.json({
        success: true,
        message: 'Video actualizado exitosamente',
        data: { video }
      });
    } catch (error) {
      Logger.error('Error en updateVideo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar video'
      });
    }
  }
}
```

### 8. CONTROLADOR DE GESTIÓN DE ADMINS (src/controllers/adminAdmins.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { Validators } from '../utils/validators.util';

const prisma = new PrismaClient();

export class AdminAdminsController {
  /**
   * 1. LISTAR ADMINISTRADORES
   * GET /api/admin/admins
   */
  static async listAdmins(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          is_active: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      return res.json({
        success: true,
        data: {
          admins,
          total: admins.length
        }
      });
    } catch (error) {
      Logger.error('Error en listAdmins:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar administradores'
      });
    }
  }

  /**
   * 2. CREAR ADMINISTRADOR
   * POST /api/admin/admins
   */
  static async createAdmin(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const currentAdminId = req.adminId;
      const currentAdminRol = req.adminRol;
      const { email, password, nombre, rol } = req.body;

      if (!currentAdminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Solo super_admin puede crear otros admins
      if (currentAdminRol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo super administradores pueden crear nuevos administradores'
        });
      }

      // Validaciones
      if (!Validators.isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }

      if (!Validators.isValidPassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo'
        });
      }

      if (!['super_admin', 'admin'].includes(rol)) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido. Debe ser super_admin o admin'
        });
      }

      // Verificar email único
      const existingAdmin = await prisma.admin.findUnique({
        where: { email }
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Crear admin
      const newAdmin = await prisma.admin.create({
        data: {
          email,
          password_hash,
          nombre: Validators.sanitizeString(nombre),
          rol: rol as any
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          is_active: true,
          created_at: true
        }
      });

      // Audit log
      await AuditLogService.log('admin_creado', req, undefined, currentAdminId, {
        nuevo_admin_id: newAdmin.id,
        email: newAdmin.email,
        rol: newAdmin.rol
      });

      Logger.info(`Admin creado: ${newAdmin.email} por ${currentAdminId}`);

      return res.status(201).json({
        success: true,
        message: 'Administrador creado exitosamente',
        data: { admin: newAdmin }
      });
    } catch (error) {
      Logger.error('Error en createAdmin:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear administrador'
      });
    }
  }

  /**
   * 3. ACTUALIZAR ADMINISTRADOR
   * PATCH /api/admin/admins/:id
   */
  static async updateAdmin(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const currentAdminId = req.adminId;
      const currentAdminRol = req.adminRol;
      const { id } = req.params;
      const { nombre, rol, is_active, password } = req.body;

      if (!currentAdminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Solo super_admin puede editar otros admins
      if (currentAdminRol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo super administradores pueden editar administradores'
        });
      }

      const dataToUpdate: any = {};

      if (nombre !== undefined) {
        dataToUpdate.nombre = Validators.sanitizeString(nombre);
      }

      if (rol !== undefined) {
        if (!['super_admin', 'admin'].includes(rol)) {
          return res.status(400).json({
            success: false,
            message: 'Rol inválido'
          });
        }
        dataToUpdate.rol = rol;
      }

      if (is_active !== undefined) {
        dataToUpdate.is_active = Boolean(is_active);
      }

      if (password !== undefined) {
        if (!Validators.isValidPassword(password)) {
          return res.status(400).json({
            success: false,
            message: 'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo'
          });
        }
        dataToUpdate.password_hash = await bcrypt.hash(password, 10);
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }

      const adminActualizado = await prisma.admin.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          is_active: true
        }
      });

      // Audit log
      await AuditLogService.log('admin_actualizado', req, undefined, currentAdminId, {
        admin_id: id,
        campos_actualizados: Object.keys(dataToUpdate)
      });

      return res.json({
        success: true,
        message: 'Administrador actualizado exitosamente',
        data: { admin: adminActualizado }
      });
    } catch (error) {
      Logger.error('Error en updateAdmin:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar administrador'
      });
    }
  }

  /**
   * 4. ELIMINAR ADMINISTRADOR
   * DELETE /api/admin/admins/:id
   */
  static async deleteAdmin(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const currentAdminId = req.adminId;
      const currentAdminRol = req.adminRol;
      const { id } = req.params;

      if (!currentAdminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Solo super_admin puede eliminar admins
      if (currentAdminRol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo super administradores pueden eliminar administradores'
        });
      }

      // No puede eliminarse a sí mismo
      if (id === currentAdminId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminarte a ti mismo'
        });
      }

      const admin = await prisma.admin.findUnique({
        where: { id }
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Administrador no encontrado'
        });
      }

      await prisma.admin.delete({
        where: { id }
      });

      // Audit log
      await AuditLogService.log('admin_eliminado', req, undefined, currentAdminId, {
        admin_eliminado_id: id,
        email: admin.email
      });

      Logger.info(`Admin eliminado: ${admin.email} por ${currentAdminId}`);

      return res.json({
        success: true,
        message: 'Administrador eliminado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en deleteAdmin:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar administrador'
      });
    }
  }
}

### 9. RUTAS DE AUTENTICACIÓN ADMIN (src/routes/adminAuth.routes.ts)
```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { AdminAuthController } from '../controllers/adminAuth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { loginLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// 1. Login
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty()
  ],
  validateRequest,
  AdminAuthController.login
);

// 2. Perfil (protegida)
router.get('/profile', adminAuthMiddleware, AdminAuthController.getProfile);

// 3. Logout (protegida)
router.post('/logout', adminAuthMiddleware, AdminAuthController.logout);

export default router;
```

### 10. RUTAS DE DASHBOARD ADMIN (src/routes/adminDashboard.routes.ts)
```typescript
import { Router } from 'express';
import { query } from 'express-validator';
import { AdminDashboardController } from '../controllers/adminDashboard.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Métricas generales
router.get('/metrics', AdminDashboardController.getMetrics);

// 2. Actividad reciente
router.get(
  '/recent-activity',
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  AdminDashboardController.getRecentActivity
);

// 3. Tendencias (últimos 7 días)
router.get('/trends', AdminDashboardController.getTrends);

export default router;
```

### 11. RUTAS DE GESTIÓN DE USUARIOS (src/routes/adminUsers.routes.ts)
```typescript
import { Router } from 'express';
import { param, query, body } from 'express-validator';
import { AdminUsersController } from '../controllers/adminUsers.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Estadísticas de usuarios
router.get('/stats', AdminUsersController.getUsersStats);

// 2. Listar usuarios
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('is_active').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminUsersController.listUsers
);

// 3. Detalle de usuario
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminUsersController.getUserDetail
);

// 4. Suspender/activar usuario
router.patch(
  '/:id/toggle-status',
  [
    param('id').isUUID(),
    body('motivo').optional().isString()
  ],
  validateRequest,
  AdminUsersController.toggleUserStatus
);

export default router;
```

### 12. RUTAS DE CONFIGURACIÓN (src/routes/adminConfig.routes.ts)
```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { AdminConfigController } from '../controllers/adminConfig.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Obtener configuración
router.get('/', AdminConfigController.getConfig);

// 2. Actualizar configuración
router.patch(
  '/',
  [
    body('porcentaje_comision').optional().isFloat({ min: 0, max: 100 }),
    body('monto_minimo_recarga').optional().isFloat({ min: 0 }),
    body('monto_maximo_recarga').optional().isFloat({ min: 0 }),
    body('cuenta_recaudadora_numero').optional().isString(),
    body('cuenta_recaudadora_banco').optional().isString(),
    body('cuenta_recaudadora_titular').optional().isString(),
    body('mantenimiento_activo').optional().isBoolean(),
    body('version_minima_android').optional().isString(),
    body('version_minima_ios').optional().isString(),
    body('forzar_actualizacion').optional().isBoolean(),
    body('bono_referido').optional().isFloat({ min: 0 }),
    body('max_referidos_por_usuario').optional().isInt({ min: 0 })
  ],
  validateRequest,
  AdminConfigController.updateConfig
);

// 3. Toggle modo mantenimiento
router.patch(
  '/maintenance',
  [body('activo').isBoolean()],
  validateRequest,
  AdminConfigController.toggleMaintenance
);

export default router;
```

### 13. RUTAS DE ALERTAS (src/routes/adminAlertas.routes.ts)
```typescript
import { Router } from 'express';
import { param, query } from 'express-validator';
import { AdminAlertasController } from '../controllers/adminAlertas.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Estadísticas
router.get('/stats', AdminAlertasController.getStats);

// 2. Marcar todas como revisadas
router.patch('/revisar-todas', AdminAlertasController.marcarTodasRevisadas);

// 3. Listar alertas
router.get(
  '/',
  [
    query('tipo').optional().isIn(['multiples_recargas', 'retiro_inmediato', 'patron_sospechoso']),
    query('revisada').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminAlertasController.listAlertas
);

// 4. Marcar alerta como revisada
router.patch(
  '/:id/revisar',
  [param('id').isUUID()],
  validateRequest,
  AdminAlertasController.marcarRevisada
);

export default router;
```

### 14. RUTAS DE LOGS (src/routes/adminLogs.routes.ts)
```typescript
import { Router } from 'express';
import { param, query } from 'express-validator';
import { AdminLogsController } from '../controllers/adminLogs.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Estadísticas
router.get('/stats', AdminLogsController.getStats);

// 2. Listar logs
router.get(
  '/',
  [
    query('accion').optional().isString(),
    query('user_id').optional().isUUID(),
    query('admin_id').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminLogsController.listLogs
);

// 3. Obtener log por ID
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminLogsController.getLogById
);

export default router;
```

### 15. RUTAS DE CONTENIDO (src/routes/adminContenido.routes.ts)
```typescript
import { Router } from 'express';
import { param, body } from 'express-validator';
import { AdminContenidoController } from '../controllers/adminContenido.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// FAQs
router.get('/faqs', AdminContenidoController.listFAQs);
router.post(
  '/faqs',
  [
    body('pregunta').isString().notEmpty(),
    body('respuesta').isString().notEmpty(),
    body('orden').optional().isInt()
  ],
  validateRequest,
  AdminContenidoController.createFAQ
);
router.patch(
  '/faqs/:id',
  [
    param('id').isUUID(),
    body('pregunta').optional().isString(),
    body('respuesta').optional().isString(),
    body('orden').optional().isInt()
  ],
  validateRequest,
  AdminContenidoController.updateFAQ
);
router.delete(
  '/faqs/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminContenidoController.deleteFAQ
);

// Términos y Condiciones
router.get('/terminos', AdminContenidoController.getTerminos);
router.patch(
  '/terminos',
  [
    body('contenido').isString().notEmpty(),
    body('version').optional().isString()
  ],
  validateRequest,
  AdminContenidoController.updateTerminos
);

// Políticas de Privacidad
router.get('/politicas', AdminContenidoController.getPoliticas);
router.patch(
  '/politicas',
  [
    body('contenido').isString().notEmpty(),
    body('version').optional().isString()
  ],
  validateRequest,
  AdminContenidoController.updatePoliticas
);

// Videos Instructivos
router.get('/videos', AdminContenidoController.listVideos);
router.patch(
  '/videos/:banco',
  [
    param('banco').isIn(['BCP', 'Interbank', 'Scotiabank', 'BBVA']),
    body('youtube_url').isString().notEmpty(),
    body('titulo').isString().notEmpty()
  ],
  validateRequest,
  AdminContenidoController.updateVideo
);

export default router;
```

### 16. RUTAS DE GESTIÓN DE ADMINS (src/routes/adminAdmins.routes.ts)
```typescript
import { Router } from 'express';
import { param, body } from 'express-validator';
import { AdminAdminsController } from '../controllers/adminAdmins.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Listar administradores
router.get('/', AdminAdminsController.listAdmins);

// 2. Crear administrador
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
    body('nombre').isString().notEmpty(),
    body('rol').isIn(['super_admin', 'admin'])
  ],
  validateRequest,
  AdminAdminsController.createAdmin
);

// 3. Actualizar administrador
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('nombre').optional().isString(),
    body('rol').optional().isIn(['super_admin', 'admin']),
    body('is_active').optional().isBoolean(),
    body('password').optional().isString()
  ],
  validateRequest,
  AdminAdminsController.updateAdmin
);

// 4. Eliminar administrador
router.delete(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminAdminsController.deleteAdmin
);

export default router;
```

### 17. ACTUALIZAR APP.TS

Agrega todas las importaciones y rutas de admin:
```typescript
// ... imports existentes ...
import authRoutes from './routes/auth.routes';
import userBanksRoutes from './routes/userBanks.routes';
import recargasRoutes from './routes/recargas.routes';
import adminRecargasRoutes from './routes/adminRecargas.routes';
import retirosRoutes from './routes/retiros.routes';
import adminRetirosRoutes from './routes/adminRetiros.routes';
import userRoutes from './routes/user.routes';

// NUEVAS RUTAS ADMIN ← AGREGAR
import adminAuthRoutes from './routes/adminAuth.routes';
import adminDashboardRoutes from './routes/adminDashboard.routes';
import adminUsersRoutes from './routes/adminUsers.routes';
import adminConfigRoutes from './routes/adminConfig.routes';
import adminAlertasRoutes from './routes/adminAlertas.routes';
import adminLogsRoutes from './routes/adminLogs.routes';
import adminContenidoRoutes from './routes/adminContenido.routes';
import adminAdminsRoutes from './routes/adminAdmins.routes';

// ... middlewares existentes ...

// Rutas de Usuarios
app.use('/api/auth', authRoutes);
app.use('/api/user-banks', userBanksRoutes);
app.use('/api/recargas', recargasRoutes);
app.use('/api/retiros', retirosRoutes);
app.use('/api/user', userRoutes);

// Rutas de Admin
app.use('/api/admin/auth', adminAuthRoutes);  // ← AGREGAR
app.use('/api/admin/dashboard', adminDashboardRoutes);  // ← AGREGAR
app.use('/api/admin/users', adminUsersRoutes);  // ← AGREGAR
app.use('/api/admin/config', adminConfigRoutes);  // ← AGREGAR
app.use('/api/admin/alertas', adminAlertasRoutes);  // ← AGREGAR
app.use('/api/admin/logs', adminLogsRoutes);  // ← AGREGAR
app.use('/api/admin/contenido', adminContenidoRoutes);  // ← AGREGAR
app.use('/api/admin/admins', adminAdminsRoutes);  // ← AGREGAR
app.use('/api/admin/recargas', adminRecargasRoutes);
app.use('/api/admin/retiros', adminRetirosRoutes);

// ... error handlers ...
```

## PRUEBAS MANUALES COMPLETAS

### PREPARACIÓN
```bash
# 1. Asegúrate de tener el servidor corriendo
npm run dev

# 2. Asegúrate de haber ejecutado el seed (para tener admin inicial)
npm run prisma:seed

# El admin creado por seed es:
# Email: admin@efectivoya.com
# Password: Admin123!@#
```

### 1. AUTENTICACIÓN ADMIN

#### Login Admin
```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@efectivoya.com",
    "password": "Admin123!@#"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "uuid...",
      "email": "admin@efectivoya.com",
      "nombre": "Administrador Principal",
      "rol": "super_admin"
    }
  }
}
```

**Guardar el ADMIN_TOKEN para las siguientes pruebas**

#### Obtener Perfil Admin
```bash
curl -X GET http://localhost:3000/api/admin/auth/profile \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 2. DASHBOARD ADMIN

#### Métricas Generales
```bash
curl -X GET http://localhost:3000/api/admin/dashboard/metrics \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "usuarios": {
      "total": 1,
      "activos": 1,
      "inactivos": 0
    },
    "operaciones": {
      "recargas": {
        "total": 1,
        "pendientes": 0,
        "hoy": 0
      },
      "retiros": {
        "total": 1,
        "pendientes": 0,
        "hoy": 0
      }
    },
    "alertas": {
      "pendientes": 0
    },
    "financiero": {
      "saldo_total_plataforma": 1400,
      "este_mes": {
        "total_depositado": 2000,
        "comisiones_generadas": 100,
        "neto_recargado": 1900,
        "total_retirado": 500
      }
    }
  }
}
```

#### Actividad Reciente
```bash
curl -X GET http://localhost:3000/api/admin/dashboard/recent-activity?limit=5 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Tendencias (últimos 7 días)
```bash
curl -X GET http://localhost:3000/api/admin/dashboard/trends \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3. GESTIÓN DE USUARIOS

#### Listar Usuarios
```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Buscar Usuario
```bash
curl -X GET "http://localhost:3000/api/admin/users?search=test" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Detalle de Usuario
```bash
curl -X GET http://localhost:3000/api/admin/users/UUID_DEL_USUARIO \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Respuesta esperada incluye:**
- Información completa del usuario
- Bancos registrados
- Últimas 10 recargas
- Últimos 10 retiros
- Referidos hechos
- Alertas de seguridad recientes
- Estadísticas totales

#### Suspender Usuario
```bash
curl -X PATCH http://localhost:3000/api/admin/users/UUID_DEL_USUARIO/toggle-status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "motivo": "Comportamiento sospechoso"
  }'
```

#### Activar Usuario
```bash
# Ejecutar el mismo endpoint nuevamente para activar
curl -X PATCH http://localhost:3000/api/admin/users/UUID_DEL_USUARIO/toggle-status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "motivo": "Problema resuelto"
  }'
```

#### Estadísticas de Usuarios
```bash
curl -X GET http://localhost:3000/api/admin/users/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 4. CONFIGURACIÓN

#### Obtener Configuración
```bash
curl -X GET http://localhost:3000/api/admin/config \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Actualizar Comisión
```bash
curl -X PATCH http://localhost:3000/api/admin/config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "porcentaje_comision": 7.5
  }'
```

#### Actualizar Límites de Recarga
```bash
curl -X PATCH http://localhost:3000/api/admin/config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monto_minimo_recarga": 500,
    "monto_maximo_recarga": 200000
  }'
```

#### Actualizar Cuenta Recaudadora
```bash
curl -X PATCH http://localhost:3000/api/admin/config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cuenta_recaudadora_numero": "9876543210987654",
    "cuenta_recaudadora_banco": "Interbank",
    "cuenta_recaudadora_titular": "EFECTIVOYA SAC"
  }'
```

#### Activar Modo Mantenimiento
```bash
curl -X PATCH http://localhost:3000/api/admin/config/maintenance \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activo": true
  }'
```

#### Desactivar Modo Mantenimiento
```bash
curl -X PATCH http://localhost:3000/api/admin/config/maintenance \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activo": false
  }'
```

### 5. ALERTAS DE SEGURIDAD

#### Listar Alertas Pendientes
```bash
curl -X GET "http://localhost:3000/api/admin/alertas?revisada=false" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Filtrar por Tipo
```bash
curl -X GET "http://localhost:3000/api/admin/alertas?tipo=retiro_inmediato" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Marcar Alerta como Revisada
```bash
curl -X PATCH http://localhost:3000/api/admin/alertas/UUID_DE_ALERTA/revisar \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Marcar Todas como Revisadas
```bash
curl -X PATCH http://localhost:3000/api/admin/alertas/revisar-todas \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Estadísticas de Alertas
```bash
curl -X GET http://localhost:3000/api/admin/alertas/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 6. LOGS DE AUDITORÍA

#### Listar Logs
```bash
curl -X GET "http://localhost:3000/api/admin/logs?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Filtrar por Acción
```bash
curl -X GET "http://localhost:3000/api/admin/logs?accion=login" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Logs de un Usuario Específico
```bash
curl -X GET "http://localhost:3000/api/admin/logs?user_id=UUID_DEL_USUARIO" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Detalle de Log
```bash
curl -X GET http://localhost:3000/api/admin/logs/UUID_DEL_LOG \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Estadísticas de Logs
```bash
curl -X GET http://localhost:3000/api/admin/logs/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 7. CONTENIDO

#### FAQs
```bash
# Listar FAQs
curl -X GET http://localhost:3000/api/admin/contenido/faqs \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Crear FAQ
curl -X POST http://localhost:3000/api/admin/contenido/faqs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pregunta": "¿Cómo funciona el sistema de referidos?",
    "respuesta": "Cada vez que alguien se registra con tu código y hace su primera recarga, ambos reciben S/. 10.",
    "orden": 5
  }'

# Actualizar FAQ
curl -X PATCH http://localhost:3000/api/admin/contenido/faqs/UUID_DE_FAQ \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "respuesta": "Respuesta actualizada con más detalles..."
  }'

# Eliminar FAQ
curl -X DELETE http://localhost:3000/api/admin/contenido/faqs/UUID_DE_FAQ \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Términos y Condiciones
```bash
# Obtener términos
curl -X GET http://localhost:3000/api/admin/contenido/terminos \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Actualizar términos
curl -X PATCH http://localhost:3000/api/admin/contenido/terminos \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contenido": "<h1>Términos y Condiciones de EfectivoYa</h1><p>Contenido actualizado...</p>",
    "version": "2.0"
  }'
```

#### Políticas de Privacidad
```bash
# Obtener políticas
curl -X GET http://localhost:3000/api/admin/contenido/politicas \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Actualizar políticas
curl -X PATCH http://localhost:3000/api/admin/contenido/politicas \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contenido": "<h1>Política de Privacidad</h1><p>Contenido actualizado...</p>",
    "version": "2.0"
  }'
```

#### Videos Instructivos
```bash
# Listar videos
curl -X GET http://localhost:3000/api/admin/contenido/videos \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Actualizar video de BCP
curl -X PATCH http://localhost:3000/api/admin/contenido/videos/BCP \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "https://www.youtube.com/watch?v=nuevo-video-bcp",
    "titulo": "Tutorial actualizado BCP 2026"
  }'
```

### 8. GESTIÓN DE ADMINISTRADORES

#### Listar Administradores
```bash
curl -X GET http://localhost:3000/api/admin/admins \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Crear Nuevo Administrador
```bash
curl -X POST http://localhost:3000/api/admin/admins \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@efectivoya.com",
    "password": "Admin456!@#",
    "nombre": "Segundo Administrador",
    "rol": "admin"
  }'
```

**Nota:** Solo super_admin puede crear otros admins

#### Actualizar Administrador
```bash
curl -X PATCH http://localhost:3000/api/admin/admins/UUID_DEL_ADMIN \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nombre Actualizado",
    "rol": "super_admin"
  }'
```

#### Cambiar Contraseña de Administrador
```bash
curl -X PATCH http://localhost:3000/api/admin/admins/UUID_DEL_ADMIN \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NuevaPassword123!@#"
  }'
```

#### Desactivar Administrador
```bash
curl -X PATCH http://localhost:3000/api/admin/admins/UUID_DEL_ADMIN \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'
```

#### Eliminar Administrador
```bash
curl -X DELETE http://localhost:3000/api/admin/admins/UUID_DEL_ADMIN \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Nota:** No puedes eliminarte a ti mismo

## RESULTADO ESPERADO

Al finalizar esta fase tendrás:
✅ Sistema completo de autenticación admin (separado de usuarios)
✅ Dashboard admin con métricas financieras y operacionales
✅ Gráficos de tendencias (últimos 7 días)
✅ Gestión completa de usuarios (listar, buscar, ver detalle, suspender/activar)
✅ Configuración dinámica de la plataforma (comisiones, límites, cuenta recaudadora)
✅ Modo mantenimiento activable
✅ Gestión de alertas de seguridad (listar, revisar)
✅ Visualización completa de logs de auditoría
✅ Gestión de contenido (FAQs, términos, políticas, videos)
✅ CRUD completo de administradores (solo super_admin)
✅ Roles diferenciados (super_admin y admin)
✅ Logs de auditoría para todas las acciones admin
✅ Estadísticas avanzadas en cada módulo

## NOTAS IMPORTANTES

- **Roles:** super_admin (puede crear/editar/eliminar admins) vs admin (solo operaciones)
- **Admin seed:** admin@efectivoya.com / Admin123!@#
- Solo super_admin puede gestionar otros administradores
- No puedes eliminarte a ti mismo como admin
- Todas las acciones admin quedan registradas en audit_logs
- Modo mantenimiento bloquea operaciones de usuarios (excepto login admin)
- Las métricas financieras se calculan en tiempo real
- Los logs tienen paginación (default 50 por página)
- Las alertas pueden filtrarse por tipo y estado

## VERIFICACIONES FINALES

### En Base de Datos
```sql
-- Ver todos los admins
SELECT * FROM admins ORDER BY created_at DESC;

-- Ver logs de acciones admin
SELECT * FROM audit_logs 
WHERE admin_id IS NOT NULL 
ORDER BY created_at DESC LIMIT 20;

-- Ver configuración actual
SELECT * FROM configuracion WHERE id = 1;

-- Ver alertas pendientes
SELECT * FROM alertas_seguridad WHERE revisada = false;

-- Ver FAQs
SELECT * FROM faqs ORDER BY orden ASC;
```

### Endpoints Críticos Funcionando

1. ✅ Login admin
2. ✅ Dashboard con métricas
3. ✅ Listar usuarios
4. ✅ Ver detalle de usuario
5. ✅ Suspender/activar usuario
6. ✅ Actualizar configuración
7. ✅ Toggle modo mantenimiento
8. ✅ Listar alertas
9. ✅ Marcar alertas como revisadas
10. ✅ Ver logs de auditoría
11. ✅ Gestionar FAQs
12. ✅ Actualizar términos y políticas
13. ✅ Actualizar videos instructivos
14. ✅ Crear/editar/eliminar admins