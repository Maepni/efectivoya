## PROYECTO

Carpeta: efectivoya-landing/
Framework: Astro 5
CSS: Tailwind CSS + CSS variables para tokens de marca
Fuentes: Bebas Neue + Sora (Google Fonts)
Deploy target: Vercel (output: static)
App URL: https://tu-app.com (el botón CTA principal apunta aquí)

---

## IDENTIDAD DE MARCA

Logo: "Efectivo" en blanco + "Ya" en rojo. Ícono: símbolo $ con arco dorado y gris.
Slogan: "Tu Dinero Al Instante"
Tono: Premium, confiable, directo. Fintech peruana.

---

## PALETA DE COLORES (definir en tailwind.config.mjs)

colors: {
  'ey-charcoal':     '#201F1F',   // fondo principal
  'ey-charcoal-alt': '#1A1919',   // secciones alternas oscuras
  'ey-gold':         '#E09F3C',   // highlights, badges, números, íconos
  'ey-red':          '#ED323A',   // botones CTA, énfasis "Ya"
  'ey-white':        '#FFFFFF',   // texto en fondos oscuros
  'ey-gray-mid':     '#B2B3B3',   // texto secundario, bordes
  'ey-gray-light':   '#E5E5E5',   // secciones claras
  'ey-brown':        '#68443C',   // sombras cálidas, gradientes
}

---

## TIPOGRAFÍA

Display/títulos: Bebas Neue
Body/UI: Sora (pesos 300, 400, 500, 600, 700)

Jerarquía:
- Hero title: Bebas Neue, ~90px, blanco con acento dorado o rojo
- Section titles: Bebas Neue, 48–60px
- Step numbers decorativos: Bebas Neue, 120px, ey-charcoal opacity-10 (fondo) + ey-gold (visible)
- Body: Sora 400, 16px
- Labels/badges: Sora 600, 11px, uppercase, tracking-widest

---

## ESTRUCTURA DE ARCHIVOS

efectivoya-landing/
├── src/
│   ├── components/
│   │   ├── Navbar.astro
│   │   ├── Hero.astro
│   │   ├── Stats.astro
│   │   ├── HowItWorks.astro
│   │   ├── Services.astro
│   │   ├── Banks.astro
│   │   ├── WhyUs.astro
│   │   ├── FAQ.astro
│   │   ├── CTAFinal.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── pages/
│       └── index.astro
├── public/
│   └── logo.png
├── tailwind.config.mjs
└── astro.config.mjs

---

## SECCIONES — ESPECIFICACIONES

### Navbar (sticky)
- Fondo: ey-charcoal con backdrop-filter blur(12px)
- Al hacer scroll: border-bottom 1px solid rgba(224,159,60,0.2)
- Logo izquierda | Links centro (¿Qué es?, Cómo funciona, Bancos, FAQ) | Botón CTA derecha
- Botón: bg-ey-red, texto blanco, hover sube brillo, box-shadow rojo
- Mobile: hamburger menu con overlay

### Hero
- Fondo: ey-charcoal con grid lines sutiles doradas (CSS background-image)
- Glow radial difuso dorado centrado detrás del título (pseudo-elemento)
- Badge: "Billetera Digital · Perú" — fondo gold/10, borde gold/30, texto ey-gold, punto pulsante animado
- Título: Bebas Neue enorme — "EFECTIVO" blanco + "YA" ey-red
- Subtítulo: Sora 300, ey-gray-mid, max-width 500px
- 2 CTAs: botón primario rojo "Acceder a la App →" + botón ghost "Cómo funciona"
- Animación: fade-up escalonado (badge → título → subtítulo → botones) con animation-delay

### Stats Strip
- Fondo: ey-charcoal-alt
- 3 columnas con divisores border ey-gold/15
- Números: Bebas Neue 56px, ey-gold. Usar IntersectionObserver para contador animado al entrar en viewport
- Datos: "3,000+ Usuarios activos" | "4 Bancos compatibles" | "S/. 0 Comisión en retiros"

### Cómo funciona
- Fondo: ey-gray-light, texto ey-charcoal (sección clara)
- 3 pasos en grid horizontal con línea conectora dashed ey-gray-mid entre ellos
- Número decorativo: Bebas Neue 120px, ey-charcoal opacity-8, absolute detrás
- Número visible: Bebas Neue 32px, ey-gold
- Pasos: "Regístrate gratis" | "Recarga tu billetera" | "Retira cuando quieras"
- Cada paso: ícono SVG, título Sora 700, descripción Sora 400

