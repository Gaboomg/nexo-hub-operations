# Redirección y lecturas NFC

El Hub cuenta las solicitudes de redirección en `public.links.scans`. El Worker consulta la función RPC `record_link_scan`, aumenta el total solo para enlaces activos y redirige al destino HTTPS guardado. El conteo es agregado; no identifica teléfonos ni personas. Algunas aplicaciones pueden abrir enlaces automáticamente para generar una vista previa.

## Producción

El Worker `nexo-link-redirect` y la ruta `nexo.link/*` ya están creados en Cloudflare. La función RPC ya está habilitada en Supabase y las variables de producción ya están guardadas en el Worker. La zona del dominio seguirá pendiente hasta que Namecheap use los nameservers asignados por Cloudflare; después de eso se propagará el DNS.

## Desarrollo y despliegue

1. Ejecuta una vez `../backend-setup/record-link-scan.sql` en Supabase.
2. En Cloudflare, establece `SUPABASE_URL` como variable de entorno. Guarda `SUPABASE_PUBLISHABLE_KEY` como secreto; no lo añadas al repositorio ni al archivo TOML.
3. Para activar el generador Google Reviews, habilita Places API (New) en Google Cloud con facturación y crea una clave restringida a Places API. Guárdala en el Worker como secreto `GOOGLE_PLACES_API_KEY`; nunca la agregues al código del navegador, al repositorio ni al TOML. La búsqueda exige una cuenta autenticada que tenga perfil autorizado en `team_members` y retorna solo ID, nombre, dirección y URL de Maps.
4. Para el desarrollo con Wrangler, configura los secretos con `npx wrangler secret put SUPABASE_PUBLISHABLE_KEY` y `npx wrangler secret put GOOGLE_PLACES_API_KEY`, y publícalo con `npx wrangler deploy`.
5. Activa `nexo.link` en Cloudflare cuando el dominio esté delegado a sus nameservers. La zona contiene los registros DNS importados de Namecheap, incluidos MX y SPF para conservar el reenvío de correo.
6. Confirma que la ruta `nexo.link/*` esté enlazada al Worker y que una prueba de enlace activo redirija al destino esperado. El generador Place ID usa `https://nexo-link-redirect.gabrieljuarezesme.workers.dev/api/place-search`.
7. El Hub puede generar enlaces QR `https://nexo.link/<alias>` cuando el dominio esté activo. Hasta entonces, conserva la URL de respaldo de GitHub Pages.
8. Consulta los totales en **Administración → Analíticas**, junto a cada enlace y en **Lecturas totales**.

El Worker valida los alias y solo redirige a destinos HTTPS. El endpoint `POST /api/place-search` aplica CORS limitado al Hub y valida la sesión de Supabase y el rol propietario antes de consultar Google Places. Los enlaces inactivos o inexistentes responden con página no encontrada. Google Maps Platform factura según los SKU y el volumen de solicitudes; revisa sus cargos antes de habilitar Places API.
