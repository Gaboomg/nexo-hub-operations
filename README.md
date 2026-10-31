# nexo-hub-operations
Centro de operaciones web de NEXO

El módulo **Administración / Analíticas** muestra las aperturas acumuladas por enlace. La página `redirect.html` llama a un RPC de Supabase antes de redirigir; aplica `backend-setup/record-link-scan.sql` en el SQL Editor de Supabase para activar el conteo. Programa en cada chip la URL generada por **QR & Links**, no el destino final. El conteo representa aperturas, no teléfonos únicos, y la página de métricas sigue disponible para todas las cuentas autenticadas. Para usar `nexo.link` en lugar del enlace de GitHub Pages, sigue [`cloudflare/README.md`](cloudflare/README.md) cuando la zona DNS esté activa.
