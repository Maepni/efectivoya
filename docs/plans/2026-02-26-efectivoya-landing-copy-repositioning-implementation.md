# Efectivoya Landing Copy Repositioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reposicionar la landing de EfectivoYa para comunicar con claridad "en efectivo al instante", actualizar ubicación/horarios reales y mejorar la legibilidad responsive de la sección Ubicación.

**Architecture:** Se mantiene la arquitectura actual de Astro por componentes, haciendo cambios editoriales y de estilos en componentes existentes sin rediseño estructural. El flujo de mensaje se refuerza de arriba hacia abajo: Hero (propuesta de valor), HowItWorks (proceso), Services (beneficios), FAQ (objeciones) y Ubicación (confianza operativa). La validación será por build de Astro y checklist manual responsive.

**Tech Stack:** Astro 5, componentes `.astro`, CSS scoped por componente, Tailwind presente en proyecto (sin necesidad de nuevas dependencias).

---

### Task 1: Baseline y guardrails de copy

**Files:**
- Modify: `efectivoya-landing/src/pages/index.astro`
- Verify: `efectivoya-landing/src/components/Hero.astro`
- Verify: `efectivoya-landing/src/components/Services.astro`
- Verify: `efectivoya-landing/src/components/HowItWorks.astro`
- Verify: `efectivoya-landing/src/components/FAQ.astro`
- Verify: `efectivoya-landing/src/components/Ubicacion.astro`

**Step 1: Registrar baseline de términos actuales**

Run: `rg -n "billetera digital|boucher|Tu dinero al instante|Recarga tu billetera|Retiros sin comisión" efectivoya-landing/src -S`
Expected: aparecen términos actuales a reemplazar.

**Step 2: Definir término central y glosario corto**

Aplicar como regla en edición:
- Frase ancla: `en efectivo al instante`
- Términos obligatorios: `tarjeta de crédito`, `voucher`, `validación`, `atención personalizada`

**Step 3: Commit**

```bash
git add docs/plans/2026-02-26-efectivoya-landing-copy-repositioning-implementation.md
git commit -m "docs: add implementation plan for landing copy repositioning"
```

### Task 2: Actualizar metadata SEO al nuevo posicionamiento

**Files:**
- Modify: `efectivoya-landing/src/pages/index.astro`

**Step 1: Verificar copy SEO actual (falla esperada)**

Run: `rg -n "billetera digital|Recarga tu saldo" efectivoya-landing/src/pages/index.astro -S`
Expected: match presente.

**Step 2: Implementar copy SEO mínimo**

Actualizar `title` y `description` para reflejar servicio principal:
- Título centrado en efectivizar saldo de tarjeta de crédito en efectivo.
- Descripción con propuesta concreta y ubicación Huancayo.

**Step 3: Verificar reemplazo**

Run: `rg -n "efectivo al instante|tarjeta de crédito|Huancayo" efectivoya-landing/src/pages/index.astro -S`
Expected: match presente.

**Step 4: Commit**

```bash
git add efectivoya-landing/src/pages/index.astro
git commit -m "feat: update landing metadata to core cash-out positioning"
```

### Task 3: Reescribir Hero con propuesta de valor directa

**Files:**
- Modify: `efectivoya-landing/src/components/Hero.astro`

**Step 1: Verificar texto actual a reemplazar (falla esperada)**

Run: `rg -n "Tu dinero al instante|Recarga tu billetera digital|Aprobación en segundos" efectivoya-landing/src/components/Hero.astro -S`
Expected: match presente.

**Step 2: Implementar nuevo copy Hero**

Cambio de textos:
- Título: `Convierte el saldo de tu tarjeta de crédito en efectivo al instante`
- Tagline: orientado a rapidez + seguridad + atención personalizada
- Badge de velocidad: `En efectivo al instante`
- CTA principal: `Efectivizar ahora`
- CTA secundario: `Ver cómo funciona`

**Step 3: Verificar copy nuevo**

