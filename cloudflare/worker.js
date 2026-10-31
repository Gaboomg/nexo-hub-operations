const responseHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function response(body, status) {
  return new Response(body, {
    status,
    headers: {
      ...responseHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { ...responseHeaders, Allow: "GET" },
      });
    }

    const url = new URL(request.url);
    let slug;
    try {
      slug = decodeURIComponent(url.pathname.slice(1));
    } catch {
      return response("Link not found", 404);
    }
    if (!/^[a-z0-9-]{2,64}$/.test(slug)) return response("Link not found", 404);

    let lookup;
    try {
      lookup = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/record_link_scan`, {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_slug: slug }),
      });
    } catch {
      return response("Redirect service unavailable", 503);
    }

    if (!lookup.ok) return response("Redirect service unavailable", 503);

    let rows;
    try {
      rows = await lookup.json();
    } catch {
      return response("Redirect service unavailable", 503);
    }

    const destination = rows?.[0]?.destination_url;
    let target;
    try {
      target = new URL(destination);
    } catch {
      return response("Link not found", 404);
    }

    if (target.protocol !== "https:" || target.username || target.password) {
      return response("Link not found", 404);
    }

    return new Response(null, {
      status: 302,
      headers: { ...responseHeaders, Location: target.href },
    });
  },
};
