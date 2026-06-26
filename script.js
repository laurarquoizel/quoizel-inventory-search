const SUPABASE_URL = "https://bxylkqzepjlkxwfnxwsz.supabase.co";
const SUPABASE_KEY = "sb_publishable_u4rxrjpD7XWJGfCQ-rhWNw_4RIZvOHo";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const input = document.getElementById("searchInput");
const results = document.getElementById("results");
const message = document.getElementById("message");

let timer;

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

async function searchInventory(query) {
  const safeQuery = query.replace(/[%_]/g, "");

  const { data, error } = await db
    .from("daily_inventory")
    .select("*")
    .or(`sku.ilike.%${safeQuery}%,upc.ilike.%${safeQuery}%`)
    .limit(25);

  if (error) {
    console.error(error);
    message.textContent = "There was an error loading inventory.";
    results.innerHTML = "";
    return;
  }

  if (!data || data.length === 0) {
    message.textContent = "No results found.";
    results.innerHTML = "";
    return;
  }

  message.textContent = `${data.length} result${data.length === 1 ? "" : "s"} found.`;

  results.innerHTML = data.map(renderCard).join("");
}

function renderCard(item) {
  const available = Number(item.currently_available || 0);
  const futureAvailable = Number(item.future_available || 0);

  let availabilityClass = "red";
  let availabilityText = "Out of Stock";

  if (available > 0) {
    availabilityClass = "green";
    availabilityText = "In Stock";
  } else if (futureAvailable > 0) {
    availabilityClass = "orange";
    availabilityText = "Future Inventory";
  }

  return `
    <article class="card">
      <h2>${item.sku || ""}</h2>

      <div class="grid">
        <div>
          <div class="label">Inventory Status</div>
          <div class="value ${availabilityClass}">${availabilityText}</div>
        </div>

        <div>
          <div class="label">Available Now</div>
          <div class="value">${available}</div>
        </div>

        <div>
          <div class="label">Future Available</div>
          <div class="value">${futureAvailable}</div>
        </div>

        <div>
          <div class="label">Future Date</div>
          <div class="value">${formatDate(item.future_date_available)}</div>
        </div>

        <div>
          <div class="label">Product Status</div>
          <div class="value">${item.status || ""}</div>
        </div>

        <div>
          <div class="label">UPC</div>
          <div class="value">${item.upc || ""}</div>
        </div>

        <div>
          <div class="label">Ships Via</div>
          <div class="value">${item.shipped_via || ""}</div>
        </div>

        <div>
          <div class="label">Dim Weight</div>
          <div class="value">${item.dim_weight || ""}</div>
        </div>
      </div>
    </article>
  `;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