Run: `rg -n "tarjeta de crédito|en efectivo al instante|Efectivizar ahora|Ver cómo funciona" efectivoya-landing/src/components/Hero.astro -S`
Expected: match presente.

**Step 4: Commit**

```bash
git add efectivoya-landing/src/components/Hero.astro
git commit -m "feat: rewrite hero copy for instant cash-out positioning"
```

### Task 4: Reescribir Services al servicio núcleo

**Files:**
- Modify: `efectivoya-landing/src/components/Services.astro`

**Step 1: Verificar términos actuales (falla esperada)**

Run: `rg -n "Recargas con boucher|Retiros sin comisión|Comprobantes PDF|Todo lo que necesitas en un solo lugar" efectivoya-landing/src/components/Services.astro -S`
Expected: match presente.

**Step 2: Implementar títulos y descripciones nuevas**

Cards objetivo:
- Efectivización inmediata
- Atención personalizada
- Seguridad en cada operación
- Transparencia total

Actualizar intro para evitar framing de billetera genérica.

**Step 3: Validar reemplazo**

Run: `rg -n "Efectivización inmediata|Atención personalizada|Seguridad en cada operación|Transparencia total" efectivoya-landing/src/components/Services.astro -S`
Expected: 4 matches.

**Step 4: Commit**

```bash
git add efectivoya-landing/src/components/Services.astro
git commit -m "feat: align services copy with card cash-out value proposition"
```

### Task 5: Ajustar HowItWorks al flujo real

**Files:**
- Modify: `efectivoya-landing/src/components/HowItWorks.astro`

**Step 1: Verificar pasos actuales (falla esperada)**

Run: `rg -n "Regístrate gratis|Recarga tu billetera|Retira cuando quieras" efectivoya-landing/src/components/HowItWorks.astro -S`
Expected: match presente.

**Step 2: Implementar nuevos pasos**

Pasos:
1. Solicita tu operación
2. Validamos tu información
3. Recibe tu efectivo al instante

Actualizar subtítulo para coherencia del flujo.

**Step 3: Verificar pasos nuevos**

Run: `rg -n "Solicita tu operación|Validamos tu información|Recibe tu efectivo al instante" efectivoya-landing/src/components/HowItWorks.astro -S`
Expected: 3 matches.

**Step 4: Commit**

```bash
git add efectivoya-landing/src/components/HowItWorks.astro
git commit -m "feat: update how-it-works to cash-out operation flow"
```

### Task 6: Reescribir FAQ para objeciones críticas del servicio

**Files:**
- Modify: `efectivoya-landing/src/components/FAQ.astro`

**Step 1: Verificar preguntas actuales (falla esperada)**

Run: `rg -n "¿Es seguro usar EfectivoYa\\?|¿Cuánto tiempo demora aprobar una recarga\\?|¿Qué bancos son compatibles\\?" efectivoya-landing/src/components/FAQ.astro -S`
Expected: match presente.

**Step 2: Implementar FAQ nueva**

Preguntas objetivo:
- ¿Qué servicio brinda EfectivoYa?
- ¿En cuánto tiempo recibo el efectivo?
- ¿Qué necesito para operar?
- ¿Es seguro efectivizar mi tarjeta de crédito?
- ¿Cuál es el horario de atención?

Respuestas cortas, claras y sin ambigüedad comercial.

**Step 3: Verificar FAQ nueva**

Run: `rg -n "¿Qué servicio brinda EfectivoYa\\?|¿En cuánto tiempo recibo el efectivo\\?|¿Qué necesito para operar\\?|¿Cuál es el horario de atención\\?" efectivoya-landing/src/components/FAQ.astro -S`
Expected: match presente.

**Step 4: Commit**

```bash
git add efectivoya-landing/src/components/FAQ.astro
git commit -m "feat: rewrite faq to address core cash-out objections"
```

### Task 7: Actualizar Ubicacion con datos reales + ajustes responsive

**Files:**
- Modify: `efectivoya-landing/src/components/Ubicacion.astro`

**Step 1: Verificar placeholders (falla esperada)**