### Servicios
- Fondo: ey-charcoal
- Layout 2 columnas: texto explicativo izquierda + grid 2x2 de tarjetas derecha
- Tarjetas: bg white/3, border ey-gold/12, border-radius 12px, padding generoso
- Hover: border ey-gold/35, translateY(-4px), transition suave
- Ícono: ey-gold, 28px
- Servicios: Recargas con boucher | Retiros sin comisión | Comprobantes PDF | Soporte por chat

### Bancos compatibles
- Fondo: ey-charcoal-alt
- Título centrado + subtítulo "Transferencias 100% verificadas"
- 4 tarjetas blancas con logos: BCP | Interbank | Scotiabank | BBVA
- Sombra cálida: rgba(104,68,60,0.3)
- Hover: leve scale(1.03)

### ¿Por qué elegirnos?
- Fondo: ey-gray-light, texto ey-charcoal (sección clara)
- Grid 3 columnas, 6 puntos con íconos SVG y ey-gold
- Puntos: Seguridad total | Aprobación rápida | Sin comisión en retiros | Soporte humano | Comprobantes al instante | Disponible 24/7

### FAQ (acordeón)
- Fondo: ey-charcoal
- Items con border-bottom ey-gray-mid/20
- Flecha rotatoria animada en ey-gold al abrir
- Al abrir: fondo item cambia a ey-gold/4, texto aparece con animación suave
- Implementar con JS vanilla (no dependencias)
- 5 preguntas: ¿Es seguro? | ¿Cuánto demora aprobar una recarga? | ¿Hay comisiones? | ¿Qué bancos aceptan? | ¿Cómo contacto soporte?

### CTA Final
- Fondo: gradiente diagonal ey-charcoal → ey-brown sutil
- Título Bebas Neue grande centrado, blanco
- Botón grande ey-red, padding 16px 40px
- Texto confianza debajo: "Sin costo de registro · Retiros sin comisión · Soporte humano"

### Footer
- Fondo: #161515 (más oscuro que ey-charcoal)
- 3 columnas: logo + descripción breve | Links de navegación | Contacto + redes
- Divisor: border-top ey-gold/15
- Copyright con año dinámico via JS

---

## COMPONENTE BOTÓN CTA

Crear componente reutilizable ButtonCTA.astro:

Props: href (string), text (string), target="_blank"

Estilos: bg-ey-red, texto blanco, Sora 600, border-radius 6px
Hover: bg más claro, translateY(-2px), box-shadow rgba(237,50,58,0.5)
Incluir flecha SVG inline a la derecha

---

## ANIMACIONES

- Hero: fade-up escalonado con CSS animation-delay
- Stats: contador numérico con IntersectionObserver (JS vanilla)
- Navbar: transición border al hacer scroll (JS vanilla, scroll listener)
- Tarjetas servicios y bancos: hover con CSS transition
- FAQ: acordeón con JS vanilla, sin librerías
- Scroll suave: html { scroll-behavior: smooth }

NO usar librerías de animación externas. Todo CSS + JS vanilla.

---

## RESPONSIVE

- Mobile first
- Navbar: hamburger en <768px, overlay menu
- Hero: título escala con clamp(), CTAs en columna en mobile
- Stats: 1 columna en mobile, 3 en desktop
- Cómo funciona: 1 columna en mobile (pasos verticales), 3 en desktop
- Servicios: 1 columna mobile, 2 columnas desktop para grid tarjetas, layout 2col solo en lg
- Bancos: 2x2 en mobile, 4 en fila en desktop
- Por qué elegirnos: 1 columna mobile, 2 en sm, 3 en lg
- FAQ: full width siempre
- Footer: 1 columna mobile, 3 en desktop

---

## SETUP INICIAL

1. Crear proyecto: npm create astro@latest efectivoya-landing -- --template minimal --typescript strict --no-install
2. Instalar dependencias: npm install && npx astro add tailwind
3. Configurar tailwind.config.mjs con la paleta completa
4. Configurar Google Fonts en BaseLayout.astro (preconnect + stylesheet)
5. Verificar que astro.config.mjs tenga output: 'static'

Construye todo el proyecto completo, sección por sección, verificando que compile sin errores después de cada componente.