(() => {
  const LOGO = "./orca-logo.svg";
  document.querySelector("#brand-logo").src = LOGO;
  document.querySelector("#quote-logo").src = LOGO;
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const SUPABASE_URL = "https://gpzqlcehqrokapezasff.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_jB435qQ0J0TUOr0pWGWHtg_mjkqbnDA";
  const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.sessionStorage,
        },
      })
    : null;
  let state = { links: [], quotes: [], plates: 0 },
    editing = null,
    currentQuote = null;
  function save() {
    renderAll();
  }
  function toast(m) {
    const t = $("#toast");
    t.textContent = m;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2300);
  }
  function hideBootLoader() {
    $("#boot-loader")?.classList.add("is-hidden");
  }
  function esc(s = "") {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function safeTaskImage(value) {
    if (typeof value !== "string") return "";
    if (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length <= 650000)
      return value;
    try {
      const url = new URL(value);
      return url.origin === SUPABASE_URL &&
        url.pathname.startsWith("/storage/v1/object/sign/nexo-private/")
        ? value
        : "";
    } catch {
      return "";
    }
  }
  function money(n) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(n);
  }
  function slugify(s) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }
  function urlFor(slug) {
    const alias = encodeURIComponent(slug || "tu-alias");
    return `https://nexo.link/${alias}`;
  }
  function go(tab) {
    if (["taller", "ventas"].includes(tab) && activeSession?.role !== "owner") {
      toast("Taller y Ventas son secciones privadas del propietario.");
      tab = "links";
    }
    $$(".tab-pane").forEach((x) =>
      x.classList.toggle("active", x.id === "tab-" + tab),
    );
    $$(".nav-btn").forEach((x) =>
      x.classList.toggle("active", x.dataset.tab === tab),
    );
    let h = {
      taller: [
        "Taller / Producción",
        "Herramientas rápidas para preparar, grabar y comprobar cada placa.",
      ],
      ventas: [
        "Ventas / Campo",
        "Cotiza, explica el valor y estima escenarios junto al negocio.",
      ],
      links: [
        "QR & Links / Gestión",
        "Crea aliases, actualiza destinos y prepara códigos.",
      ],
      metricas: [
        "Administración / Analíticas",
        "Gestiona destinos, estilos y actividad de los enlaces de tus clientes.",
      ],
      webadmin: [
        "Admin del sitio / NEXO Oficial",
        "Abre el panel privado oficial de NEXO en una sección separada.",
      ],
      tareas: [
        "Equipo / Pendientes",
        "Organiza el trabajo de producción, ventas y enlaces.",
      ],
      reportes: [
        "Reportes / Semana",
        "Revisa el progreso del equipo y la carga de trabajo semanal.",
      ],
    }[tab];
    $("#page-heading").innerHTML = h[0].replace(
      " / ",
      ' <span class="text-[#747680]">/</span> ',
    );
    $("#page-description").textContent = h[1];
    if (tab === "links") renderQR();
    if (tab === "metricas") renderMetrics();
    if (tab === "tareas") renderTasks();
    if (tab === "reportes") renderTeamReport();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function applyRoleAccess(role) {
    const isOwner = role === "owner";
    ["taller", "ventas"].forEach((tab) => {
      const navButton = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
      const pane = $("#tab-" + tab);
      navButton?.classList.toggle("hidden", !isOwner);
      navButton?.setAttribute("aria-hidden", String(!isOwner));
      if (!isOwner) navButton?.setAttribute("tabindex", "-1");
      else navButton?.removeAttribute("tabindex");
      pane?.classList.toggle("hidden", !isOwner);
    });
    go(isOwner ? "taller" : "links");
  }
  $$(".nav-btn").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.dataset.tab === "webadmin") {
          showCredentialReminder();
          return;
        }
        go(b.dataset.tab);
      }),
  );
  function showCredentialReminder() {
    $("#credential-reminder").classList.remove("hidden");
    $("#credential-reminder").classList.add("flex");
    lucide.createIcons();
  }
  function closeCredentialReminder() {
    $("#credential-reminder").classList.add("hidden");
    $("#credential-reminder").classList.remove("flex");
  }
  $("#cancel-admin-reminder").onclick = closeCredentialReminder;
  $("#continue-admin").onclick = () => {
    closeCredentialReminder();
    go("webadmin");
  };
  $("#credential-reminder").addEventListener("click", (e) => {
    if (e.target.id === "credential-reminder") closeCredentialReminder();
  });
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !$("#credential-reminder").classList.contains("hidden")
    )
      closeCredentialReminder();
  });
  function calcResin() {
    let total = parseFloat($("#resin-total").value) || 0,
      r = parseFloat($("#resin-ratio").value) || 1;
    $("#resin-a").textContent = ((total * r) / (r + 1)).toFixed(1);
    $("#resin-b").textContent = (total / (r + 1)).toFixed(1);
    let l = parseFloat($("#dim-l").value) || 0,
      w = parseFloat($("#dim-w").value) || 0,
      t = parseFloat($("#dim-t").value) || 0;
    $("#dim-result").textContent =
      l && w && t ? ((l * w * t) / 10).toFixed(2) + " cm³" : "— cm³";
  }
  ["resin-total", "resin-ratio", "dim-l", "dim-w", "dim-t"].forEach((id) =>
    $("#" + id).addEventListener("input", calcResin),
  );
  $("#ndef-kind").onchange = () => {
    let k = $("#ndef-kind").value,
      p = {
        review: "https://g.page/r/tu-enlace-de-resenas",
        whatsapp: "https://wa.me/521XXXXXXXXXX?text=Hola",
        menu: "https://tusitio.com/menu",
        instagram: "https://instagram.com/tu-negocio",
        custom: "",
      };
    $("#ndef-url").value = p[k] || "";
    renderNdef();
  };
  $("#ndef-url").oninput = renderNdef;
  function renderNdef() {
    let v = $("#ndef-url").value.trim();
    $("#ndef-payload").textContent = /^https:\/\//i.test(v)
      ? v
      : "Ingresa una URL válida para generar el payload.";
  }
  $("#copy-ndef").onclick = () =>
    copy($("#ndef-payload").textContent, "Payload NDEF copiado");
  $("#validate-btn").onclick = async () => {
    let u = $("#validate-url").value.trim(),
      o = $("#validate-result");
    if (!/^https:\/\//i.test(u)) {
      toast("Ingresa una URL HTTPS segura");
      return;
    }
    o.classList.remove("hidden");
    o.className =
      "mt-3 rounded-lg border border-[#30323a] bg-[#0c0d10] p-3 text-xs text-[#e5ff00]";
    o.textContent = "Comprobando respuesta…";
    try {
      let c = new AbortController(),
        timer = setTimeout(() => c.abort(), 8000);
      let r = await fetch(u, {
        method: "HEAD",
        mode: "cors",
        redirect: "follow",
        signal: c.signal,
      });
      clearTimeout(timer);
      o.className =
        "mt-3 rounded-lg border border-[#293e35] bg-[#0c1511] p-3 text-xs text-[#a3ffcf]";
      o.textContent = `Respuesta ${r.status} ${r.statusText || ""} · URL final: ${r.url}`;
    } catch (e) {
      o.className =
        "mt-3 rounded-lg border border-[#534019] bg-[#191309] p-3 text-xs text-[#ffd58a]";
      o.innerHTML =
        'El navegador no pudo verificar la respuesta (CORS o timeout). <a class="underline" target="_blank" rel="noreferrer" href="' +
        esc(u) +
        '">Abrir enlace para revisar manualmente ↗</a>';
    }
  };
  function quoteValues() {
    let name = $("#client-name").value.trim() || "Cliente por confirmar",
      phone = $("#client-phone").value.trim(),
      qty = Math.max(1, parseInt($("#quote-qty").value) || 1),
      unit = Math.max(0, parseFloat($("#unit-price").value) || 0),
      setup = $("#setup-service").checked,
      discount = Math.min(
        100,
        Math.max(0, parseFloat($("#discount").value) || 0),
      ),
      sub = qty * unit + (setup ? 199 : 0),
      total = sub * (1 - discount / 100);
    return { name, phone, qty, unit, setup, discount, sub, total };
  }
  function renderQuote(q = quoteValues()) {
    currentQuote = q;
    $("#quote-client-display").textContent = q.name;
    $("#quote-date").textContent =
      new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) + (q.phone ? " · " + q.phone : "");
    $("#quote-line").textContent = `${q.qty} × Placa NFC + QR`;
    $("#quote-subtotal").textContent = money(q.qty * q.unit);
    $("#quote-setup-line").classList.toggle("hidden", !q.setup);
    $("#quote-discount-line").classList.toggle("hidden", !q.discount);
    $("#quote-discount-display").textContent =
      "−" + money((q.sub * q.discount) / 100);
    $("#quote-total").textContent = money(q.total) + " MXN";
  }
  $("#make-quote").onclick = async () => {
    let q = quoteValues();
    renderQuote(q);
    if (!supabaseClient || !activeSession)
      return toast("Inicia sesión para guardar la cotización");
    const { data, error } = await supabaseClient
      .from("quotes")
      .insert({
        client_name: q.name,
        client_phone: q.phone,
        quantity: q.qty,
        unit_price: q.unit,
        setup_service: q.setup,
        discount: q.discount,
        total: q.total,
      })
      .select("id,created_at")
      .single();
    if (error) return toast("No se pudo guardar. Verifica tus permisos.");
    q.date = data.created_at;
    q.id = data.id;
    state.quotes.unshift(q);
    state.quotes = state.quotes.slice(0, 20);
    save();
    $("#quote-status").textContent = "GENERADA";
    toast("Cotización guardada");
  };
  $("#copy-quote").onclick = () => {
    let q = currentQuote || quoteValues();
    let msg = `Hola ${q.name}, te comparto la cotización NEXO:\n• ${q.qty} placa(s) NFC + QR: ${money(q.qty * q.unit)}${q.setup ? "\n• Configuración inicial: " + money(199) : ""}${q.discount ? "\n• Descuento: " + q.discount + "%" : ""}\n• Total: ${money(q.total)} MXN\n\nLa placa permite acceso por QR y NFC. ¡Gracias!`;
    copy(msg, "Resumen copiado para WhatsApp");
  };
  $("#print-quote").onclick = () => window.print();
  function renderRecent() {
    let el = $("#recent-quotes");
    el.innerHTML = state.quotes.length
      ? state.quotes
          .slice(0, 5)
          .map(
            (q) =>
              `<div class="flex justify-between gap-3 rounded-lg border border-[#26272f] bg-[#0c0d10] p-3"><span class="truncate">${esc(q.name)} · ${q.qty} placa(s)</span><span class="mono shrink-0 text-[#e5ff00]">${money(q.total)}</span></div>`,
          )
          .join("")
      : '<div class="text-[#777984]">Aún no has guardado cotizaciones.</div>';
  }
  function renderROI() {
    let n = Math.max(0, parseInt($("#roi-current").value) || 0),
      r = parseInt($("#roi-rate").value) || 0;
    $("#roi-rate-label").textContent = "+" + r + "%";
    $("#roi-before").textContent = n;
    $("#roi-after").textContent = Math.round(n * (1 + r / 100));
  }
  $("#roi-current").oninput = renderROI;
  $("#roi-rate").oninput = renderROI;
  function makeQR(
    el,
    text,
    size = 208,
    color = $("#link-qr-color").value,
    bg = $("#link-bg-color").value,
  ) {
    el.innerHTML = "";
    if (!window.qrcode || !text) return;
    try {
      let q = qrcode(0, "H");
      q.addData(text);
      q.make();
      let box = document.createElement("div");
      box.innerHTML = q.createSvgTag(
        Math.max(3, Math.floor(size / q.getModuleCount())),
        0,
      );
      let svg = box.firstElementChild;
      svg.setAttribute("width", size);
      svg.setAttribute("height", size);
      svg.style.background = bg;
      svg.querySelectorAll("path,rect").forEach((n) => {
        if (n.getAttribute("fill") === "#000000") n.setAttribute("fill", color);
      });
      el.append(svg);
    } catch {}
  }
  function renderQR() {
    let short = urlFor($("#link-slug").value.trim()),
      fg = $("#link-qr-color").value,
      bg = $("#link-bg-color").value,
      frame = $("#link-frame").value;
    $("#link-short").textContent = short;
    $("#qr-caption").textContent = short;
    $("#qr-stage").style.background = bg;
    $("#qr-stage").style.padding = "12px";
    $("#qr-center-logo").src = LOGO;
    $("#qr-center-logo").style.borderColor = bg;
    $("#qr-frame-label").classList.toggle("hidden", frame === "none");
    $("#qr-frame-label").textContent =
      frame === "label" ? "NEXO · LINK ENGINE" : "SCAN ME · NEXO";
    makeQR($("#link-qr"), short, 208, fg, bg);
    $("#link-qr svg")?.style.setProperty("background", bg);
    $("#link-qr-color-label").textContent = fg.toUpperCase();
    $("#link-bg-color-label").textContent = bg.toUpperCase();
  }
  $("#link-client").oninput = () => {
    if (!editing && !$("#link-slug").dataset.custom)
      $("#link-slug").value = slugify($("#link-client").value);
    renderQR();
  };
  $("#link-slug").oninput = () => {
    $("#link-slug").dataset.custom = "1";
    $("#link-slug").value = slugify($("#link-slug").value);
    renderQR();
  };
  $("#link-destination").oninput = renderQR;
  ["link-category", "link-frame", "link-qr-color", "link-bg-color"].forEach(
    (id) => $("#" + id).addEventListener("input", renderQR),
  );
  $("#save-link").onclick = async () => {
    let client = $("#link-client").value.trim(),
      slug = slugify($("#link-slug").value),
      dest = $("#link-destination").value.trim();
    if (!client || !slug || !/^https:\/\//i.test(dest)) {
      toast("Completa cliente, alias y URL válida");
      return;
    }
    if (state.links.some((x) => x.slug === slug && x.id !== editing)) {
      toast("Ese alias ya existe");
      return;
    }
    const payload = {
        slug,
        business_name: client,
        destination_url: dest,
        category: $("#link-category").value,
        frame: $("#link-frame").value,
        qr_color: $("#link-qr-color").value,
        background_color: $("#link-bg-color").value,
      };
    if (!supabaseClient || !activeSession)
      return toast("Inicia sesión para guardar el enlace");
    let result = editing
      ? await supabaseClient
          .from("links")
          .update(payload)
          .eq("id", editing)
          .select("id,scans,created_at,updated_at")
          .single()
      : await supabaseClient
          .from("links")
          .insert(payload)
          .select("id,scans,created_at,updated_at")
          .single();
    if (result.error)
      return toast("No se pudo guardar. Solo un encargado puede gestionar enlaces.");
    let old = state.links.find((x) => x.id === editing),
      rec = {
        id: result.data.id,
        client,
        slug,
        destination: dest,
        category: $("#link-category").value,
        frame: $("#link-frame").value,
        qrColor: $("#link-qr-color").value,
        bgColor: $("#link-bg-color").value,
        scans: result.data.scans ?? old?.scans ?? 0,
        updated: result.data.updated_at || result.data.created_at,
      };
    if (editing) {
      state.links = state.links.map((x) => (x.id === editing ? rec : x));
      editing = null;
    } else {
      state.links.unshift(rec);
      state.plates++;
    }
    save();
    $("#link-slug").dataset.custom = "";
    $("#save-link").innerHTML =
      '<i data-lucide="save" class="h-4 w-4"></i>GUARDAR / ACTUALIZAR';
    lucide.createIcons();
    toast("Enlace guardado en el espacio del equipo");
  };
  $("#clear-link").onclick = () => {
    editing = null;
    $("#link-client").value = "";
    $("#link-slug").value = "";
    $("#link-slug").dataset.custom = "";
    $("#link-destination").value = "";
    $("#link-category").value = "Reseñas";
    $("#link-frame").value = "none";
    $("#link-qr-color").value = "#0a0a0c";
    $("#link-bg-color").value = "#ffffff";
    $("#save-link").innerHTML =
      '<i data-lucide="save" class="h-4 w-4"></i>GUARDAR / ACTUALIZAR';
    renderQR();
    lucide.createIcons();
  };
  function renderMetrics() {
    let scans = state.links.reduce((n, x) => n + (x.scans || 0), 0);
    $("#metric-plates").textContent = String(
      state.plates || state.links.length,
    ).padStart(2, "0");
    $("#metric-clicks").textContent = String(scans).padStart(3, "0");
    $("#metric-clients").textContent = String(state.links.length).padStart(
      2,
      "0",
    );
    $("#metric-quotes").textContent = String(state.quotes.length).padStart(
      2,
      "0",
    );
    let term = ($("#metrics-search").value || "").toLowerCase(),
      list = state.links.filter((x) =>
        (
          x.client +
          " " +
          x.slug +
          " " +
          x.destination +
          " " +
          (x.category || "")
        )
          .toLowerCase()
          .includes(term),
      );
    $("#links-empty").classList.toggle("hidden", list.length > 0);
    $("#link-list").innerHTML = list
      .map(
        (x) =>
          `<div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div class="min-w-0"><div class="font-medium">${esc(x.client)} <span class="ml-2 rounded border border-[#35363e] px-1.5 py-0.5 text-[9px] text-[#a0a0ab]">${esc(x.category || "Otro")}</span></div><div class="mono mt-1 text-[10px] text-[#e5ff00]">${esc(urlFor(x.slug))}</div><div class="mt-1 truncate text-[10px] text-[#888a94]">→ ${esc(x.destination)}</div><div class="mono mt-1 text-[9px] text-[#777984]">${esc(x.frame || "Sin marco")} · ACTUALIZADO ${new Date(x.updated || Date.now()).toLocaleDateString("es-MX")}</div></div><div class="flex shrink-0 items-center gap-2"><span class="mono mr-1 text-[10px] text-[#a3ffcf]">${Number(x.scans) || 0}*</span><button data-link-edit="${esc(x.id)}" class="ghost rounded-lg p-2" title="Editar"><i data-lucide="pencil" class="h-4 w-4"></i></button><button data-link-delete="${esc(x.id)}" class="ghost rounded-lg p-2 text-[#f49898]" title="Eliminar"><i data-lucide="trash-2" class="h-4 w-4"></i></button></div></div>`,
      )
      .join("");
    lucide.createIcons();
  }
  $("#metrics-search").oninput = renderMetrics;
  document.addEventListener("click", async (e) => {
    let ed = e.target.closest("[data-link-edit]"),
      del = e.target.closest("[data-link-delete]");
    if (ed) {
      let x = state.links.find((z) => z.id === ed.dataset.linkEdit);
      if (x) {
        editing = x.id;
        $("#link-client").value = x.client;
        $("#link-slug").value = x.slug;
        $("#link-destination").value = x.destination;
        $("#link-category").value = x.category || "Otro";
        $("#link-frame").value = x.frame || "none";
        $("#link-qr-color").value = x.qrColor || "#0a0a0c";
        $("#link-bg-color").value = x.bgColor || "#ffffff";
        $("#link-slug").dataset.custom = "1";
        renderQR();
        go("links");
        $("#save-link").innerHTML =
          '<i data-lucide="save" class="h-4 w-4"></i>GUARDAR CAMBIOS';
        lucide.createIcons();
      }
    }
    if (del) {
      const { error } = await supabaseClient
        .from("links")
        .delete()
        .eq("id", del.dataset.linkDelete);
      if (error) return toast("No se pudo eliminar. Solo un encargado puede gestionar enlaces.");
      state.links = state.links.filter((x) => x.id !== del.dataset.linkDelete);
      save();
      toast("Enlace eliminado");
    }
  });
  $("#download-qr").onclick = () => {
    let svg = $("#link-qr svg");
    if (!svg) {
      toast("QR no disponible, revisa la conexión");
      return;
    }
    let clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1024");
    clone.setAttribute("height", "1024");
    let img = new Image(),
      url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], {
          type: "image/svg+xml",
        }),
      );
    img.onload = () => {
      let c = document.createElement("canvas");
      c.width = c.height = 1024;
      let ctx = c.getContext("2d"),
        bg = $("#link-bg-color").value;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      let logo = new Image();
      logo.onload = () => {
        ctx.fillStyle = bg;
        ctx.fillRect(453, 453, 118, 118);
        ctx.drawImage(logo, 465, 465, 94, 94);
        c.toBlob((b) => {
          let a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = (slugify($("#link-slug").value) || "nexo-qr") + ".png";
          a.click();
          URL.revokeObjectURL(a.href);
        });
        URL.revokeObjectURL(url);
      };
      logo.onerror = () => {
        c.toBlob((b) => {
          let a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = (slugify($("#link-slug").value) || "nexo-qr") + ".png";
          a.click();
          URL.revokeObjectURL(a.href);
        });
        URL.revokeObjectURL(url);
      };
      logo.src = LOGO;
    };
    img.src = url;
  };
  $("#copy-short").onclick = () =>
    copy($("#link-short").textContent, "Enlace corto copiado");
  async function copy(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch {
      let t = document.createElement("textarea");
      t.value = text;
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
      toast(msg);
    }
  }
  $("#export-data").onclick = () => {
    let a = document.createElement("a"),
      blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      });
    a.href = URL.createObjectURL(blob);
    a.download = "nexo-hub-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup descargado");
  };
  function renderAll() {
    renderRecent();
    renderMetrics();
    renderQR();
  }
  $("#help-btn").onclick = () =>
    toast("NEXO Hub · Datos almacenados solo en este navegador");
  let authData = null,
    selectedAccess = "owner",
    activeSession = null,
    passwordRecoveryFlow = false;
  const SESSION_IDLE_MS = 10 * 60 * 1000,
    SECURITY_LOG_KEY = "nexo-hub-security-log-v1";
  let idleLockTimer = 0,
    lastSessionActivity = 0,
    securityEvents = [];
  function addSecurityEvent(type, detail = "") {
    securityEvents.unshift({
      type,
      detail: String(detail).slice(0, 90),
      at: new Date().toISOString(),
    });
    securityEvents = securityEvents.slice(0, 40);
    if (activeSession && supabaseClient)
      supabaseClient
        .from("security_events")
        .insert({
          event_type: String(type).slice(0, 80),
          details: String(detail).slice(0, 240),
        });
  }
  function renderSecurityEvents() {
    let box = $("#security-event-list");
    if (!box) return;
    box.innerHTML = securityEvents.length
      ? securityEvents
          .slice(0, 15)
          .map(
            (ev) =>
              `<div class="flex items-center justify-between gap-3 rounded-lg border border-[#ffffff0b] bg-[#ffffff03] px-3 py-2"><div class="min-w-0"><div class="truncate text-[10px] font-medium text-[#d9dbe1]">${esc(ev.type)}${ev.detail ? ` <span class="text-[#858792]">· ${esc(ev.detail)}</span>` : ""}</div></div><time class="mono shrink-0 text-[8px] text-[#777984]">${new Intl.DateTimeFormat("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ev.at))}</time></div>`,
          )
          .join("")
      : '<div class="rounded-lg border border-dashed border-[#343640] px-3 py-5 text-center text-[10px] text-[#777984]">Aún no hay eventos de seguridad.</div>';
  }
  function refreshIdleLock() {
    if (!activeSession) return;
    lastSessionActivity = Date.now();
    clearTimeout(idleLockTimer);
    idleLockTimer = setTimeout(
      () => lockSession("inactivity"),
      SESSION_IDLE_MS,
    );
  }
  function lockSession(reason = "manual") {
    if (!activeSession) return;
    addSecurityEvent(
      reason === "inactivity" ? "Bloqueo por inactividad" : "Bloqueo manual",
      activeSession.name,
    );
    selectedAccess = activeSession.index;
    activeSession = null;
    clearTimeout(idleLockTimer);
    $("#login-password").value = "";
    $("#profile-modal").classList.add("hidden");
    $("#profile-modal").classList.remove("flex");
    $("#access-modal").classList.add("hidden");
    $("#access-modal").classList.remove("flex");
    $("#orca-celebration")?.classList.add("hidden");
    $("#orca-celebration")?.classList.remove("show");
    document.body.classList.remove("celebrating");
    $("#app-shell").classList.add("hidden");
    $("#glass-scrollbar")?.classList.add("hidden");
    $("#auth-screen").classList.remove("hidden");
    supabaseClient?.auth.signOut().then(() => startAuth());
    $("#login-error").textContent =
      "Sesión bloqueada por seguridad. Ingresa de nuevo para continuar.";
    $("#login-error").classList.remove("hidden");
    $("#login-password").focus();
  }
  $("#lock-session-btn").onclick = () => lockSession("manual");
  for (const ev of ["pointerdown", "keydown", "touchstart", "wheel"])
    document.addEventListener(ev, () => refreshIdleLock(), {
      passive: true,
    });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && activeSession) {
      if (Date.now() - lastSessionActivity >= SESSION_IDLE_MS)
        lockSession("inactivity");
    } else if (
      activeSession &&
      Date.now() - lastSessionActivity >= SESSION_IDLE_MS
    )
      lockSession();
  });
  document.addEventListener("click", (e) => {
    let b = e.target.closest("[data-password-toggle]");
    if (!b) return;
    let input = document.getElementById(b.dataset.passwordTarget);
    if (!input) return;
    let show = input.type === "password";
    input.type = show ? "text" : "password";
    b.innerHTML = show
      ? '<i data-lucide="eye-off" class="h-4 w-4"></i>'
      : '<i data-lucide="eye" class="h-4 w-4"></i>';
    b.setAttribute(
      "aria-label",
      show ? "Ocultar contraseña" : "Mostrar contraseña",
    );
    lucide.createIcons();
  });
  $("#auth-logo").src = LOGO;
  function startAuth() {
    authData = { owner: null, members: [] };
    try {
      localStorage.removeItem("nexo-hub-access-v1");
      localStorage.removeItem("nexo-hub-auth-guard-v1");
      localStorage.removeItem(SECURITY_LOG_KEY);
    } catch {}
    $("#recovery-panel").classList.add("hidden");
    $("#register-panel").classList.add("hidden");
    $("#owner-setup").classList.add("hidden");
    $("#login-panel").classList.remove("hidden");
    document.body.classList.add("locked");
    lucide.createIcons();
    passwordRecoveryFlow =
      new URLSearchParams(location.hash.slice(1)).get("type") === "recovery";
    if (passwordRecoveryFlow) {
      showPasswordReset();
      hideBootLoader();
      return;
    }
    if (!supabaseClient) {
      showLoginError(
        "No se pudo cargar el servicio de acceso. Recarga la página con conexión a internet.",
      );
      hideBootLoader();
      return;
    }
    supabaseClient.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (error) {
          hideBootLoader();
          return showLoginError(
            "No se pudo comprobar la sesión. Intenta recargar la página.",
          );
        }
        if (data.session) await enterAuthenticatedApp(data.session.user);
        else hideBootLoader();
      })
      .catch(() => {
        hideBootLoader();
        showLoginError("No se pudo conectar con el servicio de acceso.");
      });
  }
  function showPasswordReset() {
    passwordRecoveryFlow = true;
    activeSession = null;
    $("#app-shell").classList.add("hidden");
    $("#glass-scrollbar").classList.add("hidden");
    $("#auth-screen").classList.remove("hidden");
    $("#login-panel").classList.add("hidden");
    $("#recovery-panel").classList.add("hidden");
    $("#password-reset-panel").classList.remove("hidden");
    document.body.classList.add("locked");
    lucide.createIcons();
  }
  supabaseClient?.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") showPasswordReset();
  });
  function showLoginError(message) {
    const box = $("#login-error");
    if (!box) return;
    box.textContent = message;
    box.classList.remove("hidden");
  }
  async function fetchTeamProfile(user) {
    const { data, error } = await supabaseClient
      .from("team_members")
      .select("user_id,email,display_name,role,avatar_path,status,goal")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error)
      throw new Error(
        "No se pudo leer el perfil del equipo. Ejecuta el esquema SQL de Supabase y verifica las políticas RLS.",
      );
    if (!data)
      throw new Error(
        "Esta cuenta aún no está autorizada para NEXO. Pide al propietario que la agregue al equipo.",
      );
    return data;
  }
  async function signedAvatar(path) {
    if (!path) return "";
    const { data } = await supabaseClient.storage
      .from("nexo-private")
      .createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  }
  async function loadWorkspaceData(importLegacy = true) {
    const [teamResult, linksResult, quotesResult, tasksResult, eventsResult] =
      await Promise.all([
        supabaseClient
          .from("team_members")
          .select("user_id,email,display_name,role,status,goal,avatar_path")
          .order("display_name"),
        supabaseClient
          .from("links")
          .select("id,slug,business_name,destination_url,category,frame,qr_color,background_color,scans,created_at,updated_at")
          .eq("active", true)
          .order("updated_at", { ascending: false }),
        supabaseClient
          .from("quotes")
          .select("id,client_name,client_phone,quantity,unit_price,setup_service,discount,total,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseClient
          .from("tasks")
          .select("id,title,subtitle,body,priority,assignee_id,due_date,status,image_paths,created_at,completed_at,completed_by")
          .order("created_at", { ascending: false }),
        supabaseClient
          .from("security_events")
          .select("event_type,details,created_at")
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
    const failure = [teamResult, linksResult, quotesResult, tasksResult].find(
      (result) => result.error,
    );
    if (failure)
      throw new Error(
        "No se pudieron cargar los datos protegidos. Verifica que el esquema y las políticas RLS de Supabase estén aplicados.",
      );
    securityEvents = (eventsResult.data || []).map((event) => ({
      type: event.event_type,
      detail: event.details,
      at: event.created_at,
    }));
    teamMembers = await Promise.all((teamResult.data || []).map(async (member) => ({
      id: member.user_id,
      email: member.email,
      name: member.display_name,
      role: member.role,
      status: member.status,
      goal: member.goal,
      photo: await signedAvatar(member.avatar_path),
      avatarPath: member.avatar_path || "",
      key: member.user_id,
    })));
    state.links = (linksResult.data || []).map((link) => ({
      id: link.id,
      client: link.business_name,
      slug: link.slug,
      destination: link.destination_url,
      category: link.category,
      frame: link.frame,
      qrColor: link.qr_color,
      bgColor: link.background_color,
      scans: link.scans,
      updated: link.updated_at || link.created_at,
    }));
    state.quotes = (quotesResult.data || []).map((quote) => ({
      id: quote.id,
      name: quote.client_name,
      phone: quote.client_phone,
      qty: quote.quantity,
      unit: Number(quote.unit_price),
      setup: quote.setup_service,
      discount: Number(quote.discount),
      total: Number(quote.total),
      date: quote.created_at,
      sub: Number(quote.quantity) * Number(quote.unit_price) + (quote.setup_service ? 199 : 0),
    }));
    tasks = await Promise.all(
      (tasksResult.data || []).map(async (task) => {
        const paths = Array.isArray(task.image_paths) ? task.image_paths : [];
        const images = await Promise.all(
          paths.map(async (path) => {
            const { data } = await supabaseClient.storage
              .from("nexo-private")
              .createSignedUrl(path, 3600);
            return data?.signedUrl || "";
          }),
        );
        const assignee = teamMembers.find((member) => member.id === task.assignee_id);
        const completedBy = teamMembers.find((member) => member.id === task.completed_by);
        return {
          id: task.id,
          title: task.title,
          subtitle: task.subtitle,
          body: task.body,
          priority: task.priority,
          assignee: assignee?.name || "Integrante",
          assigneeKey: task.assignee_id,
          due: task.due_date || "",
          status: task.status,
          images: images.filter(Boolean),
          imagePaths: paths,
          createdAt: task.created_at,
          completedAt: task.completed_at,
          completedBy: completedBy?.name || "",
        };
      }),
    );
    state.plates = state.links.length;
    if (importLegacy && (await migrateLegacyWorkspace()))
      return loadWorkspaceData(false);
  }
  async function migrateLegacyWorkspace() {
    let oldState = null,
      oldTasks = [];
    try {
      oldState = JSON.parse(localStorage.getItem("nexo-hub-ops-v1") || "null");
      const parsedTasks = JSON.parse(localStorage.getItem("nexo-hub-team-tasks-v1") || "[]");
      oldTasks = Array.isArray(parsedTasks) ? parsedTasks : [];
    } catch {
      toast("Hay datos locales antiguos dañados; conserva una copia antes de borrarlos");
      return false;
    }
    if (!oldState && !oldTasks.length) return false;
    let changed = false;
    const validId = (id) =>
      typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const ownerOrManager = isTaskManager();
    if (oldState && Array.isArray(oldState.quotes) && activeSession?.role === "owner") {
      const remaining = [];
      for (const quote of oldState.quotes) {
        const id = validId(quote.id) ? quote.id : crypto.randomUUID();
        const existing = await supabaseClient.from("quotes").select("id").eq("id", id).maybeSingle();
        if (existing.error) {
          remaining.push(quote);
          continue;
        }
        if (!existing.data) {
          const { error } = await supabaseClient.from("quotes").insert({
            id,
            client_name: String(quote.name || "Cliente por confirmar").slice(0, 120),
            client_phone: String(quote.phone || "").slice(0, 40),
            quantity: Math.max(1, Math.min(10000, Number(quote.qty) || 1)),
            unit_price: Math.max(0, Number(quote.unit) || 0),
            setup_service: Boolean(quote.setup),
            discount: Math.max(0, Math.min(100, Number(quote.discount) || 0)),
            total: Math.max(0, Number(quote.total) || 0),
          });
          if (error) {
            remaining.push(quote);
            continue;
          }
        }
        changed = true;
      }
      oldState.quotes = remaining;
    }
    if (oldState && Array.isArray(oldState.links) && ownerOrManager) {
      const remaining = [];
      for (const link of oldState.links) {
        const id = validId(link.id) ? link.id : crypto.randomUUID();
        const existing = await supabaseClient.from("links").select("id").eq("id", id).maybeSingle();
        if (existing.error) {
          remaining.push(link);
          continue;
        }
        if (!existing.data) {
          const destination = String(link.destination || "");
          const slug = slugify(String(link.slug || ""));
          if (!slug || !/^https:\/\//i.test(destination)) {
            remaining.push(link);
            continue;
          }
          const { error } = await supabaseClient.from("links").insert({
            id,
            slug,
            business_name: String(link.client || "Cliente NEXO").slice(0, 120),
            destination_url: destination.slice(0, 2048),
            category: String(link.category || "general").slice(0, 80),
            frame: String(link.frame || "classic").slice(0, 40),
            qr_color: /^#[0-9a-f]{6}$/i.test(link.qrColor) ? link.qrColor : "#0a0a0c",
            background_color: /^#[0-9a-f]{6}$/i.test(link.bgColor) ? link.bgColor : "#ffffff",
            scans: 0,
          });
          if (error) {
            remaining.push(link);
            continue;
          }
        }
        changed = true;
      }
      oldState.links = remaining;
    }
    if (oldTasks.length && ownerOrManager) {
      const remaining = [];
      for (const task of oldTasks) {
        const assignee = teamMembers.find(
          (member) =>
            member.id === task.assigneeKey ||
            member.name.trim().toLowerCase() === String(task.assignee || "").trim().toLowerCase(),
        );
        if (!assignee) {
          remaining.push(task);
          continue;
        }
        const id = validId(task.id) ? task.id : crypto.randomUUID();
        const existing = await supabaseClient.from("tasks").select("id").eq("id", id).maybeSingle();
        if (existing.error) {
          remaining.push(task);
          continue;
        }
        if (!existing.data) {
          const imagePaths = [];
          let imageError = false;
          for (const image of Array.isArray(task.images) ? task.images : []) {
            if (!safeTaskImage(image).startsWith("data:image/jpeg;base64,")) continue;
            try {
              const bytes = Uint8Array.from(atob(image.split(",")[1]), (char) => char.charCodeAt(0));
              const blob = new Blob([bytes], { type: "image/jpeg" });
              const path = `${activeSession.userId}/${crypto.randomUUID()}.jpg`;
              const { error } = await supabaseClient.storage
                .from("nexo-private")
                .upload(path, blob, { contentType: "image/jpeg", upsert: false });
              if (error) throw error;
              imagePaths.push(path);
            } catch {
              imageError = true;
              break;
            }
          }
          if (imageError) {
            if (imagePaths.length)
              await supabaseClient.storage.from("nexo-private").remove(imagePaths);
            remaining.push(task);
            continue;
          }
          const priority = ["critical", "high", "normal", "low"].includes(task.priority)
            ? task.priority
            : "normal";
          const status = ["pending", "in_progress", "done"].includes(task.status)
            ? task.status
            : "pending";
          const { error } = await supabaseClient.from("tasks").insert({
            id,
            title: String(task.title || "Pendiente importado").slice(0, 180),
            subtitle: String(task.subtitle || "").slice(0, 180),
            body: String(task.body || "").slice(0, 4000),
            priority,
            assignee_id: assignee.id,
            due_date: /^\d{4}-\d{2}-\d{2}$/.test(task.due || "") ? task.due : null,
            status,
            image_paths: imagePaths,
            completed_at: status === "done" ? task.completedAt || new Date().toISOString() : null,
            completed_by: status === "done" ? activeSession.userId : null,
          });
          if (error) {
            if (imagePaths.length)
              await supabaseClient.storage.from("nexo-private").remove(imagePaths);
            remaining.push(task);
            continue;
          }
        }
        changed = true;
      }
      oldTasks = remaining;
    }
    try {
      if (oldState && (oldState.links?.length || oldState.quotes?.length))
        localStorage.setItem("nexo-hub-ops-v1", JSON.stringify(oldState));
      else localStorage.removeItem("nexo-hub-ops-v1");
      if (oldTasks.length)
        localStorage.setItem("nexo-hub-team-tasks-v1", JSON.stringify(oldTasks));
      else localStorage.removeItem("nexo-hub-team-tasks-v1");
    } catch {}
    if (changed) toast("Los datos anteriores se trasladaron al espacio seguro del equipo");
    return changed;
  }
  async function enterAuthenticatedApp(user) {
    if (passwordRecoveryFlow) return;
    try {
      const profile = await fetchTeamProfile(user);
      const member = {
        id: profile.user_id,
        email: profile.email || user.email || "",
        name: profile.display_name || user.email || "Integrante NEXO",
        role: profile.role,
        status: profile.status || "Disponible",
        goal: profile.goal || "",
        photo: await signedAvatar(profile.avatar_path),
        avatarPath: profile.avatar_path || "",
      };
      authData =
        profile.role === "owner"
          ? { owner: member, members: [] }
          : { owner: null, members: [member] };
      activeSession = {
        role: profile.role,
        name: member.name,
        index: user.id,
        userId: user.id,
        email: member.email,
      };
      await loadWorkspaceData();
      applyRoleAccess(profile.role);
      renderAll();
      renderTasks();
      renderTeamReport();
      refreshIdleLock();
      $("#auth-screen").classList.add("hidden");
      $("#app-shell").classList.remove("hidden");
      $("#glass-scrollbar").classList.remove("hidden");
      document.body.classList.remove("locked");
      $("#session-name").textContent = member.name;
      $("#session-initials").textContent = initials(member.name);
      if (member.photo) {
        $("#session-avatar").src = member.photo;
        $("#session-avatar").classList.remove("hidden");
        $("#session-initials").classList.add("hidden");
      } else {
        $("#session-avatar").classList.add("hidden");
        $("#session-initials").classList.remove("hidden");
      }
      $("#access-admin-btn").classList.toggle(
        "hidden",
        profile.role !== "owner",
      );
      $("#access-admin-btn").classList.toggle("flex", profile.role === "owner");
      $("#login-password").value = "";
      $("#login-error").classList.add("hidden");
      addSecurityEvent("Acceso correcto", member.email);
      lucide.createIcons();
      hideBootLoader();
    } catch (error) {
      try {
        await supabaseClient.auth.signOut();
      } catch {}
      showLoginError(
        error.message || "No se pudo validar el acceso del equipo.",
      );
      hideBootLoader();
    }
  }
  function initials(name = "NEXO") {
    return (
      String(name)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((x) => x[0] || "")
        .join("")
        .toUpperCase() || "NX"
    );
  }
  function accessRecords() {
    return [
      {
        key: "owner",
        record: authData?.owner,
        name: authData?.owner?.name || "Propietario NEXO",
        role: "OWNER",
        icon: "crown",
      },
      ...(authData?.members || []).map((record, i) => ({
        key: String(i),
        record,
        name:
          record.name || `Tarjeta virtual ${String(i + 1).padStart(2, "0")}`,
        role: record.hash ? "INTEGRANTE" : "POR ACTIVAR",
        icon: "user-round",
      })),
    ];
  }
  function renderAccessCards() {
    let items = accessRecords();
    $("#access-cards").innerHTML = items
      .map(
        (x, i) =>
          `<button class="access-pick ${selectedAccess === x.key ? "active" : ""} member-card rounded-xl p-3 text-left" data-access="${esc(x.key)}" aria-pressed="${selectedAccess === x.key}"><div class="flex items-center justify-between gap-2"><span class="team-avatar team-card-photo">${x.record?.photo ? `<img src="${esc(x.record.photo)}" alt="Foto de ${esc(x.name)}">` : `<span>${esc(initials(x.name))}</span>`}</span><span class="team-status-chip">${x.record?.status ? esc(x.record.status) : x.role}</span></div><div class="mt-3 truncate text-xs font-bold ${i % 2 === 0 ? "text-[#e5ff00]" : "text-[#b7ceff]"}">${esc(x.name)}</div><div class="mono mt-1 text-[8px] text-[#70727c]">${x.record?.lastSeen ? `ÚLT. ACCESO ${new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(new Date(x.record.lastSeen))}` : "PERFIL NEXO"}</div></button>`,
      )
      .join("");
    let chosen = items.find((x) => x.key === selectedAccess) || items[0];
    if (chosen) {
      $("#selected-profile-name").textContent = chosen.name;
      $("#selected-profile-role").textContent = chosen.role;
      $("#selected-profile-last").textContent = chosen.record?.lastSeen
        ? `ÚLTIMO ACCESO · ${new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(chosen.record.lastSeen))}`
        : "LISTO PARA ACCEDER";
      $("#selected-profile-initials").textContent = initials(chosen.name);
      let img = $("#selected-profile-avatar");
      if (chosen.record?.photo) {
        img.src = chosen.record.photo;
        img.classList.remove("hidden");
      } else {
        img.removeAttribute("src");
        img.classList.add("hidden");
      }
    }
    lucide.createIcons();
  }
  document.addEventListener("click", (e) => {
    let a = e.target.closest("[data-access]");
    if (a) {
      selectedAccess = a.dataset.access;
      renderAccessCards();
      $("#login-error").classList.add("hidden");
      $("#login-password").focus();
    }
  });
  async function login() {
    if (!supabaseClient)
      return showLoginError(
        "No se pudo cargar el servicio de acceso. Recarga la página con conexión a internet.",
      );
    const email = $("#login-email").value.trim().toLowerCase();
    const password = $("#login-password").value;
    if (!email || !password)
      return showLoginError(
        "Escribe el correo y la contraseña de tu cuenta NEXO.",
      );
    let data, error;
    try {
      ({ data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      }));
    } catch {
      showLoginError(
        "No se pudo conectar con Supabase. Revisa tu conexión a internet e inténtalo de nuevo.",
      );
      return;
    }
    if (error) {
      addSecurityEvent("Intento fallido", "Acceso de equipo");
      showLoginError(
        "No se pudo iniciar sesión. Verifica tus datos o pide al propietario que active tu cuenta.",
      );
      return;
    }
    await enterAuthenticatedApp(data.user);
    $("#login-password").value = "";
    lucide.createIcons();
  }
  $("#login-btn").onclick = login;
  $("#show-register").onclick = () => {
    $("#login-panel").classList.add("hidden");
    $("#register-panel").classList.remove("hidden");
    $("#register-email").value = $("#login-email").value.trim();
    $("#register-message").classList.add("hidden");
    $("#register-name").focus();
  };
  $("#back-to-login").onclick = () => {
    $("#register-panel").classList.add("hidden");
    $("#login-panel").classList.remove("hidden");
    $("#login-email").value = $("#register-email").value.trim();
    $("#register-message").classList.add("hidden");
    $("#login-password").focus();
  };
  $("#register-btn").onclick = async () => {
    const name = $("#register-name").value.trim();
    const email = $("#register-email").value.trim().toLowerCase();
    const password = $("#register-password").value;
    const confirm = $("#register-confirm").value;
    const message = $("#register-message");
    const button = $("#register-btn");
    const showMessage = (text, success = false) => {
      message.textContent = text;
      message.className = `mt-3 text-xs leading-5 ${success ? "text-[#a3ffcf]" : "text-[#ff9f9f]"}`;
    };
    if (!name || !email || !password || !confirm)
      return showMessage("Completa todos los campos.");
    if (password.length < 12)
      return showMessage("La contraseña debe tener al menos 12 caracteres.");
    if (password !== confirm)
      return showMessage("Las contraseñas no coinciden.");
    if (!supabaseClient)
      return showMessage("El servicio de acceso no está disponible.");
    button.disabled = true;
    button.textContent = "CREANDO CUENTA…";
    try {
      const options = { data: { display_name: name } };
      if (location.protocol === "https:")
        options.emailRedirectTo = `${location.origin}${location.pathname}`;
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options,
      });
      if (error) {
        if (
          error.message?.includes("NEXO_TEAM_ACCOUNT_LIMIT_REACHED") ||
          error.code === "NEXO_TEAM_ACCOUNT_LIMIT_REACHED"
        ) {
          showMessage(
            "El equipo alcanzó el límite de 6 cuentas. El propietario debe liberar un cupo antes de registrar a otra persona.",
          );
          return;
        }
        showMessage(
          error.message?.toLowerCase().includes("already")
            ? "No se pudo crear la cuenta. Revisa el correo o intenta iniciar sesión si ya te habías registrado."
            : "No se pudo crear la cuenta. El equipo admite hasta 6 cuentas; si aún hay cupo, revisa los datos e inténtalo de nuevo.",
        );
        return;
      }
      $("#register-password").value = "";
      $("#register-confirm").value = "";
      showMessage(
        "Cuenta creada. Revisa tu correo si Supabase solicita confirmación y pide al propietario que autorice tu perfil para entrar al Hub.",
        true,
      );
    } catch {
      showMessage("No se pudo conectar con el servicio de acceso.");
    } finally {
      button.disabled = false;
      button.textContent = "CREAR CUENTA";
    }
  };
  for (const input of [$("#login-password"), $("#login-email")])
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
  $("#forgot-owner").onclick = () => {
    $("#login-panel").classList.add("hidden");
    $("#recovery-panel").classList.remove("hidden");
    $("#recovery-email").value = $("#login-email").value.trim();
    $("#cancel-recovery").focus();
  };
  $("#send-recovery").onclick = async () => {
    const email = $("#recovery-email").value.trim().toLowerCase();
    const box = $("#recovery-error");
    if (!email) {
      box.textContent = "Escribe el correo de tu cuenta.";
      box.classList.remove("hidden");
      return;
    }
    if (!supabaseClient) {
      box.textContent = "Servicio de acceso no disponible.";
      box.classList.remove("hidden");
      return;
    }
    const resetOptions =
      location.protocol === "https:"
        ? { redirectTo: `${location.origin}${location.pathname}` }
        : {};
    let error;
    try {
      ({ error } = await supabaseClient.auth.resetPasswordForEmail(email, resetOptions));
    } catch {
      box.textContent =
        "No se pudo conectar con el servicio de correo. Inténtalo de nuevo.";
      box.classList.remove("hidden");
      return;
    }
    if (error) {
      box.textContent =
        "No se pudo enviar el correo. Verifica que el email esté autorizado y la URL de redirección esté configurada en Supabase.";
      box.classList.remove("hidden");
      return;
    }
    box.classList.add("hidden");
    toast("Si la cuenta existe, recibirás un enlace para recuperar el acceso.");
  };
  $("#cancel-recovery").onclick = () => {
    $("#recovery-panel").classList.add("hidden");
    $("#login-panel").classList.remove("hidden");
    $("#recovery-error").classList.add("hidden");
    $("#login-password").focus();
  };
  $("#save-new-password").onclick = async () => {
    const next = $("#new-password").value;
    const confirm = $("#new-password-confirm").value;
    const box = $("#password-reset-error");
    if (next.length < 12 || next !== confirm) {
      box.textContent =
        next.length < 12
          ? "Usa al menos 12 caracteres."
          : "Las contraseñas no coinciden.";
      box.classList.remove("hidden");
      return;
    }
    const { data, error } = await supabaseClient.auth.updateUser({
      password: next,
    });
    if (error) {
      box.textContent =
        "No se pudo cambiar la contraseña. Abre de nuevo el enlace de recuperación o solicita otro.";
      box.classList.remove("hidden");
      return;
    }
    history.replaceState(
      null,
      document.title,
      location.pathname + location.search,
    );
    passwordRecoveryFlow = false;
    $("#password-reset-panel").classList.add("hidden");
    toast("Contraseña actualizada");
    await enterAuthenticatedApp(data.user);
  };
  $("#logout-btn").onclick = async () => {
    if (activeSession) addSecurityEvent("Cierre de sesión", activeSession.name);
    activeSession = null;
    clearTimeout(idleLockTimer);
    $("#app-shell").classList.add("hidden");
    $("#glass-scrollbar").classList.add("hidden");
    $("#auth-screen").classList.remove("hidden");
    $("#login-password").value = "";
    await supabaseClient?.auth.signOut();
    startAuth();
  };
  function currentProfile() {
    return activeSession?.role === "owner"
      ? authData?.owner
      : ["member", "manager"].includes(activeSession?.role)
        ? authData?.members?.[Number(activeSession.index)]
        : null;
  }
  let profileDraftPhoto = "";
  function previewProfilePhoto(data) {
    profileDraftPhoto = data || "";
    let img = $("#profile-photo-preview"),
      initial = $("#profile-photo-initials");
    if (data) {
      img.src = data;
      img.classList.remove("hidden");
      initial.classList.add("hidden");
    } else {
      img.removeAttribute("src");
      img.classList.add("hidden");
      initial.textContent = initials(
        $("#profile-display-name").value || activeSession?.name || "NEXO",
      );
      initial.classList.remove("hidden");
    }
  }
  function openProfile() {
    let record = currentProfile();
    if (!record) return;
    $("#profile-display-name").value = record.name || activeSession.name;
    $("#profile-card-name").textContent = record.name || activeSession.name;
    $("#profile-status").value = record.status || "Disponible";
    $("#profile-goal").value = record.goal || "";
    $("#profile-count").textContent =
      `${$("#profile-goal").value.length} / 120`;
    previewProfilePhoto(record.photo || "");
    $("#profile-modal").classList.remove("hidden");
    $("#profile-modal").classList.add("flex");
    lucide.createIcons();
  }
  function closeProfile() {
    profileDraftPhoto = "";
    $("#profile-modal").classList.add("hidden");
    $("#profile-modal").classList.remove("flex");
  }
  $("#open-profile").onclick = openProfile;
  $("#close-profile").onclick = closeProfile;
  $("#cancel-profile").onclick = closeProfile;
  $("#profile-modal").addEventListener("click", (e) => {
    if (e.target.id === "profile-modal") closeProfile();
  });
  $("#profile-display-name").addEventListener("input", () => {
    $("#profile-card-name").textContent =
      $("#profile-display-name").value || "Miembro NEXO";
    if (!profileDraftPhoto)
      $("#profile-photo-initials").textContent = initials(
        $("#profile-display-name").value || "NEXO",
      );
  });
  $("#profile-goal").addEventListener(
    "input",
    () =>
      ($("#profile-count").textContent =
        `${$("#profile-goal").value.length} / 120`),
  );
  $("#choose-profile-photo").onclick = () => $("#profile-photo-file").click();
  $("#remove-profile-photo").onclick = () => previewProfilePhoto("");
  $("#profile-photo-file").addEventListener("change", async (e) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Elige un archivo de imagen");
      e.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("La imagen debe pesar menos de 8 MB");
      e.target.value = "";
      return;
    }
    try {
      let bitmap = await createImageBitmap(file),
        scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height)),
        canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      previewProfilePhoto(canvas.toDataURL("image/jpeg", 0.78));
      toast("Foto preparada para tu perfil");
    } catch {
      toast("No se pudo leer esta imagen");
    }
    e.target.value = "";
  });
  $("#save-profile").onclick = async () => {
    let rec = currentProfile();
    if (!rec) return;
    const button = $("#save-profile");
    button.disabled = true;
    let name =
      $("#profile-display-name").value.trim().slice(0, 40) || "Integrante NEXO";
    const status = $("#profile-status").value;
    const goal = $("#profile-goal").value.trim().slice(0, 120);
    const oldAvatarPath = rec.avatarPath || null;
    let newAvatarPath = oldAvatarPath;
    let uploadedPath = null;
    try {
      if (profileDraftPhoto.startsWith("data:image/jpeg;base64,")) {
        const response = await fetch(profileDraftPhoto);
        const blob = await response.blob();
        const path = "avatars/" + activeSession.userId + "/" + crypto.randomUUID() + ".jpg";
        const { error: uploadError } = await supabaseClient.storage
          .from("nexo-private")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadError) throw uploadError;
        uploadedPath = path;
        newAvatarPath = path;
      } else if (!profileDraftPhoto) {
        newAvatarPath = null;
      }
      const { error } = await supabaseClient
        .from("team_members")
        .update({
          display_name: name,
          status,
          goal,
          avatar_path: newAvatarPath,
        })
        .eq("user_id", activeSession.userId);
      if (error) throw error;
      if (oldAvatarPath && oldAvatarPath !== newAvatarPath) {
        await supabaseClient.storage.from("nexo-private").remove([oldAvatarPath]);
      }
    } catch {
      if (uploadedPath) await supabaseClient.storage.from("nexo-private").remove([uploadedPath]);
      toast("No se pudo guardar el perfil o su foto. Verifica las políticas de Storage en Supabase.");
      button.disabled = false;
      return;
    }
    rec.name = name;
    rec.avatarPath = newAvatarPath || "";
    rec.photo = await signedAvatar(rec.avatarPath);
    rec.status = status;
    rec.goal = goal;
    activeSession.name = name;
    $("#session-name").textContent = name;
    $("#profile-card-name").textContent = name;
    let photo = $("#session-avatar");
    if (rec.photo) {
      photo.src = rec.photo;
      photo.classList.remove("hidden");
      $("#session-initials").classList.add("hidden");
    } else {
      photo.removeAttribute("src");
      photo.classList.add("hidden");
      $("#session-initials").textContent = initials(name);
      $("#session-initials").classList.remove("hidden");
    }
    if (activeSession.role === "owner") {
      authData.owner = { ...authData.owner, name, status: rec.status, goal: rec.goal };
    } else {
      authData.members = [{ ...authData.members[0], name, status: rec.status, goal: rec.goal }];
    }
    renderAccessCards();
    closeProfile();
    toast("Perfil NEXO actualizado");
    button.disabled = false;
  };
  async function renderMemberAdmin() {
    $("#member-admin-list").innerHTML =
      '<div class="text-xs text-[#a0a0ab]">Cargando equipo…</div>';
    const { data, error } = await supabaseClient
      .from("team_members")
      .select("display_name,email,role,status")
      .order("display_name");
    if (error) {
      $("#member-admin-list").innerHTML =
        '<div class="text-xs text-[#ff9f9f]">No se pudo cargar el equipo. Confirma que aplicaste el esquema SQL.</div>';
    } else {
      $("#member-admin-list").innerHTML =
        (data || [])
          .map(
            (m) =>
              `<article class="member-card rounded-xl p-4"><div class="flex items-center gap-3"><div class="team-avatar team-avatar-sm">${esc(initials(m.display_name))}</div><div class="min-w-0"><div class="truncate text-xs font-semibold">${esc(m.display_name)}</div><div class="truncate text-[10px] text-[#858792]">${esc(m.email)}</div></div></div><div class="mt-3 flex items-center justify-between"><span class="team-status-chip">${esc(String(m.role).toUpperCase())}</span><span class="text-[9px] text-[#a3ffcf]">${esc(m.status || "Disponible")}</span></div></article>`,
          )
          .join("") ||
        '<div class="text-xs text-[#a0a0ab]">Aún no hay integrantes registrados.</div>';
    }
    renderSecurityEvents();
    lucide.createIcons();
  }
  $("#access-admin-btn").onclick = () => {
    if (activeSession?.role !== "owner") return;
    renderMemberAdmin();
    $("#access-modal").classList.remove("hidden");
    $("#access-modal").classList.add("flex");
  };
  $("#close-access").onclick = () => {
    $("#access-modal").classList.add("hidden");
    $("#access-modal").classList.remove("flex");
  };
  (() => {
    const root = document.documentElement;
    let px = -100,
      py = -100;
    const selectors = ["#profile-modal>.panel", "#access-modal>.panel"];
    const targets = () => [
      root,
      ...selectors.map((q) => document.querySelector(q)).filter(Boolean),
    ];
    const near = (el, x, y) => {
      if (el === root) return x >= innerWidth - 18;
      let r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        x >= r.right - 18 &&
        x <= r.right + 4 &&
        y >= r.top &&
        y <= r.bottom
      );
    };
    const closeSoon = (el, delay = 260) => {
      clearTimeout(el._scrollbarTimer);
      el._scrollbarTimer = setTimeout(() => {
        if (!near(el, px, py)) el.classList.remove("scrollbar-open");
      }, delay);
    };
    const open = (el, delay = 0) => {
      el.classList.add("scrollbar-open");
      if (delay) closeSoon(el, delay);
    };
    window.addEventListener(
      "pointermove",
      (e) => {
        px = e.clientX;
        py = e.clientY;
        for (const el of targets()) {
          if (near(el, px, py)) {
            clearTimeout(el._scrollbarTimer);
            open(el);
          } else if (el.classList.contains("scrollbar-open"))
            closeSoon(el, 260);
        }
      },
      { passive: true },
    );
    window.addEventListener(
      "pointerdown",
      (e) => {
        px = e.clientX;
        py = e.clientY;
        for (const el of targets()) if (near(el, px, py)) open(el, 900);
      },
      { passive: true },
    );
    document.addEventListener(
      "scroll",
      (e) => {
        let el =
          selectors
            .map((q) => document.querySelector(q))
            .find(
              (x) =>
                x && x.contains(e.target) && x.scrollHeight > x.clientHeight,
            ) || root;
        open(el, 850);
      },
      true,
    );
    window.addEventListener(
      "resize",
      () => {
        for (const el of targets())
          if (!near(el, px, py)) el.classList.remove("scrollbar-open");
      },
      { passive: true },
    );
  })();
  (() => {
    const rail = document.getElementById("glass-scrollbar"),
      thumb = document.getElementById("glass-scroll-thumb");
    if (!rail || !thumb) return;
    let idleTimer,
      dragging = false,
      dragOffset = 0;
    const maxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - innerHeight);
    function update() {
      let max = maxScroll(),
        track = rail.clientHeight,
        ratio =
          innerHeight /
          Math.max(innerHeight, document.documentElement.scrollHeight),
        h = Math.max(52, Math.min(track, track * ratio)),
        y = max ? (scrollY / max) * (track - h) : 0;
      thumb.style.height = `${h}px`;
      thumb.style.transform = `translateY(${y}px)`;
      rail.setAttribute(
        "aria-valuenow",
        String(max ? Math.round((scrollY / max) * 100) : 0),
      );
    }
    function open() {
      rail.classList.remove("is-idle");
      rail.classList.add("is-open");
      clearTimeout(idleTimer);
    }
    function closeSoon(delay = 900) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!dragging && !rail.matches(":hover")) {
          rail.classList.remove("is-open");
          rail.classList.add("is-idle");
        }
      }, delay);
    }
    function scrollToClientY(clientY, offset = thumb.offsetHeight / 2) {
      let r = rail.getBoundingClientRect(),
        travel = Math.max(0, r.height - thumb.offsetHeight),
        y = Math.max(0, Math.min(travel, clientY - r.top - offset)),
        max = maxScroll();
      window.scrollTo(0, travel ? (y / travel) * max : 0);
      update();
    }
    rail.addEventListener("pointerenter", open);
    rail.addEventListener("pointermove", () => {
      if (!dragging) open();
    });
    rail.addEventListener("pointerleave", () => {
      if (!dragging) closeSoon(450, true);
    });
    rail.addEventListener("pointerdown", (e) => {
      open();
      rail.focus({ preventScroll: true });
      dragging = true;
      rail.classList.add("is-dragging");
      dragOffset =
        e.target === thumb
          ? e.clientY - thumb.getBoundingClientRect().top
          : thumb.offsetHeight / 2;
      rail.setPointerCapture(e.pointerId);
      if (e.target !== thumb) scrollToClientY(e.clientY);
      e.preventDefault();
    });
    rail.addEventListener("pointermove", (e) => {
      if (dragging) scrollToClientY(e.clientY, dragOffset);
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove("is-dragging");
      closeSoon(750);
    };
    rail.addEventListener("pointerup", endDrag);
    rail.addEventListener("pointercancel", endDrag);
    rail.addEventListener("keydown", (e) => {
      let step = Math.max(80, innerHeight * 0.12),
        top = scrollY;
      if (e.key === "ArrowDown") top += step;
      else if (e.key === "ArrowUp") top -= step;
      else if (e.key === "PageDown") top += innerHeight * 0.85;
      else if (e.key === "PageUp") top -= innerHeight * 0.85;
      else if (e.key === "Home") top = 0;
      else if (e.key === "End") top = maxScroll();
      else return;
      e.preventDefault();
      open();
      window.scrollTo(0, top);
      closeSoon(850, true);
    });
    window.addEventListener(
      "scroll",
      () => {
        update();
        open();
        closeSoon(850);
      },
      { passive: true },
    );
    window.addEventListener("resize", update, { passive: true });
    new ResizeObserver(update).observe(document.body);
    update();
    rail.classList.add("is-idle");
  })();
  let tasks = [],
    teamMembers = [],
    selectedTaskImages = [];
  const isTaskManager = () =>
    activeSession?.role === "owner" || activeSession?.role === "manager";
  const taskMembers = () =>
    teamMembers.map((member) => ({ name: member.name, key: member.id }));
  function renderTasks() {
    if (!$("#task-list")) return;
    let members = taskMembers(),
      filter = $("#task-filter").value || "all";
    $("#task-manager-panel").classList.toggle("hidden", !isTaskManager());
    $("#task-permission-hint").textContent = isTaskManager()
      ? "Coordinación activa: puedes asignar pendientes al equipo."
      : "Marca tus tareas al avanzar; el equipo encargado gestiona las asignaciones.";
    let opts =
      '<option value="all">Todo el equipo</option>' +
      members
        .map((m) => `<option value="${esc(m.key)}">${esc(m.name)}</option>`)
        .join("");
    $("#task-filter").innerHTML = opts;
    $("#task-filter").value = members.some((m) => m.key === filter)
      ? filter
      : "all";
    $("#task-assignee").innerHTML = members
      .map((m) => `<option value="${esc(m.key)}">${esc(m.name)}</option>`)
      .join("");
    let mine = tasks.filter(
        (t) => filter === "all" || t.assigneeKey === filter,
      ),
      done = tasks.filter((t) => t.status === "done").length,
      open = tasks.filter((t) => t.status !== "done").length,
      late = tasks.filter(
        (t) =>
          t.status !== "done" &&
          t.due &&
          t.due < new Date().toISOString().slice(0, 10),
      ).length;
    $("#task-summary").innerHTML = [
      ["PENDIENTES", open, "list-todo", "text-[#e5ff00]"],
      ["COMPLETADAS", done, "circle-check", "text-[#a3ffcf]"],
      ["VENCIDAS", late, "alarm-clock", "text-[#ff8f8f]"],
      ["INTEGRANTES", members.length, "users-round", "text-[#8ab4ff]"],
    ]
      .map(
        (x) =>
          `<div class="metric rounded-xl border border-[#272932] p-4"><div class="flex items-center justify-between"><span class="label mb-0">${x[0]}</span><i data-lucide="${x[2]}" class="h-4 w-4 ${x[3]}"></i></div><div class="mono mt-3 text-2xl font-semibold">${x[1]}</div></div>`,
      )
      .join("");
    let total = tasks.length,
      percent = total ? Math.round((done / total) * 100) : 0;
    $("#task-progress-label").textContent =
      `${done} de ${total} tareas completadas`;
    $("#task-progress-percent").textContent = `${percent}%`;
    $("#task-progress-bar").style.width = `${percent}%`;
    if (!mine.length) {
      $("#task-list").innerHTML =
        '<div class="rounded-xl border border-dashed border-[#343640] px-4 py-10 text-center"><i data-lucide="clipboard-list" class="mx-auto h-7 w-7 text-[#666873]"></i><p class="mt-3 text-sm font-medium">Todavía no hay pendientes</p><p class="mt-1 text-xs text-[#858792]">Cuando el encargado asigne una tarea, aparecerá aquí.</p></div>';
    } else {
      $("#task-list").innerHTML = mine
        .slice()
        .sort(
          (a, b) =>
            (a.status === "done") - (b.status === "done") ||
            { critical: 0, high: 1, normal: 2, low: 3 }[
              a.priority || "normal"
            ] -
              { critical: 0, high: 1, normal: 2, low: 3 }[
                b.priority || "normal"
              ] ||
            (a.due || "9999").localeCompare(b.due || "9999"),
        )
        .map((t) => {
          let overdue =
              t.status !== "done" &&
              t.due &&
              t.due < new Date().toISOString().slice(0, 10),
            manager = isTaskManager(),
            canUpdate = manager || t.assigneeKey === activeSession?.userId,
            priorityRail = {
              critical: "#ff6868",
              high: "#ffb454",
              normal: "#8ab4ff",
              low: "#a0a0ab",
            }[t.priority || "normal"];
          const images = Array.isArray(t.images)
            ? t.images.map(safeTaskImage).filter(Boolean)
            : [];
          return `<article style="border-left:3px solid ${priorityRail}" class="rounded-xl border ${overdue ? "border-[#9b4545]/70" : "border-[#2b2d36]"} bg-[#0d0e12] p-4"><div class="flex items-start gap-3"><button class="task-toggle mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${t.status === "done" ? "border-[#a3ffcf] bg-[#a3ffcf] text-[#101115]" : "border-[#555762] text-transparent"}" data-task-id="${esc(t.id)}" ${canUpdate ? "" : "disabled"} aria-label="Cambiar estado"><i data-lucide="check" class="h-3.5 w-3.5"></i></button><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h4 class="text-sm font-semibold ${t.status === "done" ? "text-[#888a94] line-through" : ""}">${esc(t.title)}</h4><span class="rounded-md px-2 py-1 mono text-[8px] ${t.status === "done" ? "bg-[#a3ffcf]/10 text-[#a3ffcf]" : overdue ? "bg-[#ff7474]/10 text-[#ff9090]" : "bg-[#e5ff00]/10 text-[#e5ff00]"}">${t.status === "done" ? "COMPLETADA" : overdue ? "VENCIDA" : "PENDIENTE"}</span><span class="rounded-md border px-2 py-1 mono text-[8px] ${{ critical: "bg-[#ff6868]/10 text-[#ff9292]", high: "bg-[#ffb454]/10 text-[#ffc778]", normal: "bg-[#8ab4ff]/10 text-[#9ec1ff]", low: "bg-[#a0a0ab]/10 text-[#a0a0ab]" }[t.priority || "normal"]}">${{ critical: "CRÍTICA", high: "ALTA", normal: "NORMAL", low: "BAJA" }[t.priority || "normal"]}</span><span class="rounded-full ${{ critical: "bg-[#ff6868]", high: "bg-[#ffb454]", normal: "bg-[#8ab4ff]", low: "bg-[#a0a0ab]" }[t.priority || "normal"]} h-1.5 w-1.5 shadow-[0_0_9px_currentColor]"></span></div>${t.subtitle || t.body || t.detail ? `<div class="mt-2 space-y-1">${t.subtitle ? `<p class="text-xs font-medium text-[#d7d8df]">${esc(t.subtitle)}</p>` : ""}${t.body || t.detail ? `<p class="whitespace-pre-wrap text-xs leading-5 text-[#9a9ca6]">${esc(t.body || t.detail)}</p>` : ""}</div>` : ""}${images.length ? `<div class="mt-3 flex flex-wrap gap-2">${images.map((img, i) => `<a href="${img}" target="_blank" rel="noopener noreferrer" aria-label="Abrir imagen de referencia ${i + 1}" class="block overflow-hidden rounded-lg border border-[#343640]"><img src="${img}" alt="Imagen adjunta ${i + 1}" class="h-16 w-16 object-cover transition-transform hover:scale-110" loading="lazy"></a>`).join("")}</div>` : ""}<div class="mono mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-[#81838e]"><span><i data-lucide="user-round" class="mr-1 inline h-3 w-3"></i>${esc(t.assignee)}</span><span>${t.due ? `<i data-lucide="calendar-days" class="mr-1 inline h-3 w-3"></i>${esc(t.due)}` : "SIN FECHA"}</span></div></div>${manager ? `<button class="task-delete ghost rounded-lg p-2 text-[#92949e] hover:text-[#ff8f8f]" data-task-id="${esc(t.id)}" aria-label="Eliminar tarea"><i data-lucide="trash-2" class="h-4 w-4"></i></button>` : ""}</div></article>`;
        })
        .join("");
    }
    lucide.createIcons();
  }
  function weekBounds() {
    let start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    let end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  function dateInsideWeek(value, start, end) {
    if (!value) return false;
    let d = new Date(value);
    return !Number.isNaN(d.valueOf()) && d >= start && d < end;
  }
  function renderTeamReport() {
    let { start, end } = weekBounds(),
      fmt = (d) =>
        new Intl.DateTimeFormat("es-MX", {
          day: "numeric",
          month: "short",
        }).format(d),
      last = new Date(end);
    last.setDate(last.getDate() - 1);
    $("#report-week-range").textContent =
      `${fmt(start)} — ${fmt(last)} · corte semanal local`;
    let created = tasks.filter((t) => dateInsideWeek(t.createdAt, start, end)),
      completed = tasks.filter((t) =>
        dateInsideWeek(t.completedAt, start, end),
      ),
      active = tasks.filter((t) => t.status !== "done"),
      rate = created.length
        ? Math.min(100, Math.round((completed.length / created.length) * 100))
        : completed.length
          ? 100
          : 0;
    let items = [
      ["NUEVAS ESTA SEMANA", created.length, "calendar-plus", "text-[#e5ff00]"],
      [
        "COMPLETADAS ESTA SEMANA",
        completed.length,
        "circle-check",
        "text-[#a3ffcf]",
      ],
      ["EN PROCESO AHORA", active.length, "activity", "text-[#8ab4ff]"],
      ["AVANCE SEMANAL", `${rate}%`, "trending-up", "text-[#d1ff71]"],
    ];
    $("#weekly-summary").innerHTML = items
      .map(
        (x) =>
          `<div class="metric rounded-xl border border-[#272932] p-4"><div class="flex items-center justify-between"><span class="label mb-0">${x[0]}</span><i data-lucide="${x[2]}" class="h-4 w-4 ${x[3]}"></i></div><div class="mono mt-3 text-2xl font-semibold">${x[1]}</div></div>`,
      )
      .join("");
    let days = Array.from({ length: 7 }, (_, i) => {
        let d = new Date(start);
        d.setDate(start.getDate() + i);
        return {
          date: d,
          label: new Intl.DateTimeFormat("es-MX", { weekday: "short" })
            .format(d)
            .replace(".", ""),
          count: completed.filter((t) => {
            let c = new Date(t.completedAt);
            return (
              c.getFullYear() === d.getFullYear() &&
              c.getMonth() === d.getMonth() &&
              c.getDate() === d.getDate()
            );
          }).length,
        };
      }),
      max = Math.max(1, ...days.map((d) => d.count));
    $("#weekly-chart").innerHTML = days
      .map(
        (d) =>
          `<div class="flex flex-col items-center gap-2"><div class="flex h-32 w-full items-end justify-center rounded-lg bg-[#0d0e12] p-1"><div class="w-full rounded-md bg-gradient-to-t from-[#b9ce00] to-[#e5ff00] transition-[height] duration-700" style="height:${d.count ? Math.max(8, Math.round((d.count / max) * 100)) : 2}%;opacity:${d.count ? 1 : 0.15}" title="${d.count} completadas"></div></div><span class="mono text-[8px] uppercase text-[#81838e]">${esc(d.label)}</span><span class="mono text-[9px] text-white">${d.count}</span></div>`,
      )
      .join("");
    let members = taskMembers();
    $("#weekly-members").innerHTML = members.length
      ? members
          .map((m) => {
            let assigned = tasks.filter((t) => t.assigneeKey === m.key),
              memberCompleted = assigned.filter((t) =>
                dateInsideWeek(t.completedAt, start, end),
              ),
              memberActive = assigned.filter((t) => t.status !== "done"),
              assignedWeek = assigned.filter((t) =>
                dateInsideWeek(t.createdAt, start, end),
              ),
              den = memberCompleted.length + memberActive.length,
              pct = den ? Math.round((memberCompleted.length / den) * 100) : 0;
            return `<div><div class="mb-2 flex items-center justify-between gap-3"><div class="min-w-0"><div class="truncate text-xs font-semibold">${esc(m.name)}</div><div class="mono mt-1 text-[8px] text-[#81838e]">${memberCompleted.length} hechas · ${memberActive.length} activas · ${assignedWeek.length} nuevas</div></div><span class="mono text-[10px] text-[#e5ff00]">${pct}%</span></div><div class="h-1.5 overflow-hidden rounded-full bg-[#292b32]"><div class="h-full rounded-full bg-[#e5ff00] transition-[width] duration-700" style="width:${pct}%"></div></div></div>`;
          })
          .join("")
      : '<p class="text-xs text-[#858792]">Configura los integrantes para ver el avance.</p>';
    $("#weekly-active-count").textContent = `${active.length} ACTIVAS`;
    let priorityNames = {
        critical: "CRÍTICA",
        high: "ALTA",
        normal: "NORMAL",
        low: "BAJA",
      },
      priorityClasses = {
        critical: "border-[#ff6868]/40 text-[#ff9999]",
        high: "border-[#ffb454]/40 text-[#ffc778]",
        normal: "border-[#8ab4ff]/40 text-[#a8c7ff]",
        low: "border-[#a0a0ab]/40 text-[#b6b7bf]",
      };
    $("#weekly-active-tasks").innerHTML = active.length
      ? active
          .slice()
          .sort(
            (a, b) =>
              ({ critical: 0, high: 1, normal: 2, low: 3 })[
                a.priority || "normal"
              ] -
              { critical: 0, high: 1, normal: 2, low: 3 }[
                b.priority || "normal"
              ],
          )
          .map(
            (t) =>
              `<article class="rounded-xl border border-[#292b33] bg-[#0d0e12] p-3"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h4 class="truncate text-xs font-semibold">${esc(t.title)}</h4>${t.subtitle ? `<p class="mt-1 truncate text-[10px] text-[#858792]">${esc(t.subtitle)}</p>` : ""}<div class="mono mt-2 text-[8px] text-[#81838e]">${esc(t.assignee)}${t.due ? ` · LÍMITE ${esc(t.due)}` : ""}</div></div><span class="shrink-0 rounded-md border px-2 py-1 mono text-[8px] ${priorityClasses[t.priority || "normal"]}">${priorityNames[t.priority || "normal"]}</span></div></article>`,
          )
          .join("")
      : '<div class="col-span-full rounded-xl border border-dashed border-[#343640] px-4 py-8 text-center text-xs text-[#858792]">No hay tareas activas. Gran semana: todo está al día.</div>';
    lucide.createIcons();
  }
  $("#copy-weekly-report").onclick = async () => {
    let { start, end } = weekBounds(),
      completed = tasks.filter((t) =>
        dateInsideWeek(t.completedAt, start, end),
      ),
      active = tasks.filter((t) => t.status !== "done"),
      created = tasks.filter((t) => dateInsideWeek(t.createdAt, start, end)),
      members = taskMembers();
    let text = `NEXO · REPORTE SEMANAL\n${created.length} tareas nuevas · ${completed.length} completadas · ${active.length} activas\n\nCarga actual:\n${active.map((t) => `• ${t.title} — ${t.assignee} [${{ critical: "CRÍTICA", high: "ALTA", normal: "NORMAL", low: "BAJA" }[t.priority || "normal"]}]`).join("\n") || "Sin tareas activas"}\n\nEquipo: ${members.map((m) => m.name).join(", ")}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("Reporte semanal copiado");
    } catch {
      toast("No se pudo copiar el reporte en este navegador");
    }
  };
  $("#task-images").onchange = async (e) => {
    let files = [...(e.target.files || [])].slice(0, 3);
    selectedTaskImages = [];
    $("#task-image-previews").innerHTML = "";
    if (e.target.files.length > 3) toast("Se adjuntan máximo 3 imágenes");
    for (let f of files) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 12 * 1024 * 1024) {
        toast("Cada imagen debe pesar menos de 12 MB");
        continue;
      }
      try {
        let bitmap = await createImageBitmap(f),
          scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height)),
          canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        let ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        let url = canvas.toDataURL("image/jpeg", 0.68);
        if (url.length > 650000) {
          toast("Una imagen quedó muy pesada y se omitió");
          continue;
        }
        selectedTaskImages.push(url);
      } catch {
        toast("No se pudo cargar una de las imágenes");
      }
    }
    $("#task-image-previews").innerHTML = selectedTaskImages
      .map(
        (img, i) =>
          `<div class="relative"><img src="${img}" alt="Vista previa ${i + 1}" class="h-14 w-14 rounded-lg border border-[#343640] object-cover"><span class="absolute -right-1 -top-1 rounded-full bg-[#e5ff00] px-1.5 py-0.5 mono text-[8px] text-black">${i + 1}</span></div>`,
      )
      .join("");
  };
  $("#task-filter").onchange = renderTasks;
  $("#task-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!isTaskManager()) {
      toast("Solo los encargados autorizados pueden asignar tareas");
      return;
    }
    let member = taskMembers().find((m) => m.key === $("#task-assignee").value);
    if (!member) {
      toast("Selecciona a un integrante");
      return;
    }
    const imagePaths = [];
    for (const image of selectedTaskImages) {
      try {
        const bytes = Uint8Array.from(atob(image.split(",")[1]), (char) => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: "image/jpeg" });
        const path = `${activeSession.userId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabaseClient.storage
          .from("nexo-private")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        imagePaths.push(path);
      } catch {
        toast("No se pudo guardar una imagen en el almacenamiento privado");
        return;
      }
    }
    const draft = {
      title: $("#task-title").value.trim(),
      subtitle: $("#task-subtitle").value.trim(),
      body: $("#task-body").value.trim(),
      priority: $("#task-priority").value,
      assignee_id: member.key,
      due_date: $("#task-due").value || null,
      image_paths: imagePaths,
    };
    const { error } = await supabaseClient.from("tasks").insert(draft);
    if (error) {
      toast("No se pudo guardar la tarea. Verifica el rol y las políticas RLS.");
      return;
    }
    await loadWorkspaceData();
    selectedTaskImages = [];
    $("#task-image-previews").innerHTML = "";
    e.target.reset();
    renderTasks();
    toast(`Tarea asignada a ${member.name}`);
  };
  let celebrationTimer;
  function launchOrcaCelebration(task) {
    let el = $("#orca-celebration"),
      name = task.assignee || activeSession?.name || "equipo",
      title = task.title || "tu pendiente",
      label = {
        critical: "CRÍTICA",
        high: "ALTA",
        normal: "NORMAL",
        low: "BAJA",
      }[task.priority || "normal"];
    $("#orca-celebrate-title").textContent = `¡Bien hecho, ${name}!`;
    $("#orca-task-done").textContent = `Completaste: ${title}`;
    $("#orca-who-done").textContent = `INTEGRANTE · ${name.toUpperCase()}`;
    $("#orca-priority-done").textContent = `PRIORIDAD · ${label}`;
    $("#orca-priority-done").className =
      `rounded-full border px-3 py-1.5 mono text-[10px] font-bold ${{ critical: "border-[#0a0a0c] bg-[#0a0a0c] text-[#ff7979]", high: "border-[#0a0a0c] bg-[#0a0a0c] text-[#ffc778]", normal: "border-[#0a0a0c] bg-[#0a0a0c] text-[#a8c7ff]", low: "border-[#0a0a0c] bg-[#0a0a0c] text-[#d0d0d0]" }[task.priority || "normal"]}`;
    el.classList.remove("hidden");
    el.classList.add("show");
    document.body.classList.add("celebrating");
    $("#orca-celebration-close").focus();
  }
  function closeOrcaCelebration() {
    let el = $("#orca-celebration");
    if (!el.classList.contains("show")) return;
    el.classList.add("hidden");
    el.classList.remove("show");
    document.body.classList.remove("celebrating");
    $("#task-filter").focus();
  }
  $("#orca-celebration-close").onclick = closeOrcaCelebration;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOrcaCelebration();
  });
  document.addEventListener("click", async (e) => {
    let toggle = e.target.closest(".task-toggle");
    if (toggle) {
      let t = tasks.find((x) => x.id === toggle.dataset.taskId);
      if (!t) return;
      if (!isTaskManager() && t.assigneeKey !== activeSession?.userId) {
        toast("Solo puedes actualizar tus pendientes");
        return;
      }
      let completed = t.status !== "done";
      const { error } = await supabaseClient
        .from("tasks")
        .update({
          status: completed ? "done" : "pending",
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? activeSession.userId : null,
        })
        .eq("id", t.id);
      if (error) return toast("Supabase rechazó el cambio de estado de la tarea");
      t.status = completed ? "done" : "pending";
      t.completedAt = completed ? new Date().toISOString() : null;
      t.completedBy = completed ? activeSession?.name || t.assignee : "";
      renderTasks();
      if (completed) launchOrcaCelebration(t);
      toast(completed ? "Pendiente completado" : "Pendiente reabierto");
      return;
    }
    let del = e.target.closest(".task-delete");
    if (del) {
      if (!isTaskManager()) return;
      const task = tasks.find((item) => item.id === del.dataset.taskId);
      if (!task) return;
      const { error } = await supabaseClient
        .from("tasks")
        .delete()
        .eq("id", task.id);
      if (error) return toast("No se pudo eliminar la tarea en Supabase");
      if (task.imagePaths?.length)
        await supabaseClient.storage.from("nexo-private").remove(task.imagePaths);
      tasks = tasks.filter((x) => x.id !== task.id);
      renderTasks();
      toast("Tarea eliminada");
    }
  });
  $("#ndef-kind").value = "custom";
  renderNdef();
  calcResin();
  renderROI();
  renderQuote();
  renderAll();
  makeQR($("#link-qr"), urlFor("tu-alias"));
  renderMetrics();
  renderTasks();
  renderTeamReport();
  lucide.createIcons();
  startAuth();
})();
