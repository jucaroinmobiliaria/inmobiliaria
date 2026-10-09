# Cómo contribuir

1. Crea una rama desde `main`: `git switch -c feat/lo-que-haces`.
2. Levanta el entorno local siguiendo el [README](README.md) (Postgres con `docker compose up -d db`, API y web).
3. Antes de abrir el Pull Request:
   ```bash
   cd apps/api && npx tsc --noEmit && npm run smoke   # con la API en marcha y la BD de ejemplo
   cd apps/web && npx tsc --noEmit && npm run build
   ```
4. Si cambias el esquema de datos (`apps/api/prisma/schema.prisma`): `npm run db:sql` en la raíz regenera `database/schema.sql` y la migración; súbelos en el mismo PR.
5. Commits en español o inglés, en imperativo y con prefijo (`feat:`, `fix:`, `docs:`, `chore:`).

Convenciones: TypeScript estricto, textos de interfaz en español de Colombia (tuteo), accesibilidad (foco visible, etiquetas) y diseño responsive probado a 390 px.
