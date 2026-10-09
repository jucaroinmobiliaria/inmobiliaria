# Jucaro — inmobiliaria virtual para Colombia

Plataforma para **comprar, arrendar y publicar inmuebles**: portal público con búsqueda y mapa, ficha con galería inmersiva, asistente de publicación de 10 pasos con un cargador de fotos avanzado, panel del anunciante (estadísticas, mensajes, visitas) y consola de administración. **Cada aviso lo aprueba un administrador** antes de salir al público (`AUTO_APPROVE=false`).

Marca: manglar `#0A6B50`, latón `#D4A44A`, teja `#C4522A`, papel `#FFFAF4`. Isotipo en `apps/web/src/components/layout/logo.tsx`.

| Capa | Tecnología |
|---|---|
| Web | Next.js 16 (App Router, React 19, Turbopack) · TypeScript · Tailwind CSS 4 · MapLibre GL · Motion |
| API | NestJS 12 · Prisma 7 (adaptador `pg`) · Zod · JWT + refresh tokens rotativos |
| Datos | PostgreSQL 16 (Supabase, Neon, RDS… o el del `docker-compose`) |
| Imágenes | Subida directa del navegador al almacenamiento con URL firmada (S3 / Cloudflare R2 / Supabase Storage). Nunca se guardan en Postgres |
| Despliegue | Vercel (2 proyectos: `apps/web` y `apps/api`) · alternativa Docker para la API |

```
apps/
  web/   Next.js (UI, SEO, proxy /backend → API)
  api/   NestJS + Prisma (REST), seed y prueba de humo
database/
  schema.sql        Esquema completo (26 tablas) — para Supabase/Neon/psql
  catalog.sql       Solo catálogos (tipos, comodidades, ciudades, barrios) — para producción
  seed.sql          Datos de ejemplo (64 inmuebles, 10 usuarios, catálogos) — para demo
  create-admin.sql  Crea TU administrador en producción
docs/   API.md (contrato REST) · DESIGN.md · storage-cors.json
```

---

## 1. Probarlo en tu computador

Requisitos: Node 22.12+ y Docker (o un PostgreSQL 16 propio).

```bash
# 1) Base de datos con esquema y datos de ejemplo (puerto 5432)
docker compose up -d db

# 2) API  → http://localhost:4000
cd apps/api
cp .env.example .env          # ajusta DATABASE_URL=postgresql://nido:nido@localhost:5432/nido
npm install
npm run dev

# 3) Web  → http://localhost:3000   (en otra terminal)
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Sin Docker: crea una base vacía y ejecuta `psql "$DATABASE_URL" -f database/schema.sql -f database/seed.sql`
(o `npx prisma migrate deploy` y `npm run db:seed` dentro de `apps/api`).

Las fotos de ejemplo son enlaces de Unsplash: verifica que sigan activos con `node scripts/check-images.mjs`.

**Cuentas de demostración** (solo con `seed.sql`): `admin@nido.co` / `Admin1234!` · `propietario@nido.co`, `agente@nido.co`, `usuario@nido.co` / `Demo1234!`.

Subida de fotos en local: con `STORAGE_DRIVER=local` (por defecto) las imágenes se guardan en `apps/api/uploads`. Para probar el modo S3 real: `docker compose --profile storage up -d` y configura `S3_*` apuntando a MinIO (`S3_ENDPOINT=http://localhost:9000`, bucket `nido-media`, usuario `nido`, clave `nidonido123`, `S3_FORCE_PATH_STYLE=true`).

---

## 2. Desplegar en producción (BD + Vercel)

Orden recomendado: **base de datos → almacenamiento → API → web**.

### Paso 1 · Base de datos (Supabase o Neon)
1. Crea el proyecto (región cercana: *South America — São Paulo*).
2. Abre el **SQL Editor** y ejecuta, en este orden: `database/schema.sql` y después **una** de estas opciones:
   - Demostración: `database/seed.sql` (trae inmuebles y usuarios de ejemplo).
   - Producción real: ejecuta `database/catalog.sql` (solo tipos, comodidades, ciudades y barrios) y luego `database/create-admin.sql` para crear tu administrador. No cargues `seed.sql`.
3. Copia la cadena de conexión **con pooler** (Supabase: *Transaction pooler*, puerto 6543) → será `DATABASE_URL`. Debe terminar en `?sslmode=require`.

> Si cargaste `seed.sql` en un entorno público, **cambia o elimina** las cuentas `@nido.co` (todas tienen contraseñas conocidas).

