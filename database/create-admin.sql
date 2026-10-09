-- Crea tu propio administrador en producción (sin cargar los datos de demostración).
-- 1) Genera el hash de tu contraseña (en apps/api, tras `npm install`):
--      node -e "console.log(require('bcryptjs').hashSync('TU_CLAVE_SEGURA', 12))"
-- 2) Pega el hash abajo, cambia el correo y ejecuta este script en tu base de datos.
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "status", "verified", "updatedAt")
VALUES ('usr_admin_main', 'tu-correo@dominio.com', 'PEGA_AQUI_EL_HASH_BCRYPT', 'Administrador', 'ADMIN', 'ACTIVE', true, CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO UPDATE SET "role" = 'ADMIN', "passwordHash" = EXCLUDED."passwordHash";
