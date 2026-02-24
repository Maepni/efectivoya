# Landing Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mejorar la landing de EfectivoYa con nombre bicolor, badge de aprobación instantánea, efectos CSS de dinero flotante en Hero y CTAFinal, nueva sección de videos tutoriales por banco (YouTube embed), y nueva sección de ubicación del local.

**Architecture:** Todos los cambios son en `efectivoya-landing/src/`. Se modifican componentes existentes (Hero, CTAFinal, Stats, Navbar, Footer) y se crean dos nuevos (VideosTutoriales, Ubicacion). Se inserta el orden correcto en `index.astro`. Sin dependencias externas nuevas — pure Astro + CSS.

**Tech Stack:** Astro 5, Tailwind CSS 3 (solo para clases de reset/layout si aplica), CSS custom properties, HTML5 `<iframe>` para YouTube.

---

## Archivos que se tocan

| Acción | Archivo |
|--------|---------|
| Modificar | `efectivoya-landing/src/components/Navbar.astro` |
| Modificar | `efectivoya-landing/src/components/Footer.astro` |
| Modificar | `efectivoya-landing/src/components/Hero.astro` |
| Modificar | `efectivoya-landing/src/components/Stats.astro` |
| Modificar | `efectivoya-landing/src/components/CTAFinal.astro` |
| Crear | `efectivoya-landing/src/components/VideosTutoriales.astro` |
| Crear | `efectivoya-landing/src/components/Ubicacion.astro` |
| Modificar | `efectivoya-landing/src/pages/index.astro` |
| Crear (placeholder) | `efectivoya-landing/public/local.jpg` ← foto real del local |

---

## Task 1: Logo bicolor en Navbar

**Archivos:**
- Modificar: `efectivoya-landing/src/components/Navbar.astro`

El Navbar usa `<img src="/logo.png">`. Se reemplaza por texto CSS bicolor para que "Efectivo" aparezca en blanco y "Ya" en rojo, siempre visible y sin depender del archivo de imagen.

**Step 1: Reemplazar el `<img>` del logo en Navbar**

Localizar el bloque del logo (líneas 9-11):
```html
<a href="/" class="navbar-logo" aria-label="EfectivoYa — Inicio">
  <img src="/logo.png" alt="EfectivoYa" class="navbar-logo-img" />
</a>
```

Reemplazar por:
```html
<a href="/" class="navbar-logo" aria-label="EfectivoYa — Inicio">
  <span class="navbar-logo-text" aria-label="EfectivoYa">
    Efectivo<span class="navbar-logo-ya">Ya</span>
  </span>
</a>
```

**Step 2: Reemplazar los estilos del logo en Navbar**

Localizar en `<style>` el bloque `.navbar-logo-img { ... }` y REEMPLAZARLO (no agregar) por:
```css
.navbar-logo-text {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px;
  color: #fff;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
}

.navbar-logo-ya {
  color: #ED323A;
}
```

**Step 3: Verificar en el navegador**

```bash
cd efectivoya-landing && npm run dev
```
Abrir `http://localhost:4321` y verificar que el navbar muestra "Efectivo**Ya**" con "Ya" en rojo.

**Step 4: Commit**

```bash
cd efectivoya-landing
git add src/components/Navbar.astro
git commit -m "feat: logo bicolor Efectivo/Ya en navbar"
```

---

## Task 2: Logo bicolor en Footer

**Archivos:**
- Modificar: `efectivoya-landing/src/components/Footer.astro`

**Step 1: Reemplazar el `<img>` del logo en Footer**

Localizar (línea ~12-14):
```html
<a href="/" class="footer-logo" aria-label="EfectivoYa — Inicio">
  <img src="/logo.png" alt="EfectivoYa" class="footer-logo-img" />
</a>
```

Reemplazar por:
```html
<a href="/" class="footer-logo" aria-label="EfectivoYa — Inicio">
  <span class="footer-logo-text" aria-label="EfectivoYa">
    Efectivo<span class="footer-logo-ya">Ya</span>
  </span>
</a>
```

