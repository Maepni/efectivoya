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

## 10. Contexto operativo para nueva sesión

### 10.1 Componentes fuente que gobiernan el cambio

- `efectivoya-landing/src/pages/index.astro`
- `efectivoya-landing/src/components/Hero.astro`
- `efectivoya-landing/src/components/Services.astro`
- `efectivoya-landing/src/components/HowItWorks.astro`
- `efectivoya-landing/src/components/FAQ.astro`
- `efectivoya-landing/src/components/Ubicacion.astro`

### 10.2 Idea rectora (no negociable)

- La landing no debe comunicar "billetera general".
- Debe comunicar con prioridad: convertir saldo de tarjeta de crédito en efectivo al instante.
- Frase ancla distribuida: `En efectivo al instante`.

### 10.3 Guardrails UX/UI

- Mantener visual identity actual (paleta oscuro + acentos dorado/rojo).
- No rediseñar layout global ni mover secciones.
- Priorizar claridad de mensaje sobre volumen de texto.
- En móvil, evitar bloques densos y mantener lectura en 1 pasada.

## 11. Matriz de copy de referencia

Esta matriz define dirección editorial para no perder intención entre sesiones.
No es obligatorio usar cada frase literal, pero sí mantener su significado.

### 11.1 Hero

- H1 objetivo: `Convierte el saldo de tu tarjeta de crédito en efectivo al instante`
- Subtexto objetivo: rapidez + seguridad + atención personalizada.
- CTA principal: `Efectivizar ahora`
- CTA secundario: `Ver cómo funciona`

### 11.2 Services

- Beneficio 1: `Efectivización inmediata`
- Beneficio 2: `Atención personalizada`
- Beneficio 3: `Seguridad en cada operación`
- Beneficio 4: `Transparencia total`

### 11.3 HowItWorks

- Paso 1: `Solicita tu operación`
- Paso 2: `Validamos tu información`
- Paso 3: `Recibe tu efectivo al instante`

### 11.4 FAQ

- Qué servicio brinda EfectivoYa
- En cuánto tiempo recibo el efectivo
- Qué necesito para operar
- Seguridad de la operación con tarjeta de crédito
- Horario de atención

### 11.5 Ubicación

- Dirección: `Av Mariscal Castilla N° 1736`
- Referencia: `A 1/2 cuadra de los bancos, entre Jr. Manzanos y Jr. Aguirre Morales`
- Zona: `El Tambo · Huancayo · Junín`
- Horario 1: `Lunes a viernes: 9:00 a 18:00`
- Horario 2: `Sábados: 9:00 a 15:00`
- Maps: `https://maps.app.goo.gl/k1MLNfaNekEjBKw99`

## 12. Especificación responsive mínima (Ubicacion)

- Mobile-first (`<768px`):
  - Layout en una columna.
  - Botón Maps a ancho completo.
  - Jerarquía tipográfica clara y compacta.
  - Sin overflow horizontal.
- Tablet (`>=768px`):
  - Mantener dos columnas foto/info.
  - Espaciado inter-columnas legible.
- Desktop (`>=1024px`):
  - Preservar balance visual actual sin agrandar innecesariamente subtítulos.

## 13. Riesgos de regresión a vigilar

- Reintroducir lenguaje de "billetera digital genérica".
- Mantener términos incorrectos como `boucher`.
- Saturar texto en Hero y perder escaneabilidad.
- Botón Maps pequeño o incómodo en móvil.
