# API Endpoints - EfectivoYa

## Rutas de Usuario (8 grupos)

### Auth `/api/auth`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /register | Registro con email, DNI, WhatsApp |
| POST | /verify-email | Verificar OTP de email |
| POST | /login | Login con email + password |
| POST | /refresh | Renovar access token |
| POST | /resend-otp | Reenviar codigo OTP |
| POST | /forgot-password | Solicitar reset de password |
| POST | /reset-password | Resetear password con OTP |
| POST | /logout | Cerrar sesion |
| GET | /profile | Perfil del usuario autenticado |

### User Banks `/api/user-banks`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | / | Listar bancos del usuario |
| POST | / | Agregar cuenta bancaria |
| PATCH | /:id | Actualizar cuenta |
| DELETE | /:id | Eliminar cuenta |
| GET | /stats | Estadisticas de bancos |

### Recargas `/api/recargas`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /config | Configuracion (comision, limites, cuenta destino) |
| GET | /video/:banco | Video instructivo por banco |
| POST | /solicitar | Solicitar recarga (multipart: boucher) |
| GET | /historial | Historial de recargas |
| GET | /:id/comprobante | PDF comprobante (on-the-fly) |

### Retiros `/api/retiros`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /solicitar | Solicitar retiro |
| GET | /historial | Historial de retiros |
| GET | /:id/comprobante | PDF comprobante (on-the-fly) |

### Dashboard `/api/user`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /dashboard | Stats del mes + ultimas 5 operaciones |
| GET | /referido | Codigo de referido del usuario |
| GET | /referidos/lista | Lista de referidos hechos |

### Chat `/api/chat`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | / | Obtener o crear chat del usuario |

### Notifications `/api/notifications`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /register-token | Registrar push token del usuario |
| DELETE | /token | Eliminar push token del usuario |

### Socket.io (WebSocket)
Conexion: `io(url, { auth: { token } })` — Auth via JWT en handshake.

| Evento (cliente envia) | Payload | Descripcion |
|-------------------------|---------|-------------|
| `send_message` | `{ chat_id?, mensaje }` | Enviar mensaje (sin chat_id crea nuevo chat) |
| `mark_as_read` | `chatId: string` | Marcar mensajes del otro como leidos |
| `get_chat_history` | `chatId: string, callback` | Obtener historial (callback con response) |

| Evento (servidor envia) | Payload | Descripcion |
|--------------------------|---------|-------------|
| `message_sent` | `{ id, chat_id, remitente_tipo, mensaje, ... }` | Confirmacion al remitente |
| `new_message` | `{ id, chat_id, remitente_tipo, mensaje, ... }` | Mensaje nuevo al destinatario |
| `messages_marked_read` | `{ chat_id }` | Confirmacion de lectura |
| `error` | `{ message }` | Error del servidor |

Salas: `user_{id}` (usuarios), `admins` (todos los admins).

## Rutas de Admin (13 grupos)

### Admin Auth `/api/admin/auth`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /login | Login admin (rate limited) |
| GET | /profile | Perfil admin autenticado |
| POST | /logout | Logout admin |

### Admin Dashboard `/api/admin/dashboard`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /metrics | Metricas generales del sistema |
| GET | /recent-activity | Ultimas recargas, retiros, usuarios |
| GET | /trends | Tendencias ultimos 7 dias (raw SQL) |

### Admin Users `/api/admin/users`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /stats | Estadisticas de usuarios |
| GET | / | Listar con busqueda y paginacion |
| GET | /:id | Detalle completo del usuario |
| PATCH | /:id/toggle-status | Suspender/activar usuario |

### Admin Config `/api/admin/config`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | / | Obtener configuracion global |
| PATCH | / | Actualizar configuracion |
| PATCH | /maintenance | Toggle modo mantenimiento |

### Admin Alertas `/api/admin/alertas`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /stats | Estadisticas de alertas |
| PATCH | /revisar-todas | Marcar todas como revisadas |
| GET | / | Listar con filtros y paginacion |
| PATCH | /:id/revisar | Marcar alerta como revisada |

### Admin Logs `/api/admin/logs`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /stats | Estadisticas de logs |
| GET | / | Listar con filtros y paginacion |
| GET | /:id | Detalle de un log |

### Admin Contenido `/api/admin/contenido`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /faqs | Listar FAQs |
| POST | /faqs | Crear FAQ |
| PATCH | /faqs/:id | Actualizar FAQ |
| DELETE | /faqs/:id | Eliminar FAQ |
| GET | /terminos | Obtener terminos |
| PATCH | /terminos | Actualizar terminos |
| GET | /politicas | Obtener politicas |
| PATCH | /politicas | Actualizar politicas |
| GET | /videos | Listar videos instructivos |
| PATCH | /videos/:banco | Actualizar video por banco |

### Admin Admins `/api/admin/admins` (solo super_admin)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | / | Listar administradores |
| POST | / | Crear administrador |
| PATCH | /:id | Actualizar administrador |
| DELETE | /:id | Eliminar administrador |

### Admin Recargas `/api/admin/recargas`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /pendientes | Recargas pendientes |
| GET | /stats | Estadisticas |
| GET | / | Listado con filtros |
| GET | /:id | Detalle de recarga |
| PATCH | /:id/aprobar | Aprobar recarga |
| PATCH | /:id/rechazar | Rechazar recarga |

### Admin Retiros `/api/admin/retiros`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /pendientes | Retiros pendientes |
| GET | /stats | Estadisticas |
| GET | / | Listado con filtros |
| GET | /:id | Detalle de retiro |
| PATCH | /:id/aprobar | Aprobar retiro |
| PATCH | /:id/rechazar | Rechazar retiro |

### Admin Chats `/api/admin/chats`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | / | Listar chats (filtro por estado, paginacion) |
| GET | /:id | Detalle de chat con mensajes |
| PATCH | /:id/cerrar | Cerrar chat |
| PATCH | /:id/reabrir | Reabrir chat cerrado |

### Notifications Admin `/api/notifications`
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /admin/register-token | Registrar push token del admin |
