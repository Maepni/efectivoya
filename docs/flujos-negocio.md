# Flujos de Negocio - EfectivoYa

## 1. Registro de Usuario

```
1. Formulario: email, password, nombres, apellidos, DNI, WhatsApp
2. Opcionalmente: código de referido
3. Backend valida datos
4. Genera código único: EFECTIVO-ABC123
5. Hash password (bcrypt, 10 rounds)
6. Envía email con OTP 6 dígitos
7. Usuario verifica OTP
8. email_verificado = true
9. Genera JWT tokens
10. Login automático
```

## 2. Recarga de Saldo

```
1. Usuario selecciona banco origen
2. Ve: comisión %, cuenta recaudadora, video instructivo
3. Ingresa monto (min 1000, max 100000)
4. Cálculo en tiempo real:
   - Monto depositado: X
   - Comisión (5%): Y
   - Recibirás: Z
5. Sube boucher
6. Estado = "pendiente"
7. Admin revisa y aprueba/rechaza
8. Si aprueba: saldo += monto_neto, genera PDF, notifica
9. Si rechaza: ingresa motivo, notifica
```

## 3. Retiro de Saldo

```
1. Usuario selecciona banco destino (registrado)
2. Ingresa monto (<= saldo_actual)
3. Estado = "pendiente"
4. Admin revisa
5. Si aprueba: saldo -= monto, genera PDF, notifica
6. Admin hace transferencia bancaria EXTERNA manualmente
7. Si rechaza: ingresa motivo, notifica
```

## 4. Sistema de Referidos

```
1. Usuario A comparte código EFECTIVO-ABC123
2. Usuario B se registra con ese código
3. Se crea entrada en tabla "referidos"
4. Usuario B hace primera recarga
5. Admin aprueba recarga
6. Sistema detecta primera recarga de referido
7. Valida límite de referidos de A (max 10)
8. Otorga bono a ambos: saldo += S/. 10
9. Notifica a ambos
```

## 5. Alertas de Seguridad Automáticas

### Retiro Inmediato
- Recarga en últimas 24h + retiro >80% saldo

### Múltiples Recargas
- >3 recargas en última hora

### Patrón Sospechoso
- Múltiples recargas pequeñas → 1 retiro grande

## 6. Generación de Comprobantes PDF

```
1. Crear PDF con pdfkit
2. Header: Logo + título
3. Info operación: número, fecha, estado
4. Info cliente: nombre, DNI, email
5. Detalles según tipo (recarga/retiro)
6. Footer: "Tu Dinero Al Instante"
7. Subir a Cloudinary (carpeta "comprobantes")
8. Guardar URL
9. Enviar por email
```
