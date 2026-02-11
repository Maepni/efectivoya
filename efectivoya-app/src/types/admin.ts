export interface AdminUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  is_active?: boolean;
  created_at?: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: AdminUser;
}

export interface AdminDashboardMetrics {
  usuarios: {
    total: number;
    activos: number;
    inactivos: number;
  };
  operaciones: {
    recargas: { total: number; pendientes: number; hoy: number };
    retiros: { total: number; pendientes: number; hoy: number };
  };
  alertas: {
    pendientes: number;
  };
  financiero: {
    saldo_total_plataforma: number | string;
    este_mes: {
      total_depositado: number | string;
      comisiones_generadas: number | string;
      neto_recargado: number | string;
      total_retirado: number | string;
    };
  };
}

export interface RawRecentRecarga {
  id: string;
  user_id: string;
  numero_operacion: string;
  banco_origen: string;
  monto_depositado: number | string;
  estado: string;
  created_at: string;
  user: { email: string; nombres: string; apellidos: string };
}

export interface RawRecentRetiro {
  id: string;
  user_id: string;
  numero_operacion: string;
  monto: number | string;
  estado: string;
  created_at: string;
  user: { email: string; nombres: string; apellidos: string };
}

export interface AdminRecentActivity {
  recargas_recientes: RawRecentRecarga[];
  retiros_recientes: RawRecentRetiro[];
  usuarios_nuevos: {
    id: string;
    email: string;
    nombres: string;
    apellidos: string;
    created_at: string;
    email_verificado: boolean;
  }[];
}

export interface AdminTrends {
  recargas_por_dia: { fecha: string; cantidad: number; monto: number | string }[];
  retiros_por_dia: { fecha: string; cantidad: number; monto: number | string }[];
  usuarios_por_dia: { fecha: string; cantidad: number }[];
}

export interface AdminRecargaListItem {
  id: string;
  numeroOperacion: string;
  bancoOrigen: string;
  montoDepositado: number | string;
  comision: number | string;
  montoNeto: number | string;
  boucherUrl: string;
  estado: string;
  fecha: string;
  usuario: {
    id: string;
    email: string;
    nombres: string;
    apellidos: string;
    dni: string;
  };
}

export interface AdminRecargaDetalle {
  recarga: {
    id: string;
    numeroOperacion: string;
    bancoOrigen: string;
    montoDepositado: number | string;
    porcentajeComision: number | string;
    comision: number | string;
    montoNeto: number | string;
    boucherUrl: string;
    estado: string;
    motivoRechazo?: string;
    comprobantePdfUrl?: string;
    fechaCreacion: string;
    fechaProcesamiento?: string;
    admin?: { email: string; nombre: string };
  };
  usuario: {
    id: string;
    email: string;
    nombres: string;
    apellidos: string;
    dni: string;
    whatsapp: string;
    saldoActual: number | string;
    totalRecargas: number;
    recargasAprobadas: number;
    alertasActivas: number;
  };
}

export interface AdminRetiroListItem {
  id: string;
  numero_operacion: string;
  monto: number | string;
  estado: string;
  created_at: string;
  processed_at?: string;
  motivo_rechazo?: string;
  usuario?: {
    id: string;
    email: string;
    nombres: string;
    apellidos: string;
    dni: string;
  };
  banco?: {
    banco: string;
    numero_cuenta: string;
    cci: string;
    alias?: string;
  };
}

export interface AdminRetiroDetalle {
  retiro: {
    id: string;
    numero_operacion: string;
    monto: number | string;
    estado: string;
    motivo_rechazo?: string;
    comprobante_pdf_url?: string;
    created_at: string;
    processed_at?: string;
    usuario: {
      id: string;
      email: string;
      nombres: string;
      apellidos: string;
      dni: string;
      whatsapp: string;
      saldo_actual: number | string;
    };
    banco: {
      banco: string;
      numero_cuenta: string;
      cci: string;
      alias?: string;
    };
    admin?: { email: string; nombre: string };
  };
}

export interface AdminRecargaStats {
  pendientes: number;
  hoy: {
    aprobadas: number;
    rechazadas: number;
  };
  mes: {
    totalAprobadas: number;
    montoTotal: number | string;
  };
}

export interface AdminRetiroStats {
  stats: {
    total_retiros: number;
    pendientes: number;
    aprobados: number;
    rechazados: number;
    monto_total_aprobado: number | string;
  };
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  dni: string;
  whatsapp: string;
  saldo_actual: number | string;
  is_active: boolean;
  email_verificado: boolean;
  created_at: string;
  _count: { recargas: number; retiros: number };
}

export interface AdminUserDetail {
  user: {
    id: string;
    email: string;
    nombres: string;
    apellidos: string;
    dni: string;
    dni_completo: string;
    whatsapp: string;
    saldo_actual: number | string;
    email_verificado: boolean;
    is_active: boolean;
    codigo_referido: string;
    created_at: string;
    recargas: Array<{
      id: string;
      numero_operacion: string;
      banco_origen: string;
      monto_depositado: number | string;
      monto_neto: number | string;
      estado: string;
      created_at: string;
    }>;
    retiros: Array<{
      id: string;
      numero_operacion: string;
      monto: number | string;
      estado: string;
      created_at: string;
      banco: { banco: string; numero_cuenta: string };
    }>;
    bancos: Array<{
      id: string;
      banco: string;
      numero_cuenta: string;
      cci: string;
      alias?: string;
    }>;
  };
  estadisticas: {
    total_recargado: number;
    total_retirado: number;
    saldo_actual: number;
  };
  alertas_recientes: Array<{
    id: string;
    tipo: string;
    descripcion: string;
    revisada: boolean;
    created_at: string;
  }>;
}

export interface AdminUserStats {
  total: number;
  verificados: number;
  activos: number;
  con_saldo: number;
  registros_hoy: number;
  registros_este_mes: number;
}

export interface AdminAlertaListItem {
  id: string;
  tipo: string;
  revisada: boolean;
  created_at: string;
  user: {
    email: string;
    nombres: string;
    apellidos: string;
  };
}

export interface AdminAlertaStats {
  total: number;
  pendientes: number;
  revisadas: number;
  por_tipo: { tipo: string; cantidad: number }[];
}

export interface AdminConfig {
  id: number;
  porcentaje_comision: number;
  monto_minimo_recarga: number;
  monto_maximo_recarga: number;
  cuenta_recaudadora_numero: string;
  cuenta_recaudadora_banco: string;
  cuenta_recaudadora_titular: string;
  mantenimiento_activo: boolean;
  version_minima_android: string;
  version_minima_ios: string;
  forzar_actualizacion: boolean;
  bono_referido: number;
  max_referidos_por_usuario: number;
}

export interface AdminChatListItem {
  id: string;
  estado: 'abierto' | 'cerrado';
  created_at: string;
  updated_at: string;
  user: { email: string; nombres: string; apellidos: string };
  mensajes_no_leidos: number;
  _count: { mensajes: number };
  mensajes: Array<{
    id: string;
    mensaje: string;
    remitente_tipo: 'usuario' | 'admin';
    created_at: string;
  }>;
}

export interface RecentClient {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  lastOpType: 'recarga' | 'retiro';
  lastOpDate: string;
  lastOpAmount: number | string;
  lastOpStatus: string;
}