### Paso 2 · Almacenamiento de fotos (Cloudflare R2, recomendado, o Supabase Storage)
1. Crea un bucket (p. ej. `nido-media`) y habilita acceso público de lectura (dominio `r2.dev` o dominio propio).
2. Crea una llave de API con permisos de lectura/escritura sobre el bucket.
3. Configura **CORS** del bucket con `docs/storage-cors.json` (cambia `TU-DOMINIO.com`). Es obligatorio: el navegador sube las fotos directamente al bucket con `PUT`.
4. Anota: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`.

### Paso 3 · API en Vercel
1. *Add New → Project* → importa el repositorio → **Root Directory: `apps/api`**. Framework: NestJS (autodetectado). Node 22.x.
2. Variables de entorno (ver `apps/api/.env.example`): `DATABASE_URL`, `DB_POOL_MAX=2`, `JWT_SECRET` (≥ 32 caracteres aleatorios), `WEB_ORIGIN=https://tu-web.vercel.app`, `STORAGE_DRIVER=s3` + las `S3_*`, `CRON_SECRET`, y opcionalmente `RESEND_API_KEY` + `MAIL_FROM`, `AUTO_APPROVE`, `AI_API_KEY` + `AI_MODEL`.
3. Deploy. Comprueba `https://tu-api.vercel.app/health` → `{"ok":true,"db":true}`.
4. `apps/api/vercel.json` programa un *cron* diario (12:00 UTC) para las alertas de búsquedas guardadas; Vercel lo autentica con `CRON_SECRET`.

### Paso 4 · Web en Vercel
1. Otro proyecto con el mismo repositorio → **Root Directory: `apps/web`** (Next.js).
2. Variables: `API_URL=https://tu-api.vercel.app`, `NEXT_PUBLIC_SITE_URL=https://tu-dominio.com` (y opcional `NEXT_PUBLIC_SITE_NAME`).
3. Deploy. **Despliega la API primero:** la portada se genera al compilar y necesita alcanzar la API (si no, mostrará un aviso hasta el siguiente refresco de 60 s).
4. Vuelve al proyecto de la API y ajusta `WEB_ORIGIN` / `WEB_PUBLIC_URL` con el dominio final.

El navegador solo habla con el dominio de la web: Next reenvía `/backend/*` a la API, así las cookies de sesión (`httpOnly`, `Secure`, `SameSite=Lax`) son del mismo origen.

### Alternativa: la API en Render (contenedor)

La web sigue en Vercel. La API corre como servicio web de Render con `apps/api/Dockerfile`. `PORT` lo pone Render.

