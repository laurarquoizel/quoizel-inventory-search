const SUPABASE_URL = "https://bxylkqzepjlkxwfnxwsz.supabase.co";
const SUPABASE_KEY = "sb_publishable_u4rxrjpD7XWJGfCQ-rhWNw_4RIZvOHo";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const input = document.getElementById("searchInput");
const results = document.getElementById("results");
const message = document.getElementById("message");
const lastUpdated = document.getElementById("lastUpdated");

let timer;

loadLastUpdated();

input.addEventListener("input", () => {
  clearTimeout(timer);

  const query = input.value.trim();

  if (query.length < 2) {
    results.innerHTML = "";
    message.textContent = "";
    return;
  }

  message.textContent = "Searching...";

  timer = setTimeout(() => {
    searchInventory(query);
  }, 300);
});

async function loadLastUpdated() {
  const { data, error } = await db
    .from("daily_inventory")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !data || !data.length) {
    lastUpdated.textContent = "";
    return;
  }

  lastUpdated.textContent =
    "Inventory refreshed: " + formatDateTime(data[0].updated_at);
}

async function searchInventory(query) {
  const safeQuery = query.replace(/[%_]/g, "");

  const { data, error } = await db
    .from("daily_inventory")
    .select("*")
    .or(`sku.ilike.%${safeQuery}%,upc.ilike.%${safeQuery}%`)
    .limit(30);

  if (error) {
    console.error(error);
    message.textContent = "There was an error loading inventory.";
    results.innerHTML = "";
    return;
  }

  if (!data || data.length === 0) {
    message.textContent = "";
    results.innerHTML = `
      <div class="empty-state">
        No inventory records found. Try searching by full SKU, partial SKU, or UPC.
      </div>
    `;
    return;
  }

  const sorted = data.sort((a, b) => {
    return Number(b.currently_available || 0) - Number(a.currently_available || 0);
  });

  message.textContent = `${sorted.length} result${sorted.length === 1 ? "" : "s"} found.`;
  results.innerHTML = sorted.map(renderCard).join("");
}

function renderCard(item) {
  const available = Number(item.currently_available || 0);
  const futureAvailable = Number(item.future_available || 0);

  return `
    <article class="inventory-card">
      <h2 class="sku">${escapeHtml(item.sku || "")}</h2>

      <div style="margin-bottom: 16px;">
        ${getStatusBadge(item.status)}
      </div>

      <div class="card-grid">
        <div class="field">
          <div class="label">Available Now</div>
          <div class="value">${available}</div>
          <div style="margin-top:8px;">${getInventoryBadge(available, futureAvailable)}</div>
        </div>

        <div class="field">
          <div class="label">Future Available</div>
          <div class="value">${futureAvailable}</div>
        </div>

        <div class="field">
          <div class="label">Future Date</div>
          <div class="value">${formatDate(item.future_date_available)}</div>
        </div>

        <div class="field">
          <div class="label">Future Status</div>
          <div class="value">${getFutureStatusBadge(item.future_status)}</div>
        </div>

        <div class="field">
          <div class="label">UPC</div>
          <div class="value">${escapeHtml(item.upc || "—")}</div>
        </div>

        <div class="field">
          <div class="label">Ships Via</div>
          <div class="value">${escapeHtml(item.shipped_via || "—")}</div>
        </div>

        <div class="field">
          <div class="label">Dim Weight</div>
          <div class="value">${item.dim_weight || "—"}</div>
        </div>
      </div>
    </article>
  `;
}

function getInventoryBadge(available, futureAvailable) {
  if (available > 0) {
    return `<span class="badge badge-green">In Stock</span>`;
  }

  if (futureAvailable > 0) {
    return `<span class="badge badge-orange">Future Inventory</span>`;
  }

  return `<span class="badge badge-red">Out of Stock</span>`;
}

function getStatusBadge(status) {
  if (!status) {
    return `<span class="badge badge-red">No Status</span>`;
  }

  const clean = String(status).toLowerCase();

  if (clean.includes("active")) {
    return `<span class="badge badge-green">${escapeHtml(status)}</span>`;
  }

  return `<span class="badge badge-red">${escapeHtml(status)}</span>`;
}

function getFutureStatusBadge(status) {
  if (!status || String(status).trim() === "") {
    return `<span class="badge badge-blue">—</span>`;
  }

  const clean = String(status).toLowerCase();

  if (clean.includes("confirmed")) {
    return `<span class="badge badge-green">${escapeHtml(status)}</span>`;
  }

  if (clean.includes("unconfirmed")) {
   return `<span class="badge badge-yellow">${escapeHtml(status)}</span>`;
  }

  return `<span class="badge badge-blue">${escapeHtml(status)}</span>`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "";

  const raw = String(value);
  const iso = raw.endsWith("Z") || raw.includes("+") ? raw : raw + "Z";
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