**Step 2: Reemplazar estilos del logo en Footer**

Localizar `.footer-logo-img { ... }` y REEMPLAZARLO por:
```css
.footer-logo-text {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 26px;
  color: #fff;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
  margin-bottom: 16px;
  display: inline-block;
}

.footer-logo-ya {
  color: #ED323A;
}
```

**Step 3: Verificar en footer**

Scroll al final de `http://localhost:4321` y verificar que dice "EfectivoYa" bicolor.

**Step 4: Commit**

```bash
git add src/components/Footer.astro
git commit -m "feat: logo bicolor Efectivo/Ya en footer"
```

---

## Task 3: Badge aprobación instantánea en Hero

**Archivos:**
- Modificar: `efectivoya-landing/src/components/Hero.astro`

**Step 1: Agregar el badge de velocidad al Hero**

Localizar el bloque `.hero-ctas` (después del tagline, antes de los store badges). Insertar ANTES del div `.hero-ctas`:

```html
<!-- Speed badge -->
<div class="speed-badge fade-up delay-350" role="presentation">
  <span class="speed-icon" aria-hidden="true">⚡</span>
  <span>Aprobación en segundos&nbsp;—&nbsp;no horas, no minutos</span>
</div>
```

**Step 2: Agregar los estilos del speed badge**

Al final del bloque `<style>`, antes del `@media (max-width: 480px)`, agregar:
```css
/* ── Speed badge ── */
.speed-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(237, 50, 58, 0.12);
  border: 1px solid rgba(237, 50, 58, 0.4);
  border-radius: 100px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #ff6b70;
  margin-bottom: 28px;
  animation: speedPulse 2.8s ease-in-out infinite;
}

.speed-icon {
  font-size: 15px;
  animation: boltFlash 2.8s ease-in-out infinite;
}

@keyframes speedPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(237, 50, 58, 0); }
  50%       { box-shadow: 0 0 0 6px rgba(237, 50, 58, 0); border-color: rgba(237, 50, 58, 0.7); }
}

@keyframes boltFlash {
  0%, 80%, 100% { opacity: 1; }
  90%           { opacity: 0.4; }
}
```

**Step 3: Verificar el badge**

En `http://localhost:4321`, el Hero debe mostrar el badge ⚡ entre el tagline y los botones CTA.

**Step 4: Commit**

```bash
git add src/components/Hero.astro
git commit -m "feat: badge aprobacion instantanea en hero"
```

---

## Task 4: Efectos CSS de dinero flotante en Hero

**Archivos:**
- Modificar: `efectivoya-landing/src/components/Hero.astro`

**Step 1: Agregar los elementos flotantes al HTML del Hero**

Localizar `<!-- Subtle gold grid -->` al inicio de `<section class="hero">`. Insertar DESPUÉS del `<div class="corner-accent corner-br">`:

```html
<!-- Floating money elements -->
<div class="money-field" aria-hidden="true">
  <span class="coin" style="left:8%;  animation-delay:0s;   animation-duration:9s">S/.</span>
  <span class="coin" style="left:18%; animation-delay:1.2s; animation-duration:12s">+</span>
  <span class="coin" style="left:27%; animation-delay:2.5s; animation-duration:8s">S/.</span>
  <span class="coin" style="left:38%; animation-delay:0.8s; animation-duration:14s">💰</span>
  <span class="coin" style="left:52%; animation-delay:3.1s; animation-duration:10s">S/.</span>
  <span class="coin" style="left:63%; animation-delay:1.7s; animation-duration:11s">+</span>
  <span class="coin" style="left:72%; animation-delay:0.4s; animation-duration:13s">S/.</span>
  <span class="coin" style="left:83%; animation-delay:2.2s; animation-duration:9s">💵</span>
  <span class="coin" style="left:91%; animation-delay:3.8s; animation-duration:12s">S/.</span>
  <span class="coin" style="left:45%; animation-delay:5s;   animation-duration:15s">+</span>
  <span class="coin" style="left:12%; animation-delay:6s;   animation-duration:11s">💰</span>
  <span class="coin" style="left:77%; animation-delay:4.5s; animation-duration:10s">S/.</span>
</div>
```

