# Guía de diseño y frontend — Jucaro

Producto: inmobiliaria virtual para Colombia (comprar, arrendar, publicar). Idioma: **español de Colombia, tuteo** ("tú"), textos cortos y cálidos. Marca **Jucaro** (`SITE.name`).

Identidad: el júcaro es un árbol de costa cuyo dosel parece un techo y cuyas raíces se quedan. Paleta — manglar `#145C4C`, tinta `#1A1814`, latón `#C9A15A`, teja `#C4522A`, papel `#FFFDFB`. El isotipo vive en `components/layout/logo.tsx` y en `public/brand/`.

## Meta de diseño
"Que atrape al cliente en 3 segundos": **fotografía enorme, tipografía editorial, movimiento sutil, fondo blanco limpio**. Debe sentirse como un producto de 5 estrellas (Airbnb/Compass/Zillow-premium), pero simple de usar. Nada de "dashboard genérico".

Reglas visuales
- Lienzo **papel marfil** (`canvas`). Superficies `bg-surface`. Manglar `brand-600/700` como acento; `sun` (latón) para destacar; `clay` (teja) para sellos cálidos; bandas `bg-brand-900` para momentos de impacto.
- Titulares con `.display-xl/.display-lg/.display-md` (Instrument Serif); cuerpo Geist. Precios en serif (`font-display`) grandes. Eyebrows con `.eyebrow`.
- Radios generosos (`rounded-[20px]`/`[28px]`, botones pill). Sombras `--shadow-card/lift/pop`. Bordes `border-line`.
- Foto primero: tarjetas con carrusel, galerías en mosaico, héroes a sangre con escrim `scrim-hero`. Todo `<Photo>` (nunca `<img>` suelto) para tener esqueleto de carga + escena de respaldo.
- Movimiento (con `motion/react` y keyframes del tema): `Reveal` al hacer scroll, Ken Burns lento en héroes (`animate-kenburns`), hover-lift en tarjetas, corazón con rebote, números que cuentan, transiciones de paso en el wizard, skeletons (`.skeleton`). Respeta `prefers-reduced-motion` (ya global). Nada que bloquee la interacción.
- Contraste AA mínimo (texto `ink-2/ink-3` sobre blanco ya cumple). Foco visible siempre. Áreas táctiles ≥ 44 px. Etiquetas `aria-*` en iconos/botones. Teclado en galería/lightbox/uploader.
- **Mobile-first real**: probar a 390 px. Barra inferior ya existe (`TabBar`). Filtros en hoja inferior (`Dialog sheet`), mapa a pantalla completa con botón flotante "Mapa/Lista", CTA de contacto fija abajo en la ficha.
- Estados siempre diseñados: cargando (skeleton), vacío (`EmptyState` con acción), error (mensaje + reintentar), éxito (toast).

## Qué ya existe (NO reescribir; importar)
`src/lib`: `cn`, `site` (SITE, labels, STATUS_LABEL, OPERATION_*), `format` (formatPrice, formatPriceShort, plural, timeAgo, formatDate, slugify, initials, whatsappLink), `api` (cliente navegador `api()`, `fetcher`, `qs`, `ApiException`), `server` (`apiServer`, `apiServerOrNull`, `getUser`, `requireUser`), `session` (`SessionProvider`, `useSession`), `favorites` (`useFavorites`), `toast` (`toast.success/error/info`), `images` (HERO_IMAGES, CATEGORY_IMAGES, CITY_IMAGES), `types` (**contrato**).
`src/components/ui`: `Button` (variants primary|dark|sun|outline|soft|ghost|danger|white; sizes sm|md|lg|icon|icon-sm; `href` => Link; `loading`), `Input/Textarea/Select/Field/Switch/Checkbox/Stepper`, `Badge`, `Chip`, `Avatar`, `Skeleton`, `EmptyState`, `Reveal`, `Dialog` (`sheet` en móvil), `Tabs`, `Toaster`, `Photo`/`PhotoFallback`, `Icon`+iconos lucide reexportados (importar desde `@/components/ui/icon`; si falta uno, añádelo allí con import de lucide-react).
`src/components/layout`: `Header` (oculta en `/publicar/*` y `/admin*`), `Footer`, `TabBar`, `Logo`.
`src/components/property`: `PropertyCard` (+`PropertyCardSkeleton`), `FavoriteButton`.
`src/proxy.ts`: guarda rutas privadas y renueva el token. `next.config.ts`: `/backend/*` -> API.
Puedes AÑADIR cosas a esos archivos compartidos con cambios mínimos y aditivos (p. ej. un icono nuevo); avisa en tu reporte. No cambies firmas existentes.

## Next.js 16 — recordatorios
`params`/`searchParams` son **Promesas** (`const { id } = await params`). `cookies()` es async. Server Components por defecto; `"use client"` solo donde haya estado. Datos públicos con `apiServer` (ISR, `revalidate`); datos privados con `apiServer(..., { auth: true })` o SWR en cliente con `api()`. Metadatos con `generateMetadata`. No hay `middleware.ts` (es `proxy.ts`). Imágenes: `images.unoptimized` (usa `<Photo>`). Mapas: `maplibre-gl` (import dinámico, solo cliente; estilo `process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/positron"`; si el estilo no carga, el contenedor debe seguir siendo usable con un fondo `bg-surface`).

## Rutas
**Público** — `/` · `/[operation]/[[...segments]]` (operation = venta|arriendo; con 0 segmentos = resultados; si el último segmento termina en `-<digitos>` = ficha; si no = landing SEO tipo/ciudad/barrio con filtros y texto) · `/ingresar` `/registro` `/recuperar` `/restablecer` · `/favoritos` (favoritos + búsquedas guardadas) · `/ayuda` `/legal/terminos` `/legal/privacidad` · `sitemap.ts` `robots.ts` `not-found.tsx` `error.tsx` · componentes en `components/home`, `components/search`, `components/detail`, `components/auth`.
**Privado** — `/publicar` (landing + crear borrador) · `/publicar/[id]` (wizard 10 pasos) · `/publicar/[id]/exito` · `/panel/*` (resumen, publicaciones, mensajes, visitas, búsquedas guardadas, cuenta) · `/admin/*` (resumen, moderación, publicaciones, usuarios, reportes, catálogos, auditoría) · componentes en `components/wizard`, `components/uploader`, `components/panel`, `components/admin`.
Reglas de enlace: la ficha pública se abre con `item.path`; "Editar" lleva a `/publicar/{id}`; "Mensajes" a `/panel/mensajes?id=…`.

## Datos de demostración (los crea `npm run db:seed` en apps/api)
Contraseña de todos: `Demo1234!` — `admin@nido.co` (ADMIN, contraseña `Admin1234!`), `propietario@nido.co` (OWNER), `agente@nido.co` (AGENT verificado), `usuario@nido.co` (USER). API en `http://localhost:4000`, web en `http://localhost:3000`.
