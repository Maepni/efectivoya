export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  dni: string;
  whatsapp: string;
  saldo_actual: number;
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
  saldo: number;
  recargas_mes: number;
  retiros_mes: number;
  monto_recargas_mes: number;
  monto_retiros_mes: number;
  ultimas_operaciones: Operacion[];
  referidos: {
    total: number;
    codigo: string;
    bono_total: number;
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
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface UserBank {
  id: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  cci: string;
  es_principal: boolean;
}

export interface Recarga {
  id: string;
  monto_depositado: number;
  banco_origen: string;
  numero_operacion: string;
  estado: EstadoOperacion;
  comision: number;
  monto_acreditado: number;
  created_at: string;
}

export interface Retiro {
  id: string;
  monto: number;
  banco_destino: string;
  estado: EstadoOperacion;
  created_at: string;
}