**Step 2: Agregar estilos de los elementos flotantes**

Agregar en el `<style>` del Hero (antes del cierre `</style>`):

```css
/* ── Floating money ── */
.money-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.coin {
  position: absolute;
  bottom: -40px;
  font-family: 'Bebas Neue', 'Sora', sans-serif;
  font-size: clamp(13px, 1.6vw, 18px);
  color: #E09F3C;
  opacity: 0;
  animation: coinFloat linear infinite;
  user-select: none;
}

@keyframes coinFloat {
  0%   { opacity: 0;    transform: translateY(0)    rotate(0deg);  }
  8%   { opacity: 0.13; }
  88%  { opacity: 0.07; }
  100% { opacity: 0;    transform: translateY(-95vh) rotate(25deg); }
}
```

**Step 3: Asegurar que `.hero-content` tiene `z-index: 1`**

Ya existe en el CSS: `.hero-content { z-index: 1; }`. Solo verificar que el nuevo `.money-field` tiene `z-index: 0` (ya lo tiene). El contenido queda sobre los elementos flotantes.

**Step 4: Verificar animación**

En `http://localhost:4321` el Hero debe mostrar símbolos S/. y 💰 flotando hacia arriba sutilmente en el fondo. Deben ser apenas visibles (no distractores).

**Step 5: Commit**

```bash
git add src/components/Hero.astro
git commit -m "feat: efectos CSS dinero flotante en hero"
```

---

## Task 5: Modificar Stats — agregar stat de velocidad

**Archivos:**
- Modificar: `efectivoya-landing/src/components/Stats.astro`

**Step 1: Agregar el 4to stat al HTML**

Localizar el bloque que termina con el último `<div class="stat-divider">` y el tercer `<div class="stat-item">`. Agregar DESPUÉS del tercer stat-item, antes del `</div>` del `.stats-container`:

```html
<div class="stat-divider" aria-hidden="true"></div>

<!-- Stat 4 -->
<div class="stat-item reveal" style="transition-delay: 0.36s">
  <div class="stat-number stat-number--lt">
    <span class="stat-lt">&lt;</span>
    <span class="counter"
      data-count="60"
      data-suffix="s"
      aria-label="Menos de 60 segundos"
    >0</span>
  </div>
  <div class="stat-meta">
    <div class="stat-label">Aprobación de recarga</div>
    <div class="stat-sub">no horas, no minutos</div>
  </div>
</div>
```

**Step 2: Actualizar el grid CSS para 4 columnas**

Localizar en `<style>` el media query `@media (min-width: 640px)` donde dice `grid-template-columns: 1fr auto 1fr auto 1fr;`. Cambiarlo a:
```css
@media (min-width: 640px) {
  .stats-container {
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
    align-items: center;
  }
}
```

**Step 3: Agregar estilos del stat de velocidad**

En `<style>`, después de `.stat-currency { ... }`, agregar:
```css
.stat-number--lt {
  display: flex;
  align-items: baseline;
  gap: 1px;
}

.stat-lt {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(28px, 4vw, 38px);
  color: #ED323A;
  letter-spacing: 0.02em;
}

.stat-number--lt .counter {
  color: #ED323A;
}
```

**Step 4: Verificar en el navegador**

La sección Stats debe mostrar 4 métricas en desktop, la última con "< 60s Aprobación de recarga".

**Step 5: Commit**

```bash
git add src/components/Stats.astro
git commit -m "feat: stat de aprobacion instantanea en stats"
```

---

