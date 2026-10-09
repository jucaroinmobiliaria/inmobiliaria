# Contrato REST de Nido

Formas JSON: `apps/web/src/lib/types.ts` (fuente de verdad). Base: `http://localhost:4000` (en el navegador se accede por el proxy de Next: `/backend/*`).

## Convenciones
- Sesión: cookies httpOnly `access_token` (JWT 30 min) y `refresh_token` (opaco, 30 días, rotativo; se guarda su SHA-256). `Path=/`, `SameSite=Lax`, `Secure` en producción. También se acepta `Authorization: Bearer <access>`.
- Registro/login/refresh devuelven `{ user: SessionUser }` y fijan las cookies.
- Errores: `{ statusCode, message, errors? }`. Validación = 400 con `errors: { campo: [msgs] }`. Mensajes en español.
- `price` y montos: number (COP enteros). BigInt se serializa a number.
- Paginación: `page` (1..), `pageSize` (≤ 60, por defecto 12). Respuesta `Paginated<T>`.
- Rate limit global 120 req/min/IP; auth: 10/min; formularios públicos (consultas, visitas, reportes): 6/min.
- Roles: `@Public()` sin sesión · `@Auth()` cualquier sesión · `@Roles('OWNER','AGENT','ADMIN')` · `@Roles('ADMIN')`.
- Si hay sesión en rutas públicas, `isFavorite` se calcula; sin sesión es `false`.
- Visibilidad: en rutas públicas solo `PUBLISHED`. El dueño (y ADMIN) ve cualquier estado de lo suyo.
- `path` SEO: `/{venta|arriendo}/{tipo}/{ciudad}/{barrio|-}/{slug}-{code}` ⇒ si no hay barrio se omite el segmento (`/venta/casa/medellin/casa-4-habitaciones-87`).
- Ubicación aproximada: si `hideAddress`, `address = null`, `approximateLocation = true`, y lat/lng se desplazan de forma determinista (≈150 m) a partir del id.

## Auth
| Método | Ruta | Acceso | Cuerpo / notas |
|---|---|---|---|
| POST | /auth/register | público | `{ name, email, password(≥8), phone?, role?: 'USER'\|'OWNER'\|'AGENT' }` |
| POST | /auth/login | público | `{ email, password }` |
| POST | /auth/refresh | cookie refresh | rota el refresh token, nuevas cookies, `{ user }` |
| POST | /auth/logout | público | revoca refresh, borra cookies, `{ ok: true }` |
| GET | /auth/me | @Auth | `{ user: SessionUser }` |
| PATCH | /auth/me | @Auth | `{ name?, phone?, avatarUrl?, displayName?, bio?, whatsapp?, company?, website?, city? }` → `{ user }` |
| POST | /auth/change-password | @Auth | `{ current, next }` |
| POST | /auth/forgot | público | `{ email }` siempre `{ ok: true }`; genera token y lo envía por Mailer (consola o Resend) |
| POST | /auth/reset | público | `{ token, password }` |

## Catálogo y búsqueda (público)
| GET | /catalog | → `Catalog` (cache 5 min) |
| GET | /catalog/suggest?q= | → `SuggestItem[]` (ciudades, barrios, tipos, código numérico → publicación) |
| GET | /home | → `HomeData` |
| GET | /publications | query `SearchQuery` → `SearchResult` |
| GET | /publications/map | mismos filtros + `bbox`; → `{ items: PublicationCard[] }` hasta 150 (sin paginar, solo con lat/lng) |
| GET | /publications/by-code/:code | → `PublicationDetail` (para resolver la URL SEO; el front valida/canoniza el slug) |
| GET | /publications/:id | → `PublicationDetail` (id cuid o code numérico). Si no es PUBLISHED: 404 salvo dueño/ADMIN |
| GET | /landing?operation=&type=&city=&neighborhood= | → `LandingData` |
| GET | /seo/sitemap | → `SitemapEntry[]` (todas las PUBLISHED) |
| POST | /publications/:id/view | cuenta visita (dedupe por IP+día en memoria), `{ ok: true }` |
| POST | /publications/:id/inquiries | `{ name, email, phone?, message }` → `{ id }`; crea Inquiry + primer mensaje + Notification al dueño + correo |
| POST | /publications/:id/visits | `{ name, email, phone?, scheduledAt, note? }` → `{ id }` |
| POST | /publications/:id/report | `{ reason, details? }` → `{ ok: true }` |

