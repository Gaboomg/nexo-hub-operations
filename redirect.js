(() => {
  const SUPABASE_URL = "https://gpzqlcehqrokapezasff.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_jB435qQ0J0TUOr0pWGWHtg_mjkqbnDA";
  const title = document.getElementById("redirect-title");
  const message = document.getElementById("redirect-message");
  const slug = new URLSearchParams(window.location.search).get("slug") || "";

  function fail() {
    title.textContent = "Enlace no disponible";
    message.textContent = "No pudimos abrir este enlace. Revisa tu conexión o contacta a NEXO.";
  }

  async function openLink() {
    if (!/^[a-z0-9-]{2,64}$/.test(slug)) return fail();
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_link_scan`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_slug: slug }),
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) return fail();
      const rows = await response.json();
      const destination = rows?.[0]?.destination_url;
      const target = new URL(destination);
      if (target.protocol !== "https:" || target.username || target.password) return fail();
      window.location.replace(target.href);
    } catch {
      fail();
    }
  }

  openLink();
})();