## Task 6: Efectos CSS de dinero flotante en CTAFinal + título actualizado

**Archivos:**
- Modificar: `efectivoya-landing/src/components/CTAFinal.astro`

**Step 1: Agregar los elementos flotantes al HTML del CTAFinal**

Localizar `<section class="cta-section">`. Agregar DESPUÉS de `<div class="cta-deco cta-deco-2">`:

```html
<!-- Floating money elements -->
<div class="cta-money-field" aria-hidden="true">
  <span class="cta-coin" style="left:5%;  animation-delay:1s;   animation-duration:10s">S/.</span>
  <span class="cta-coin" style="left:22%; animation-delay:0s;   animation-duration:13s">+</span>
  <span class="cta-coin" style="left:35%; animation-delay:2.8s; animation-duration:9s">S/.</span>
  <span class="cta-coin" style="left:55%; animation-delay:4s;   animation-duration:12s">💰</span>
  <span class="cta-coin" style="left:68%; animation-delay:1.5s; animation-duration:11s">S/.</span>
  <span class="cta-coin" style="left:82%; animation-delay:3.3s; animation-duration:14s">+</span>
  <span class="cta-coin" style="left:92%; animation-delay:0.6s; animation-duration:10s">💵</span>
  <span class="cta-coin" style="left:47%; animation-delay:5.5s; animation-duration:8s">S/.</span>
</div>
```

**Step 2: Actualizar el título del CTAFinal**

Localizar:
```html
<h2 class="cta-title">
  Tu dinero,<br/>
  <span class="cta-title-accent">al instante</span>
</h2>
```

Reemplazar por:
```html
<h2 class="cta-title">
  Tu dinero.<br/>
  <span class="cta-title-accent">Ahora mismo.</span>
</h2>
```

**Step 3: Actualizar la descripción del CTAFinal**

Localizar:
```html
<p class="cta-desc">
  Únete a miles de peruanos que ya gestionan su dinero con EfectivoYa.
  Registro gratuito, sin complicaciones.
</p>
```

Reemplazar por:
```html
<p class="cta-desc">
  Únete a miles de peruanos que ya gestionan su dinero con Efectivo<span class="cta-ya">Ya</span>.
  Aprobación en segundos, retiros sin comisión.
</p>
```

**Step 4: Agregar estilos en el CTAFinal**

Al final del `<style>`, antes de `</style>`:
```css
/* ── Floating money ── */
.cta-money-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.cta-coin {
  position: absolute;
  bottom: -40px;
  font-family: 'Bebas Neue', 'Sora', sans-serif;
  font-size: clamp(14px, 1.8vw, 20px);
  color: #E09F3C;
  opacity: 0;
  animation: ctaCoinFloat linear infinite;
  user-select: none;
}

@keyframes ctaCoinFloat {
  0%   { opacity: 0;    transform: translateY(0)    rotate(-10deg); }
  8%   { opacity: 0.10; }
  88%  { opacity: 0.06; }
  100% { opacity: 0;    transform: translateY(-90vh) rotate(15deg); }
}

.cta-ya {
  color: #ED323A;
}
```

**Step 5: Asegurar que `.cta-container` tiene `z-index: 1`**

Ya existe en el CSS: `.cta-container { z-index: 1; }`. Verificar que está antes del nuevo `z-index: 0` del campo de monedas.

**Step 6: Verificar animación en CTAFinal**

Scroll hasta el CTAFinal en `http://localhost:4321`. Deben verse los símbolos flotando, el título actualizado y "EfectivoYa" con "Ya" en rojo.

**Step 7: Commit**

```bash
git add src/components/CTAFinal.astro
git commit -m "feat: dinero flotante y titulo actualizado en CTA final"
```

---

## Task 7: Nueva sección VideosTutoriales

**Archivos:**
- Crear: `efectivoya-landing/src/components/VideosTutoriales.astro`

Esta sección va entre `Banks` y `WhyUs` en `index.astro`.