## Favoritos y búsquedas guardadas (@Auth)
| GET | /favorites | → `PublicationCard[]` |
| GET | /favorites/ids | → `{ ids: string[] }` (ids de publicaciones favoritas; ligero, para pintar corazones) |
| PUT | /favorites/:publicationId | → `{ isFavorite: true }` (+ stat diaria) |
| DELETE | /favorites/:publicationId | → `{ isFavorite: false }` |
| GET | /saved-searches | → `SavedSearchDTO[]` (newCount = publicaciones nuevas desde lastNotifiedAt o creación) |
| POST | /saved-searches | `{ name, query: SearchQuery, frequency }` |
| DELETE | /saved-searches/:id | |
| POST | /cron/saved-searches | header `x-cron-secret` = CRON_SECRET → envía alertas pendientes, `{ sent }` |
| GET | /notifications | → `NotificationDTO[]` (últimas 30) · POST /notifications/read-all |

## Publicar (cualquier @Auth: un USER pasa a OWNER automáticamente al crear su primer borrador)
| POST | /publications | `{ operation, typeId? , cityId? }` crea borrador (Property+Location+Publication DRAFT) → `DraftDTO` |
| GET | /me/publications?status= | → `MyPublicationRow[]` |
| GET | /me/publications/:id | → `DraftDTO` |
| PATCH | /publications/:id | `DraftInput` parcial (auto-guardado). Actualiza Property/Location/Publication/features. Registra `PriceHistory` si cambia el precio de una publicada. Slug se regenera con título. → `DraftDTO` |
| POST | /publications/:id/submit | valida completitud (tipo, ciudad, precio>0, título ≥10, descripción ≥40, ≥ 3 fotos READY, portada). Si falta algo: 400 con `errors`. Estado → `PENDING_REVIEW` (o `PUBLISHED` si `AUTO_APPROVE=true` o el usuario está verificado) → `DraftDTO` |
| POST | /publications/:id/pause · /resume · /mark-closed | PAUSED / vuelve a PUBLISHED / SOLD o RENTED según operación |
| POST | /publications/:id/duplicate | copia como DRAFT sin fotos → `DraftDTO` |
| POST | /publications/:id/renew | amplía expiresAt +60 días |
| DELETE | /publications/:id | borra si DRAFT/REJECTED; si no, pasa a EXPIRED |
| POST | /ai/description | `AiDescriptionRequest` → `AiDescriptionResponse` (plantilla; LLM opcional si `AI_API_KEY` y `AI_MODEL`) |

### Imágenes
| POST | /publications/:id/images/presign | `{ files: PresignRequestFile[] }` (≤ 30; mime jpeg/png/webp/avif; ≤ 12 MB; máx. 40 imágenes por aviso) → `PresignedUpload[]`; crea `PropertyImage` PENDING con key `properties/{propertyId}/{cuid}.{ext}`; si ya existe checksum igual READY → `duplicate:true` |
| POST | /publications/:id/images/confirm | `{ images: ConfirmImageItem[] }` → verifica objeto (HEAD S3 / fs), marca READY, asigna posición al final; la primera imagen READY es portada → `ImageDTO[]` |
| PATCH | /publications/:id/images/reorder | `{ order: string[], coverId?: string }` → `ImageDTO[]` |
| PATCH | /publications/:id/images/:imageId | `{ roomLabel?, caption?, isCover? }` → `ImageDTO` |
| POST | /publications/:id/images/:imageId/replace | `{ mime, size, checksum, width?, height? }` → `PresignedUpload` (nueva key; tras subir se llama /confirm con ese imageId; la key vieja se elimina) |
| DELETE | /publications/:id/images/:imageId | borra objeto + fila; si era portada, promueve la siguiente |
| PUT | /uploads/local/:key(*) | solo driver `local`: recibe el binario (`?exp&sig` HMAC) y lo guarda en `UPLOAD_DIR`; GET `/files/*` los sirve estáticos |

Driver de almacenamiento: `STORAGE_DRIVER=local|s3`. `s3` sirve para AWS S3, Cloudflare R2 y Supabase Storage (S3-compatible): `S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL`. `publicUrl` = `${S3_PUBLIC_URL}/${key}` o `${API_PUBLIC_URL}/files/${key}` en local.

