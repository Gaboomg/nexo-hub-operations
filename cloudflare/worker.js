const responseHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const HUB_ORIGINS = new Set(["https://gaboomg.github.io"]);

function response(body, status) {
  return new Response(body, {
    status,
    headers: {
      ...responseHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function jsonResponse(body, status, origin) {
  const headers = {
    ...responseHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (HUB_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Max-Age"] = "600";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function searchPlaces(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!HUB_ORIGINS.has(origin)) return jsonResponse({ error: "ORIGIN_NOT_ALLOWED" }, 403, origin);
  if (request.method === "OPTIONS") return jsonResponse({}, 200, origin);
  if (request.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, origin);
  if (!env.GOOGLE_PLACES_API_KEY) return jsonResponse({ error: "PLACES_NOT_CONFIGURED" }, 503, origin);

  const authorization = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return jsonResponse({ error: "AUTH_REQUIRED" }, 401, origin);
  const headers = {
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
    Authorization: authorization,
  };

  let userResponse;
  try {
    userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers });
  } catch {
    return jsonResponse({ error: "AUTH_UNAVAILABLE" }, 503, origin);
  }
  if (!userResponse.ok) return jsonResponse({ error: "AUTH_REQUIRED" }, 401, origin);
  const user = await userResponse.json();
  if (!user?.id) return jsonResponse({ error: "AUTH_REQUIRED" }, 401, origin);

  let profileResponse;
  try {
    const profileUrl = new URL(`${env.SUPABASE_URL}/rest/v1/team_members`);
    profileUrl.search = new URLSearchParams({
      select: "user_id",
      user_id: `eq.${user.id}`,
      limit: "1",
    });
    profileResponse = await fetch(profileUrl, { headers });
  } catch {
    return jsonResponse({ error: "AUTH_UNAVAILABLE" }, 503, origin);
  }
  if (!profileResponse.ok) return jsonResponse({ error: "TEAM_ACCESS_REQUIRED" }, 403, origin);
  const profiles = await profileResponse.json();
  if (!profiles?.[0]?.user_id) return jsonResponse({ error: "TEAM_ACCESS_REQUIRED" }, 403, origin);

  let input;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "INVALID_REQUEST" }, 400, origin);
  }
  const address = String(input?.address || "").trim().slice(0, 240);
  const businessName = String(input?.businessName || "").trim().slice(0, 100);
  if (address.length < 6) return jsonResponse({ error: "ADDRESS_REQUIRED" }, 400, origin);

  let placesResponse;
  try {
    placesResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: [businessName, address].filter(Boolean).join(", "),
        pageSize: 5,
        languageCode: "es",
        regionCode: "MX",
      }),
    });
  } catch {
    return jsonResponse({ error: "PLACES_UNAVAILABLE" }, 502, origin);
  }
  if (!placesResponse.ok) {
    console.error("Google Places search failed", placesResponse.status);
    return jsonResponse({ error: "PLACES_SEARCH_FAILED" }, 502, origin);
  }

  const result = await placesResponse.json();
  const places = Array.isArray(result?.places)
    ? result.places.slice(0, 5).map((place) => ({
        id: String(place.id || "").slice(0, 200),
        name: String(place.displayName?.text || "Negocio").slice(0, 160),
        address: String(place.formattedAddress || "").slice(0, 240),
        mapsUrl: String(place.googleMapsUri || "").slice(0, 500),
      })).filter((place) => place.id)
    : [];
  return jsonResponse({ places }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/place-search") return searchPlaces(request, env);
    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { ...responseHeaders, Allow: "GET" },
      });
    }

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
          Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_slug: slug }),
      });
    } catch {
      return response("Redirect service unavailable", 503);
    }

    if (!lookup.ok) {
      const detail = await lookup.text();
      console.error("Supabase RPC failed", lookup.status, detail.slice(0, 300));
      return response("Redirect service unavailable", 503);
    }

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