**Step 1: Crear el archivo del componente**

Crear `efectivoya-landing/src/components/VideosTutoriales.astro` con el siguiente contenido completo:

```astro
---
// Reemplaza los youtubeId con los IDs reales de YouTube cuando tengas los videos.
// El ID es la parte final de la URL: youtube.com/watch?v=ESTE_ES_EL_ID
const banks = [
  {
    id: 'bcp',
    nombre: 'BCP',
    youtubeId: 'dQw4w9WgXcQ', // ← reemplazar con ID real
    desc: 'Cómo depositar desde la app o agencia BCP a tu billetera EfectivoYa.',
  },
  {
    id: 'interbank',
    nombre: 'Interbank',
    youtubeId: 'dQw4w9WgXcQ', // ← reemplazar con ID real
    desc: 'Paso a paso para recargar desde Interbank en menos de 2 minutos.',
  },
  {
    id: 'scotiabank',
    nombre: 'Scotiabank',
    youtubeId: 'dQw4w9WgXcQ', // ← reemplazar con ID real
    desc: 'Tutorial para hacer tu depósito desde Scotiabank rápidamente.',
  },
  {
    id: 'bbva',
    nombre: 'BBVA',
    youtubeId: 'dQw4w9WgXcQ', // ← reemplazar con ID real
    desc: 'Cómo transferir desde BBVA y recibir tu saldo al instante.',
  },
];
---

<section id="tutoriales" class="videos-section">
  <div class="videos-container">

    <div class="videos-header reveal">
      <span class="section-label">Guías en video</span>
      <h2 class="videos-title">Así se hace en cada banco</h2>
      <p class="videos-subtitle">
        Tutoriales paso a paso para recargar desde tu banco favorito en segundos.
      </p>
    </div>

    <!-- Tabs -->
    <div class="bank-tabs" role="tablist" aria-label="Seleccionar banco">
      {banks.map((bank, i) => (
        <button
          class={`bank-tab${i === 0 ? ' active' : ''}`}
          role="tab"
          aria-selected={i === 0 ? 'true' : 'false'}
          aria-controls={`panel-${bank.id}`}
          id={`tab-${bank.id}`}
          data-bank={bank.id}
        >
          {bank.nombre}
        </button>
      ))}
    </div>

    <!-- Panels -->
    {banks.map((bank, i) => (
      <div
        class={`bank-panel${i === 0 ? ' active' : ''}`}
        role="tabpanel"
        id={`panel-${bank.id}`}
        aria-labelledby={`tab-${bank.id}`}
        hidden={i !== 0}
      >
        <div class="video-wrapper reveal">
          <iframe
            src={`https://www.youtube.com/embed/${bank.youtubeId}?rel=0&modestbranding=1`}
            title={`Tutorial ${bank.nombre} — EfectivoYa`}
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
        <p class="video-desc">{bank.desc}</p>
      </div>
    ))}

  </div>
</section>

<style>
  .videos-section {
    background: #1A1919;
    padding: clamp(64px, 10vw, 100px) 24px;
  }

  .videos-container {
    max-width: 900px;
    margin: 0 auto;
  }

  /* ── Header ── */
  .videos-header {
    text-align: center;
    margin-bottom: clamp(40px, 6vw, 60px);
  }

  .videos-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(36px, 6vw, 60px);
    color: #fff;
    line-height: 1;
    margin-bottom: 14px;
  }

  .videos-subtitle {
    font-family: 'Sora', sans-serif;
    font-size: clamp(15px, 2vw, 18px);
    font-weight: 400;
    color: #B2B3B3;
    max-width: 480px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .videos-header .section-label {
    color: #E09F3C;
  }

  /* ── Tabs ── */
  .bank-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 28px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
  }

  .bank-tabs::-webkit-scrollbar {
    display: none;
  }

  .bank-tab {
    flex-shrink: 0;
    padding: 10px 24px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #B2B3B3;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .bank-tab:hover {
    color: #fff;
    background: rgba(255,255,255,0.08);
  }

  .bank-tab.active {
    background: rgba(237, 50, 58, 0.15);
    border-color: #ED323A;
    color: #ff6b70;
  }

  /* ── Panels ── */
  .bank-panel {
    display: none;
  }

  .bank-panel.active {
    display: block;
  }

  /* ── Video iframe wrapper 16:9 ── */
  .video-wrapper {
    position: relative;
    width: 100%;
    padding-top: 56.25%; /* 16:9 */
    border-radius: 12px;
    overflow: hidden;
    background: #0f0f0f;
    border: 1px solid rgba(224,159,60,0.15);
    margin-bottom: 20px;
  }

  .video-wrapper iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }

  .video-desc {
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 400;
    color: #B2B3B3;
    text-align: center;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }
