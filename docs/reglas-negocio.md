# Reglas de Negocio - EfectivoYa

## Reglas Críticas

1. **No eliminar datos financieros:** Recargas y retiros nunca se eliminan, solo cambian de estado
2. **Auditar todo:** Cada acción importante crea un audit_log
3. **Validar saldo:** Antes de aprobar retiro: `user.saldo_actual >= retiro.monto`
4. **Estado irreversible:** pendiente → aprobado | rechazado (no reversible)
5. **Bouchers obligatorios:** No se puede crear recarga sin boucher

## Validaciones

### Registro
| Campo | Validación |
|-------|------------|
| Email | Formato válido, único |
| DNI | Exactamente 8 dígitos, único |
| Password | Min 8 chars, 1 mayúscula, 1 número, 1 símbolo |
| WhatsApp | 9 dígitos |
| Cuenta bancaria | Min 13 dígitos |
| CCI | Exactamente 20 dígitos |

### Operaciones
| Operación | Límites |
|-----------|---------|
| Recarga mínima | S/. 1,000 |
| Recarga máxima | S/. 100,000 |
| Retiro | Sin límites (solo saldo disponible) |

## Sistema de Referidos

- Código formato: `EFECTIVO-{6 alfanuméricos}`
- Bono: Solo en primera recarga aprobada del referido
- Límite: Max 10 referidos por usuario (configurable)
- Monto bono: S/. 10 para ambos (configurable)

## Rate Limiting

| Endpoint | Límite |
|----------|--------|
| Login | 5 intentos / 15 min / IP |
| Registro | 3 registros / hora / IP |
| Recuperar password | 3 solicitudes / hora / email |

## Seguridad

- Enmascarar datos sensibles en API (mostrar solo últimos 4 dígitos)
- Cloudinary folders separados: `bouchers/` y `comprobantes/`
- Modo mantenimiento bloquea todo excepto login admin

## JWT Tokens

| Token | Duración | Contenido |
|-------|----------|-----------|
| Access | 15 min | userId, email |
| Refresh | 7 días | userId, tokenId |
