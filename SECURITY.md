# Seguridad

Si encuentras una vulnerabilidad, **no abras un issue público**: avisa de forma privada al responsable del repositorio
(GitHub → pestaña *Security* → *Report a vulnerability*, o por correo).

Recordatorios para quien despliegue este proyecto:
- Nunca subas archivos `.env`; usa las variables de entorno de Vercel/Docker. Solo `*.env.example` se versiona.
- Cambia o elimina las cuentas de demostración (`@nido.co`) antes de publicar. Ver `database/create-admin.sql`.
- Usa un `JWT_SECRET` aleatorio de al menos 32 caracteres.
