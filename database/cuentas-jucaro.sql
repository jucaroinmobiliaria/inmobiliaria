-- Jucaro · cuentas de demostración en el dominio jucaro.co
-- Úsalo sobre una base que ya tenga database/schema.sql.
-- Si cargaste seed.sql, este script renombra los correos @nido.co a @jucaro.co
-- (usuarios, consultas y visitas) y crea las cuentas que falten.
--
-- Contraseñas (solo demostración, no las uses en producción):
--   admin@jucaro.co                         Admin1234!
--   propietario@jucaro.co                   Demo1234!
--   agente@jucaro.co                        Demo1234!
--   usuario@jucaro.co                       Demo1234!
--   andres.cardenas@jucaro.co               Demo1234!
--   mariafernanda.londono@jucaro.co         Demo1234!
--   santiago.valencia@jucaro.co             Demo1234!
--   valentina.pombo@jucaro.co               Demo1234!
--   carlosmario.echeverri@jucaro.co         Demo1234!
--   daniela.ospina@jucaro.co                Demo1234!

BEGIN;

-- Correos ya cargados con el dominio anterior.
UPDATE "User" AS u
SET
  email = replace(u.email, '@nido.co', '@jucaro.co'),
  name = CASE WHEN u.name = 'Admin Nido' THEN 'Admin Jucaro' ELSE u.name END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE u.email LIKE '%@nido.co'
  AND NOT EXISTS (
    SELECT 1 FROM "User" AS other
    WHERE other.email = replace(u.email, '@nido.co', '@jucaro.co')
  );

UPDATE "Inquiry"
SET email = replace(email, '@nido.co', '@jucaro.co')
WHERE email LIKE '%@nido.co';

UPDATE "Visit"
SET email = replace(email, '@nido.co', '@jucaro.co')
WHERE email LIKE '%@nido.co';

-- Cuentas de ingreso. El hash de admin es Admin1234!; el resto es Demo1234!.
INSERT INTO "User" (id, email, "passwordHash", name, phone, role, status, verified, "updatedAt")
VALUES
  ('usr_admin', 'admin@jucaro.co', '$2b$10$dazCDAphtRHYRp5vXqCGJOeqNUD56vpv9FvGPUZvV1Tb3M7PTUkAy', 'Admin Jucaro', '+57 601 5550100', 'ADMIN', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('usr_prop', 'propietario@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'Camila Restrepo', '+57 300 612 4455', 'OWNER', 'ACTIVE', false, CURRENT_TIMESTAMP),
  ('usr_ag', 'agente@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'Julián Ortega', '+57 310 247 9086', 'AGENT', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('usr_usr', 'usuario@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'Laura Gómez', '+57 315 880 2231', 'USER', 'ACTIVE', false, CURRENT_TIMESTAMP),
  ('usr_and', 'andres.cardenas@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'Andrés Felipe Cárdenas', '+57 312 455 7810', 'OWNER', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('usr_mar', 'mariafernanda.londono@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'María Fernanda Londoño', '+57 320 118 9345', 'AGENT', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('usr_san', 'santiago.valencia@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'Santiago Valencia Ruiz', '+57 316 903 4477', 'AGENT', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('usr_val', 'valentina.pombo@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'Valentina Pombo', '+57 301 774 2290', 'OWNER', 'ACTIVE', false, CURRENT_TIMESTAMP),
  ('usr_car', 'carlosmario.echeverri@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'Carlos Mario Echeverri', '+57 318 621 5504', 'AGENT', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('usr_dan', 'daniela.ospina@jucaro.co', '$2b$10$j40QUSf012soV0msXH6Y4.tUYHq6aqxjCEcygu7NWP1GZAMHWuHcy', 'Daniela Ospina', '+57 304 330 1872', 'OWNER', 'ACTIVE', false, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  status = 'ACTIVE',
  "updatedAt" = CURRENT_TIMESTAMP;

COMMIT;
