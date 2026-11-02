# nexo-hub-operations
Centro de operaciones web de NEXO

El módulo **Administración / Analíticas** muestra las aperturas acumuladas por enlace. La página `redirect.html` llama a un RPC de Supabase antes de redirigir; aplica `backend-setup/record-link-scan.sql` en el SQL Editor de Supabase para activar el conteo. Programa en cada chip la URL generada por **QR & Links**, no el destino final. El conteo representa aperturas, no teléfonos únicos, y la página de métricas sigue disponible para todas las cuentas autenticadas. Para usar `nexo.link` en lugar del enlace de GitHub Pages, sigue [`cloudflare/README.md`](cloudflare/README.md) cuando la zona DNS esté activa.

En **Reseñas NFC / Place ID**, ingresa la dirección del local, busca coincidencias en Google Places y selecciona la ficha correcta. El panel muestra el Place ID, genera su enlace de reseñas y lo prepara en el asistente NDEF para grabarlo en un chip. La búsqueda necesita el secreto `GOOGLE_PLACES_API_KEY` configurado en Cloudflare; consulta [`cloudflare/README.md`](cloudflare/README.md). El Hub no guarda las direcciones ni publica reseñas.
