# Redirección y lecturas de NFC

El Hub ya guarda el total de lecturas en `public.links.scans`. La ruta de GitHub Pages `redirect.html` funciona sin dominio propio. Cuando la zona `nexo.link` esté activa, el Worker registra una lectura por cada solicitud `GET` a `nexo.link/<alias>` y redirige a su destino HTTPS. El Worker responde solo a solicitudes `GET`.

## Activación

1. En Supabase → **SQL Editor**, ejecuta una vez `../backend-setup/record-link-scan.sql`.
2. Confirma que la zona `nexo.link` esté activa en Cloudflare y que los nameservers del dominio ya apunten a Cloudflare.
3. En **Workers & Pages → nexo-link-redirect → Edit code**, publica `worker.js`; añade las variables de texto `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` desde Settings → Variables and Secrets usando los valores definidos en `wrangler.toml`.
4. En Workers & Pages → nexo-link-redirect → Domains & Routes, añade la ruta `nexo.link/*` asociada a la zona `nexo.link`. La zona tiene que estar activa en Cloudflare.
5. Cuando el Worker y la ruta estén activos, el Hub puede usar `https://nexo.link/<alias>` como destino del QR. Sin la zona activa, continúa utilizando la URL de GitHub Pages generada por **QR & Links**.
6. Para ver el total, entra a **Administración / Analíticas** y actualiza la página. El recuento está junto a cada enlace y el total aparece en **Lecturas totales**.

El conteo es agregado. No identifica teléfonos o personas; algunas aplicaciones pueden abrir enlaces automáticamente para generar una vista previa.