1. Sube el repositorio a GitHub (sección 7).
2. En [render.com](https://render.com) → **New → Blueprint** o **New → Web Service**. Si usas el blueprint, el archivo es `apps/api/render.yaml` y el *Root Directory* debe ser `apps/api`. Si lo creas a mano: *Language* Docker, *Dockerfile path* `Dockerfile`, *Root Directory* `apps/api`, región la más cercana (Oregon o Virginia; São Paulo no siempre está en el plan gratuito).
3. Plan: *Starter* (el gratuito se duerme y la primera petición tarda). Health check: `/health`.
4. Variables (las mismas que en Vercel, ver `apps/api/.env.example`):
   - `DATABASE_URL` con `sslmode=require`
   - `DB_POOL_MAX=5` (en un contenedor puedes subir un poco; en serverless se queda en 2)
   - `JWT_SECRET` (≥ 32 caracteres)
   - `WEB_ORIGIN=https://tu-web.vercel.app` (y el dominio final, separados por coma si hay varios)
   - `WEB_PUBLIC_URL=https://tu-dominio.com`
   - `TRUST_PROXY=1`
   - `STORAGE_DRIVER=s3` y todas las `S3_*`
   - `AUTO_APPROVE=false`
   - `SITE_NAME=Jucaro`
   - `CRON_SECRET`
   - `NODE_ENV=production`
5. Deploy. Abre `https://jucaro-api.onrender.com/health` y espera `{"ok":true,"db":true}`.
6. En el proyecto de Vercel de la web, `API_URL` debe ser esa URL de Render (sin barra final). Vuelve a desplegar la web.
7. El cron de alertas no lo dispara Render solo. Crea un *Cron Job* en Render (o cron-job.org) que cada día haga `GET https://TU-API.onrender.com/cron/saved-searches` con el header `Authorization: Bearer TU_CRON_SECRET`.

`docker build -t jucaro-api apps/api` sirve para probar la misma imagen en local. Fly.io, Railway y Cloud Run usan ese Dockerfile con las mismas variables.

### Lista de verificación posterior
- [ ] `/health` responde y la web carga inmuebles.
- [ ] Inicia sesión, crea un borrador, sube fotos y envíalo a revisión; apruébalo desde `/admin/moderacion`.
- [ ] Cambia las contraseñas de demostración o elimina esas cuentas.
- [ ] Confirma CORS del bucket (si la subida de fotos falla en el navegador, casi siempre es esto).
- [ ] Configura Resend (o similar) para que lleguen los correos de contacto y recuperación de contraseña.
- [ ] Revisa `/legal/terminos` y `/legal/privacidad` (son plantillas; deben ser revisadas por un abogado).

---

## 3. Variables de entorno

Todas están comentadas en [`apps/api/.env.example`](apps/api/.env.example) y [`apps/web/.env.example`](apps/web/.env.example). Las imprescindibles en producción: `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `STORAGE_DRIVER=s3` + `S3_*`, `CRON_SECRET` (API) y `API_URL`, `NEXT_PUBLIC_SITE_URL` (web).

## 4. Qué incluye

- **Público:** portada con héroe fotográfico y búsqueda; resultados con filtros, orden, mapa con precios sincronizado y URLs compartibles; páginas SEO (`/venta/apartamento/medellin/el-poblado`); ficha con mosaico, visor a pantalla completa, mapa de zona aproximada, historial de precio, contacto, agenda de visita y WhatsApp; favoritos y búsquedas guardadas; `sitemap.xml`, `robots.txt`, Open Graph y Schema.org.
- **Publicar:** asistente de 10 pasos con autoguardado y vista previa en vivo; descripción asistida (plantilla; LLM opcional); **cargador de fotos**: arrastrar y soltar, selección múltiple, progreso por foto, reordenar, foto principal, rotar/recortar, etiquetas por estancia, detección de duplicados (SHA-256), compresión en el navegador (máx. 2400 px), corrección EXIF, sugerencias.
- **Panel:** resumen con KPIs y gráfica de 30 días, publicaciones (pausar, duplicar, renovar, cerrar), mensajes con hilo, visitas, búsquedas guardadas, cuenta.
- **Admin:** resumen, cola de moderación con atajos de teclado, publicaciones, usuarios (roles, bloqueo, verificación), reportes, catálogos, auditoría.
- **Seguridad:** JWT + refresh con rotación y detección de reutilización, bcrypt, roles, límites de peticiones, sanitización, validación Zod, helmet, CORS, validación de archivos, eliminación de EXIF/GPS, ubicación aproximada opcional.

## 5. Estado de verificación (sé claro con lo que se probó)

Probado en un entorno de desarrollo con PostgreSQL 16 real:
- `npm run smoke` (apps/api): **449 de 451 comprobaciones**; las 2 restantes miden el límite de peticiones y solo fallan si el servidor se arranca con `RATE_LIMIT_FACTOR` alto. Cubre registro, sesión, publicar con subida real de imágenes, moderación, búsqueda, favoritos, consultas, visitas, panel, admin y permisos.
- `schema.sql` + `seed.sql` cargados en una base vacía y usados por el API (mismos conteos que la base de origen).
- `next build` y `nest build` sin errores; recorridos con navegador automatizado a 1440 px y 390 px (inicio, resultados, ficha, wizard completo con 6+ fotos, panel y admin).

**No se pudo probar aquí** (hazlo tras desplegar): el driver S3/R2 contra un bucket real, envío de correos con Resend, las fotos de Unsplash y los mosaicos del mapa (el entorno de pruebas los bloquea), el despliegue real en Vercel, la decodificación de fotos HEIC y la cámara en iOS/Android.

## 6. Siguientes pasos sugeridos
Pasarela de pagos para destacados, verificación de identidad de anunciantes, notificaciones push, procesamiento de imágenes en un worker, PostGIS para búsquedas por polígono, y reemplazar el rate-limit en memoria por Redis/Upstash si escalas a varias instancias.

---

## 7. Subir el proyecto a GitHub

La carpeta ya trae `.gitignore`, integración continua y plantillas; solo falta inicializar Git y conectarlo con GitHub.

```bash
# 1) Crea un repositorio VACÍO en github.com (sin README, sin .gitignore, sin licencia)
# 2) Desde la carpeta del proyecto (omite estas tres líneas si ya existe la carpeta .git):
git init -b main
git add .
git commit -m "Versión inicial de Nido"

# 3) Conéctalo y súbelo:
git remote add origin https://github.com/TU-USUARIO/nido.git
git push -u origin main
```

Antes del primer `git add .` revisa con `git status` que no aparezcan `.env`, `node_modules` ni `uploads` (el `.gitignore` ya los excluye).

Qué se activa solo al subirlo:

- **CI** (`.github/workflows/ci.yml`): en cada *push* y *pull request* compila la API y la web, corre el *smoke test* completo contra un PostgreSQL real y comprueba que `database/schema.sql` coincide con `prisma/schema.prisma`. No necesita secretos.
- **Dependabot**: PR semanales con actualizaciones de dependencias.
- **Plantillas** de issues y pull requests, `CONTRIBUTING.md` y `SECURITY.md`.

Después de subirlo:

- **Nunca subas** archivos `.env` ni claves (ya están en `.gitignore`; solo se versionan los `.env.example`).
- Si cambias `apps/api/prisma/schema.prisma`, ejecuta `npm run db:sql` en la raíz para regenerar `database/schema.sql` y la migración; el CI falla si no lo haces.
- En Vercel, importa este repositorio dos veces (Root Directory `apps/api` y `apps/web`) como se explica en la sección 2.
- **Licencia:** el proyecto se publica sin licencia de uso (todos los derechos reservados; `"license": "UNLICENSED"`). Si lo haces público y quieres permitir su reutilización, agrega un archivo `LICENSE` (por ejemplo MIT) y actualiza `package.json`.
- Si guardas la carpeta en OneDrive, excluye `node_modules` y `.next` de la sincronización (o mueve el proyecto fuera de OneDrive): son miles de archivos y pueden corromper `.git`.
