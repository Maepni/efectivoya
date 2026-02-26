# Diseño: Reenfoque de copy + ubicación en efectivoya-landing

Fecha: 2026-02-26
Proyecto: efectivoya-landing
Estado: Aprobado por usuario

## 1. Objetivo

Alinear la landing con la esencia real del negocio:
"Convertir el saldo de la tarjeta de crédito en efectivo al instante",
actualizando el mensaje comercial y la sección de ubicación con datos reales.

## 2. Alcance aprobado

Se aprobó el enfoque de reenfoque fuerte de posicionamiento (opción 3):

- Reescribir copy clave en:
  - Hero
  - Services
  - HowItWorks
  - FAQ
  - Ubicacion
- Aplicar microajustes responsive/UI en Ubicacion para mejorar legibilidad y uso móvil.
- Corregir información real de local y horarios.

Fuera de alcance:

- Rediseño visual completo del sitio.
- Cambios de arquitectura o stack.

## 3. Contenido validado

### 3.1 Mensaje principal

- Mensaje central: "En efectivo al instante".
- Posicionamiento: efectivizar saldo de tarjeta de crédito de forma rápida, clara y segura.

### 3.2 Ubicación (datos operativos finales)

- Dirección: Av Mariscal Castilla N° 1736
- Referencia: A 1/2 cuadra de los bancos, entre Jr. Manzanos y Jr. Aguirre Morales
- Zona: El Tambo · Huancayo · Junín
- Horarios:
  - Lunes a viernes: 9:00 a 18:00
  - Sábados: 9:00 a 15:00
- Maps: https://maps.app.goo.gl/k1MLNfaNekEjBKw99

## 4. Arquitectura de contenido

1. Hero: propuesta de valor directa y CTA principal.
2. Services: beneficios alineados al servicio núcleo.
3. HowItWorks: flujo real de operación en 3 pasos.
4. FAQ: objeciones de confianza, tiempos y requisitos.
5. Ubicacion: confianza operativa presencial (dirección/horario/mapa).

## 5. Copy propuesto (base de implementación)

### 5.1 Hero

- Título: "Convierte el saldo de tu tarjeta de crédito en efectivo al instante"
- Subtítulo: "En EfectivoYa te ayudamos a efectivizar tu línea de crédito de forma rápida, segura y con atención personalizada."
- Badge: "En efectivo al instante"
- CTA principal: "Efectivizar ahora"
- CTA secundario: "Ver cómo funciona"

### 5.2 Services

- Efectivización inmediata
- Atención personalizada
- Seguridad en cada operación
- Transparencia total

### 5.3 HowItWorks

1. Solicita tu operación
2. Validamos tu información
3. Recibe tu efectivo al instante

### 5.4 FAQ (enfoque)

- Qué servicio brinda EfectivoYa
- En cuánto tiempo recibo el efectivo
- Qué necesito para operar
- Seguridad de la operación
- Horarios de atención

## 6. Lineamientos UX y responsive

Aplicados desde los criterios de responsive-design + ui-ux-pro-max:

- Mobile-first en sección Ubicacion.
- Tipografía y espaciado fluidos con clamp().
- Botón de Maps full-width en móvil e inline en desktop.
- Jerarquía clara: dirección > referencia > zona > horarios.
- Touch targets mínimos de 44x44.
- Mejorar contraste y lectura de subtítulos en fondo oscuro.
- ARIA y alt text descriptivo en ubicación.

## 7. Reglas editoriales

- Unificar terminología:
  - "tarjeta de crédito"
  - "efectivo al instante"
  - "atención personalizada"
  - "validación"
- Correcciones:
  - "voucher" (no "boucher")
  - "Jr."
  - "N°"
  - acentos y capitalización consistentes
- Evitar copy que posicione el producto como billetera genérica si no apoya el servicio principal.

## 8. Riesgos y mitigación

- Riesgo: promesa comercial ambigua.
  - Mitigación: mensaje central único repetido en hero, pasos y FAQ.
- Riesgo: inconsistencia entre secciones.
  - Mitigación: glosario editorial único.
- Riesgo: fricción móvil en ubicación.
  - Mitigación: ajustes de jerarquía visual y CTA táctil.

## 9. Criterios de éxito

- El usuario entiende en menos de 5 segundos qué hace EfectivoYa.
- Dirección/horarios/maps se muestran correctos y claros.
- La lectura móvil de Ubicacion no presenta saturación ni confusión.
- Copy consistente en todos los bloques clave.

