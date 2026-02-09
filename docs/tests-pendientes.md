# Tests Pendientes - EfectivoYa

No se han escrito tests automatizados todavia. Framework sugerido: Jest + Supertest.

## Auth
- [ ] Registro exitoso con datos validos
- [ ] Registro falla con email duplicado, DNI duplicado
- [ ] Verificacion de email con OTP correcto/incorrecto/expirado
- [ ] Login exitoso, login con credenciales invalidas
- [ ] Refresh token genera nuevo access token
- [ ] Forgot/reset password flujo completo
- [ ] Logout invalida sesion

## Validators (unit tests)
- [ ] `isValidEmail` — emails validos e invalidos
- [ ] `isValidDNI` — exactamente 8 digitos
- [ ] `isValidPassword` — min 8 chars, 1 mayuscula, 1 numero, 1 simbolo
- [ ] `isValidWhatsApp` — exactamente 9 digitos
- [ ] `isValidCCI` — exactamente 20 digitos
- [ ] `sanitizeString` — remueve `<>`, trims

## Middleware
- [ ] `authMiddleware` — rechaza sin token, token expirado, usuario inactivo
- [ ] `adminAuthMiddleware` — rechaza sin token, admin inactivo
- [ ] `superAdminMiddleware` — rechaza rol `admin`, acepta `super_admin`
- [ ] `loginLimiter` — bloquea despues de 5 intentos en 15 min

## Recargas
- [ ] Solicitud exitosa con boucher valido
- [ ] Solicitud falla sin boucher, monto fuera de limites
- [ ] Aprobacion: saldo se acredita, PDF se genera, bono referido en primera recarga
- [ ] Rechazo: saldo no cambia, motivo requerido
- [ ] Comprobante PDF se genera on-the-fly

## Retiros
- [ ] Solicitud exitosa con saldo suficiente
- [ ] Solicitud falla con saldo insuficiente
- [ ] Aprobacion: saldo se descuenta atomicamente ($transaction)
- [ ] Rechazo: saldo no cambia
- [ ] Comprobante PDF se genera on-the-fly

## Referidos
- [ ] Registro con codigo valido crea relacion Referido
- [ ] Primera recarga del referido otorga bono a ambos (S/. 10)
- [ ] Bono no se otorga en segunda recarga
- [ ] Max referidos por usuario se respeta

## Alertas de Seguridad
- [ ] >3 recargas/hora genera alerta `multiples_recargas`
- [ ] Boucher duplicado genera alerta `boucher_duplicado`
- [ ] Retiro >80% saldo dentro de 24h de recargar genera `retiro_inmediato`

## Panel Admin (Fase 6)
- [ ] Dashboard metrics devuelve datos correctos
- [ ] Listar usuarios con paginacion y busqueda
- [ ] Toggle status usuario suspende/activa
- [ ] Actualizar configuracion global
- [ ] Marcar alertas como revisadas (individual y masiva)
- [ ] CRUD FAQs, terminos, politicas, videos
- [ ] CRUD admins solo permitido para super_admin
- [ ] Logs se registran para todas las acciones admin

## Chat Soporte (Fase 7)

### REST endpoints
- [ ] GET `/api/chat` — usuario obtiene o crea su chat
- [ ] GET `/api/admin/chats` — admin lista chats con paginacion y filtro por estado
- [ ] GET `/api/admin/chats/:id` — admin obtiene detalle con mensajes
- [ ] PATCH `/api/admin/chats/:id/cerrar` — cerrar chat cambia estado y pone closed_at
- [ ] PATCH `/api/admin/chats/:id/reabrir` — reabrir chat limpia closed_at

### Socket.io
- [ ] Conexion rechazada sin token o con token invalido
- [ ] Conexion rechazada para usuario/admin inactivo
- [ ] Usuario se une a sala `user_{id}`, admin a sala `admins`
- [ ] `send_message` sin chat_id crea nuevo chat (solo usuario)
- [ ] `send_message` con chat_id existente agrega mensaje
- [ ] `send_message` rechaza mensaje vacio
- [ ] `send_message` rechaza si usuario no es dueno del chat
- [ ] `message_sent` se emite al remitente con payload correcto
- [ ] `new_message` se emite a sala contraria (usuario->admins, admin->user_{id})
- [ ] `mark_as_read` marca mensajes del otro remitente_tipo como leidos
- [ ] `get_chat_history` retorna mensajes ordenados (callback pattern)
- [ ] `get_chat_history` rechaza chat inexistente o no autorizado
- [ ] Desconexion limpia userSockets y socketUsers

## Notifications Push (Fase 7)
- [ ] POST `/api/notifications/register-token` — guarda push_token en User
- [ ] DELETE `/api/notifications/token` — elimina push_token del User
- [ ] POST `/api/notifications/admin/register-token` — guarda push_token en Admin
- [ ] FCMService.notificarNuevoMensaje envia push al usuario cuando admin responde
- [ ] FCMService degrada gracefully sin Firebase configurado (isConfigured guard)