## Mensajería y visitas (@Auth; el dueño/agente de la publicación o el remitente)
| GET | /inquiries?scope=received\|sent&status= | → `InquiryRow[]` |
| GET | /inquiries/:id | → `InquiryThread` (marca leído si es el dueño) |
| POST | /inquiries/:id/messages | `{ body }` → `InquiryMessageDTO`; estado REPLIED si responde el dueño; notifica a la otra parte |
| PATCH | /inquiries/:id | `{ status }` |
| GET | /visits?scope=received\|sent | → `VisitRow[]` |
| PATCH | /visits/:id | `{ status }` (dueño: CONFIRMED/DONE/CANCELLED; solicitante: CANCELLED) |

## Panel
| GET | /dashboard/summary | @Auth → `DashboardSummary` |

## Admin (@Roles ADMIN)
| GET | /admin/overview | → `AdminOverview` |
| GET | /admin/publications?status=&q=&page= | → `Paginated<AdminPublicationRow>` |
| POST | /admin/publications/:id/approve | → PUBLISHED, publishedAt, expiresAt +90d, notifica |
| POST | /admin/publications/:id/reject | `{ reason }` → REJECTED + moderationNote, notifica |
| PATCH | /admin/publications/:id/feature | `{ featured, days? }` |
| GET | /admin/users?q=&role=&page= | → `Paginated<AdminUserRow>` |
| PATCH | /admin/users/:id | `{ role?, status?, verified? }` (no puede degradarse a sí mismo) |
| GET | /admin/reports?status= | → `AdminReportRow[]` · PATCH /admin/reports/:id `{ status }` |
| GET | /admin/audit?page= | → `Paginated<AuditRow>` |
| POST/PATCH/DELETE | /admin/catalog/:kind(/:id) | kind = types\|amenities\|cities\|neighborhoods; cuerpo = campos del modelo (slug autogenerado) |

Toda acción de moderación y de admin escribe `AuditLog`.

## Notas de implementación (aditivas; no cambian las formas de types.ts)
- `POST /notifications/:id/read` → `{ ok: true }` marca una sola notificación. `POST /cron/saved-searches` también acepta GET y responde `{ sent, expired }` (`expired` = avisos vencidos que pasaron a EXPIRED).
- `images/confirm` y `images/reorder` devuelven TODAS las imágenes del aviso (también las `PENDING`): una foto subida que no vuelve como `READY` no se pudo verificar. `DELETE images/:imageId` es idempotente y responde `{ ok: true }`; un aviso PUBLISHED no puede quedar con menos de 3 fotos READY (409).
- Driver local: `uploadUrl` = `/uploads/local/{key}?exp&size&mime&sig` (el front lo prefija con `/backend`); el PUT exige el `Content-Type` firmado y que los bytes sean de ese tipo. Se eliminan GPS/EXIF/XMP de JPEG/PNG/WebP al guardar (se conserva la orientación); en `s3` se hace al confirmar.
- `bbox` filtra por la coordenada MOSTRADA (la desplazada si `hideAddress`), y `q` no busca en direcciones ocultas, para que no se pueda deducir la ubicación exacta.
- `status` en `/me/publications` y `/admin/publications` acepta lista separada por comas.
- `landing.related[].path` usa `-` como segmento de tipo cuando no hay tipo (`/venta/-/medellin`).
- Rate limit multiplicado por `RATE_LIMIT_FACTOR` (por defecto 25 en desarrollo, 1 en producción). Un refresh token ya rotado se acepta durante `REFRESH_REUSE_GRACE_SECONDS` (5 s; varias páginas precargadas con la misma cookie no cierran la sesión) y emite un par nuevo; pasada la gracia, reutilizarlo revoca todas las sesiones del usuario. Un token revocado por logout/cambio de clave/bloqueo nunca se acepta. Las respuestas llevan `Cache-Control: no-store` salvo `/catalog`, `/home` y `/seo/sitemap`.
- Con `trust proxy` (`TRUST_PROXY`, 1 por defecto) la IP del límite de peticiones sale de `X-Forwarded-For`: en producción el API debe quedar detrás de un proxy que lo fije.

## Seguridad
helmet, CORS con `WEB_ORIGIN` y credenciales, rate limiting (`@nestjs/throttler`), sanitización de texto (se eliminan etiquetas HTML y caracteres de control en todo string entrante), validación zod, bcrypt (cost 12), refresh rotation con detección de reutilización, validación de tipo/tamaño/checksum de archivos, cabeceras de caché, no se registran contraseñas.