</style>

<script>
  const tabs = document.querySelectorAll('.bank-tab');
  const panels = document.querySelectorAll('.bank-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = (tab as HTMLElement).dataset.bank;

      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => {
        p.classList.remove('active');
        (p as HTMLElement).hidden = true;
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const panel = document.getElementById(`panel-${target}`);
      if (panel) {
        panel.classList.add('active');
        panel.hidden = false;
      }
    });
  });
</script>
```

**Step 2: Verificar que el archivo existe**

```bash
ls efectivoya-landing/src/components/VideosTutoriales.astro
```

**Step 3: Commit**

```bash
git add src/components/VideosTutoriales.astro
git commit -m "feat: seccion videos tutoriales por banco con tabs YouTube"
```

---

## Task 8: Nueva sección Ubicacion

**Archivos:**
- Crear: `efectivoya-landing/src/components/Ubicacion.astro`
- Crear placeholder: `efectivoya-landing/public/local.jpg` (foto real a colocar después)

Esta sección va entre `FAQ` y `CTAFinal`.

**Step 1: Crear el archivo del componente**

Crear `efectivoya-landing/src/components/Ubicacion.astro`:

```astro
---
// ← Editar con la información real del local
const LOCAL = {
  nombre: 'EfectivoYa',
  direccion: 'Av. [Nombre de la Avenida] [Número]',
  referencia: 'Frente a [referencia conocida]',
  distrito: '[Distrito]',
  ciudad: 'Lima, Perú',
  horario: 'Lun – Sáb  /  9:00 – 18:00',
  mapsUrl: 'https://maps.google.com/?q=EfectivoYa+Lima', // ← reemplazar con link real
  foto: '/local.jpg', // ← colocar foto real en efectivoya-landing/public/local.jpg
  fotoAlt: 'Local de EfectivoYa',
};
---