Run: `rg -n "\\[Nombre de la Avenida\\]|\\[Distrito\\]|maps.google.com" efectivoya-landing/src/components/Ubicacion.astro -S`
Expected: match presente.

**Step 2: Implementar datos finales**

Valores:
- `direccion`: `Av Mariscal Castilla N° 1736`
- `referencia`: `A 1/2 cuadra de los bancos, entre Jr. Manzanos y Jr. Aguirre Morales`
- `distrito`: `El Tambo`
- `ciudad`: `Huancayo, Junín`
- `horario`: separar en 2 líneas (L-V / Sábado)
- `mapsUrl`: `https://maps.app.goo.gl/k1MLNfaNekEjBKw99`

**Step 3: Ajuste responsive y accesibilidad**

- Tipografías `clamp()` en título/detalles.
- Botón Maps full width en móvil (`width: 100%`, `justify-content: center`) y normal en desktop.
- Separación vertical mayor entre líneas de dirección/referencia/ciudad.
- `aria-label` del botón con dirección real.
- `fotoAlt` descriptivo del local en El Tambo.

**Step 4: Verificar reemplazo**

Run: `rg -n "Mariscal Castilla|Jr\\. Manzanos|Aguirre Morales|9:00 a 18:00|9:00 a 15:00|maps.app.goo.gl" efectivoya-landing/src/components/Ubicacion.astro -S`
Expected: match presente.

**Step 5: Commit**

```bash
git add efectivoya-landing/src/components/Ubicacion.astro
git commit -m "feat: update location data and responsive UX for Huancayo office"
```

### Task 8: Normalización editorial y correcciones de términos

**Files:**
- Modify: `efectivoya-landing/src/components/Hero.astro`
- Modify: `efectivoya-landing/src/components/Services.astro`
- Modify: `efectivoya-landing/src/components/HowItWorks.astro`
- Modify: `efectivoya-landing/src/components/FAQ.astro`
- Modify: `efectivoya-landing/src/components/Ubicacion.astro`

**Step 1: Buscar inconsistencias (falla esperada)**

Run: `rg -n "boucher|Boucher|billetera digital|recarga tu billetera" efectivoya-landing/src/components -S`
Expected: posibles matches.

**Step 2: Aplicar correcciones**

- Reemplazar `boucher` por `voucher`.
- Evitar claims genéricos de billetera cuando compitan con el mensaje principal.
- Mantener acentos y abreviaturas estándar (`Jr.`, `N°`).

**Step 3: Verificar limpieza**

Run: `rg -n "boucher|Boucher" efectivoya-landing/src/components -S`
Expected: sin resultados.

**Step 4: Commit**

```bash
git add efectivoya-landing/src/components
git commit -m "chore: normalize editorial terminology across landing components"
```

### Task 9: Verificación final técnica y funcional

**Files:**
- Verify: `efectivoya-landing/src/pages/index.astro`
- Verify: `efectivoya-landing/src/components/*.astro`

**Step 1: Build de producción**

Run: `cd efectivoya-landing && npm run build`
Expected: build exitoso sin errores.

**Step 2: Verificación manual rápida en preview**

Run: `cd efectivoya-landing && npm run dev`
Checklist:
- Hero comunica "en efectivo al instante" arriba del fold.
- HowItWorks representa flujo real.
- FAQ responde objeciones del servicio principal.
- Ubicacion muestra dirección, referencia, horarios y Maps correctos.
- Móvil (375px): botón Maps usable, sin overflow horizontal.
- Tablet (768px) y desktop (1024px+): jerarquía y espaciado correctos.

**Step 3: Estado final y commit de cierre**

```bash
git status
git add efectivoya-landing/src/pages/index.astro efectivoya-landing/src/components/Hero.astro efectivoya-landing/src/components/Services.astro efectivoya-landing/src/components/HowItWorks.astro efectivoya-landing/src/components/FAQ.astro efectivoya-landing/src/components/Ubicacion.astro
git commit -m "feat: reposition landing message to instant card cash-out service"
```

