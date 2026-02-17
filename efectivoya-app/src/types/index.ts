export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  dni: string;
  whatsapp: string;
  saldo_actual: number | string;
  codigo_referido: string;
  email_verificado: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterData {
  nombres: string;
  apellidos: string;
  email: string;
  dni: string;
  whatsapp: string;
  password: string;
  codigo_referido_usado?: string;
}

export interface VerifyOTPData {
  userId: string;
  otp: string;
}

export interface DashboardData {
  saldo_disponible: number;
  este_mes: {
    total_recargado: number;
    total_retirado: number;
    cantidad_recargas: number;
    cantidad_retiros: number;
  };
  ultimas_operaciones: Operacion[];
  referidos: {
    codigo_propio: string;
    cantidad_referidos: number;
    max_referidos: number;
    bonos_ganados: number;
  };
}

export interface Operacion {
  id: string;
  tipo: 'recarga' | 'retiro';
  monto: number;
  estado: EstadoOperacion;
  created_at: string;
}

export type EstadoOperacion = 'pendiente' | 'aprobado' | 'rechazado';

export interface ChatMessage {
  id: string;
  chat_id: string;
  remitente_tipo: 'usuario' | 'admin';
  remitente_id: string;
  mensaje: string;
  leido?: boolean;
  created_at: string;
}

export interface Chat {
  id: string;
  estado: 'abierto' | 'cerrado';
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data?: {
    recargas?: T[];
    retiros?: T[];
    total?: number;
    page?: number;
    limit?: number;
  };
  message?: string;
}

export interface UserBank {
  id: string;
  banco: string;
  tipo_cuenta?: 'ahorros' | 'corriente' | null;
  numero_cuenta: string;
  cci: string;
  alias?: string;
  created_at?: string;
}

export interface Recarga {
  id: string;
  numero_operacion: string;
  banco_origen: string;
  monto_depositado: number | string;
  porcentaje_comision: number | string;
  comision_calculada: number | string;
  monto_neto: number | string;
  boucher_url: string;
  estado: EstadoOperacion;
  motivo_rechazo?: string;
  comprobante_pdf_url?: string;
  created_at: string;
  processed_at?: string;
}

export interface Retiro {
  id: string;
  numero_operacion: string;
  user_bank_id: string;
  monto: number | string;
  estado: EstadoOperacion;
  motivo_rechazo?: string;
  comprobante_pdf_url?: string;
  created_at: string;
  processed_at?: string;
  banco?: {
    banco: string;
    tipo_cuenta?: 'ahorros' | 'corriente' | null;
    alias?: string;
    numero_cuenta: string;
    cci: string;
  };
}

export interface RecargaConfig {
  comisiones: {
    BCP: number;
    Interbank: number;
    Scotiabank: number;
    BBVA: number;
  };
  limites: {
    minimo: number;
    maximo: number;
    minimoFormateado: string;
    maximoFormateado: string;
  };
  cuentaRecaudadora: {
    banco: string;
    numero: string;
    titular: string;
  };
  bancosPermitidos: string[];
}