<section id="ubicacion" class="ubicacion-section">
  <div class="ubicacion-container">

    <div class="ubicacion-grid reveal">

      <!-- Foto del local -->
      <div class="ubicacion-foto-wrap">
        <img
          src={LOCAL.foto}
          alt={LOCAL.fotoAlt}
          class="ubicacion-foto"
          loading="lazy"
          width="640"
          height="480"
        />
        <div class="foto-overlay" aria-hidden="true"></div>
      </div>

      <!-- Información -->
      <div class="ubicacion-info">
        <span class="section-label">Nos encuentras aquí</span>

        <h2 class="ubicacion-title">
          Visítanos en<br/>
          <span class="ubicacion-title-accent">Lima</span>
        </h2>

        <ul class="ubicacion-details" role="list">
          <li class="detail-item">
            <span class="detail-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5C6.24 1.5 4 3.74 4 6.5c0 3.75 5 10 5 10s5-6.25 5-10c0-2.76-2.24-5-5-5z" stroke="#ED323A" stroke-width="1.4" stroke-linejoin="round"/>
                <circle cx="9" cy="6.5" r="1.8" stroke="#ED323A" stroke-width="1.4"/>
              </svg>
            </span>
            <div>
              <span class="detail-main">{LOCAL.direccion}</span>
              {LOCAL.referencia && (
                <span class="detail-sub">{LOCAL.referencia}</span>
              )}
              <span class="detail-sub">{LOCAL.distrito} · {LOCAL.ciudad}</span>
            </div>
          </li>

          <li class="detail-item">
            <span class="detail-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#E09F3C" stroke-width="1.4"/>
                <path d="M9 5v4l2.5 2.5" stroke="#E09F3C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div>
              <span class="detail-main">Horario de atención</span>
              <span class="detail-sub">{LOCAL.horario}</span>
            </div>
          </li>
        </ul>

        <a
          href={LOCAL.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="maps-btn"
          aria-label="Ver ubicación en Google Maps"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5C5.52 1.5 3.5 3.52 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.48-2.02-4.5-4.5-4.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.4"/>
          </svg>
          Ver en Google Maps
        </a>
      </div>

    </div>
  </div>
</section>

<style>
  .ubicacion-section {
    background: #201F1F;
    padding: clamp(64px, 10vw, 100px) 24px;
    border-top: 1px solid rgba(224,159,60,0.1);
  }

  .ubicacion-container {
    max-width: 1100px;
    margin: 0 auto;
  }

  /* ── Grid 2 cols ── */
  .ubicacion-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 48px;
    align-items: center;
  }

  @media (min-width: 768px) {
    .ubicacion-grid {
      grid-template-columns: 1fr 1fr;
      gap: 64px;
    }
  }

  /* ── Foto ── */
  .ubicacion-foto-wrap {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    background: #2a2929;
    aspect-ratio: 4/3;
  }

  .ubicacion-foto {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 16px;
  }

  .foto-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(237, 50, 58, 0.06) 0%,
      transparent 50%
    );
    pointer-events: none;
    border-radius: 16px;
  }

  /* ── Info ── */
  .ubicacion-info {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .ubicacion-info .section-label {
    color: #E09F3C;
    margin-bottom: 14px;
    display: block;
  }

  .ubicacion-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(36px, 6vw, 64px);
    color: #fff;
    line-height: 1;
    margin-bottom: 36px;
  }

  .ubicacion-title-accent {
    color: #ED323A;
  }

  /* ── Details list ── */
  .ubicacion-details {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 36px;
  }

  .detail-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .detail-icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    margin-top: 2px;
  }

  .detail-main {
    display: block;
    font-family: 'Sora', sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 4px;
  }

  .detail-sub {
    display: block;
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 400;
    color: #B2B3B3;
    line-height: 1.5;
  }

  /* ── Maps button ── */
  .maps-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: transparent;
    border: 1.5px solid #ED323A;
    border-radius: 8px;
    color: #ED323A;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
    align-self: flex-start;
  }

  .maps-btn:hover {
    background: rgba(237, 50, 58, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(237, 50, 58, 0.2);
  }
</style>
```

**Step 2: Crear placeholder de foto del local**

Copiar cualquier imagen JPG como placeholder temporal (o crear un archivo vacío que luego se reemplaza con la foto real):
```bash
# Si tienes ImageMagick instalado:
convert -size 640x480 xc:#2a2929 efectivoya-landing/public/local.jpg 2>/dev/null || \
  # Alternativa: copiar logo como placeholder
  cp efectivoya-landing/public/logo.png /tmp/placeholder.jpg 2>/dev/null || \
  echo "Colocar la foto del local en efectivoya-landing/public/local.jpg manualmente"
```
> **NOTA para el usuario:** Cuando tengas la foto real del local, cópiala a `efectivoya-landing/public/local.jpg`. También actualiza `LOCAL.direccion`, `LOCAL.distrito` y `LOCAL.mapsUrl` con los datos reales.

**Step 3: Commit**

```bash
git add src/components/Ubicacion.astro
git commit -m "feat: seccion ubicacion del local"
```

---

## Task 9: Integrar nuevos componentes en index.astro

**Archivos:**
- Modificar: `efectivoya-landing/src/pages/index.astro`

**Step 1: Agregar los imports**

Localizar el bloque de imports al inicio:
```astro
import Banks from '../components/Banks.astro';
import WhyUs from '../components/WhyUs.astro';
import FAQ from '../components/FAQ.astro';
import CTAFinal from '../components/CTAFinal.astro';
```

Reemplazar por:
```astro
import Banks from '../components/Banks.astro';
import VideosTutoriales from '../components/VideosTutoriales.astro';
import WhyUs from '../components/WhyUs.astro';
import FAQ from '../components/FAQ.astro';
import Ubicacion from '../components/Ubicacion.astro';
import CTAFinal from '../components/CTAFinal.astro';
```

**Step 2: Insertar los componentes en el orden correcto**

Localizar en el `<main>`:
```astro
<Banks />
<WhyUs />
<FAQ />
<CTAFinal />
```

Reemplazar por:
```astro
<Banks />
<VideosTutoriales />
<WhyUs />
<FAQ />
<Ubicacion />
<CTAFinal />
```

**Step 3: Verificar el orden completo en el navegador**

```bash
npm run dev
```

Scroll completo por la página. El orden debe ser:
1. Hero (con badge ⚡ y dinero flotante)
2. Stats (con 4 métricas incluyendo < 60s)
3. Cómo funciona
4. Servicios
5. Bancos
6. **Videos Tutoriales** (tabs BCP/Interbank/Scotia/BBVA)
7. Por qué EfectivoYa
8. FAQ
9. **Ubicación del local** (foto + dirección)
10. CTA Final (con dinero flotante)
11. Footer (logo bicolor)

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: integrar VideosTutoriales y Ubicacion en index"
```

---

## Task 10: Build final y verificación

**Step 1: Ejecutar build de producción**

```bash
cd efectivoya-landing && npm run build
```

Esperado: `dist/` generado sin errores TypeScript ni Astro.

**Step 2: Preview del build**

```bash
npm run preview
```

Abrir `http://localhost:4321` y verificar:
- [ ] Navbar muestra "Efectivo**Ya**" con "Ya" en rojo
- [ ] Hero tiene badge ⚡ pulsante y elementos flotantes S/.
- [ ] Stats tiene 4 métricas, la última "< 60s"
- [ ] Sección Videos tiene tabs y iframe de YouTube funcional
- [ ] Sección Ubicación tiene layout foto + info
- [ ] CTAFinal tiene dinero flotante y título actualizado
- [ ] Footer muestra "Efectivo**Ya**" bicolor

**Step 3: Commit final**

```bash
git add -A
git commit -m "feat: landing redesign - bicolor, velocidad, dinero flotante, videos, ubicacion"
```

---

## Notas post-implementación

### Videos de YouTube
Cuando tengas los videos grabados y subidos a YouTube, editar `VideosTutoriales.astro` y reemplazar los 4 valores de `youtubeId`:
```js
{ id: 'bcp', youtubeId: 'ID_REAL_BCP', ... }
```

### Foto del local
Colocar la foto real en `efectivoya-landing/public/local.jpg` (640×480px mínimo, relación 4:3 para que se vea bien en el contenedor).

### Dirección y horario real
Editar las constantes al inicio de `Ubicacion.astro`:
```js
const LOCAL = {
  direccion: 'Av. Real, 123',
  distrito: 'Miraflores',
  mapsUrl: 'https://maps.google.com/?q=...',
  ...
};
```

### Tamaño de video para la app (recordatorio)
- **Landscape 16:9 a 1280×720**: funciona perfecto con el `VideoView` actual (`height: 200`).
- **Portrait 9:16 a 1080×1920**: requiere cambiar en `recargas.tsx` el estilo del `VideoView` a `height: 260, aspectRatio: undefined` y ajustar el contenedor.
