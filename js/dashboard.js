import { supabase } from "./supabase.js";

/* =========================================================
   FASAL SETU ADMIN — DASHBOARD
   ========================================================= */

const $ = (id) => document.getElementById(id);

const state = {
  farmers: [],
  deliveryPartners: [],
  orders: [],
  farmerPayouts: [],
  deliveries: [],
};

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(date) {
  if (!date) return "—";

  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function showToast(message, type = "success") {
  const toast = $("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type}`;

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

function isCompletedOrder(order) {
  return [
    "completed",
    "complete",
    "delivered",
    "success",
    "successful",
    "fulfilled",
  ].includes(
    normalize(order?.order_status ?? order?.status)
  );
}

/* ---------------------------------------------------------
   Generic Supabase fetch helpers
--------------------------------------------------------- */
async function fetchRows(table, select = "*") {
  const { data, error } = await supabase
    .from(table)
    .select(select);

  if (error) {
    console.error(`${table} fetch error:`, error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function countRows(table, filters = []) {
  let query = supabase
    .from(table)
    .select("*", {
      count: "exact",
      head: true,
    });

  for (const filter of filters) {
    if (filter.operator === "eq") {
      query = query.eq(
        filter.column,
        filter.value
      );
    }

    if (filter.operator === "neq") {
      query = query.neq(
        filter.column,
        filter.value
      );
    }
  }

  const { count, error } = await query;

  if (error) {
    console.error(
      `Count error: ${table}`,
      error
    );

    return 0;
  }

  return Number(count || 0);
}

/* =========================================================
   BASIC COUNTS
========================================================= */

async function loadBasicCounts() {
  const [
    farmers,
    customers,
    deliveryBoys,
    products,
  ] = await Promise.all([
    countRows("farmers"),

    countRows("profiles", [
      {
        column: "role",
        operator: "eq",
        value: "consumer",
      },
    ]),

    countRows("delivery_partners"),

    countRows("products"),
  ]);

  setText(
    "farmersCount",
    farmers
  );

  setText(
    "customersCount",
    customers
  );

  setText(
    "deliveryBoysCount",
    deliveryBoys
  );

  setText(
    "productsCount",
    products
  );
}

/* =========================================================
   FARMERS

   farmers.user_id -> profiles.id
========================================================= */

async function loadFarmers() {
  try {
    const [
      farmers,
      profiles,
      payouts,
    ] = await Promise.all([
      fetchRows(
        "farmers",
        "*"
      ),

      fetchRows(
        "profiles",
        `
          id,
          full_name,
          phone,
          email,
          address,
          city,
          district,
          state,
          mobile,
          role,
          is_active
        `
      ),

      fetchRows(
        "farmer_payouts",
        "*"
      ).catch(() => []),
    ]);

    const profileMap = new Map(
      profiles.map((profile) => [
        String(profile.id),
        profile,
      ])
    );

    const earningMap = new Map();

    for (const payout of payouts) {
      const farmerId = String(
        payout.farmer_id ?? ""
      );

      if (!farmerId) {
        continue;
      }

      const net = Number(
        payout.net_amount ?? 0
      );

      if (Number.isFinite(net)) {
        earningMap.set(
          farmerId,
          (
            earningMap.get(farmerId) || 0
          ) + net
        );
      }
    }

    state.farmers = farmers.map(
      (farmer) => {
        const profile =
          profileMap.get(
            String(farmer.user_id)
          ) || {};

        return {
          ...farmer,

          profile,

          name:
            profile.full_name ||
            farmer.full_name ||
            farmer.name ||
            farmer.farm_name ||
            "Farmer",

          mobile:
            profile.phone ||
            profile.mobile ||
            farmer.mobile ||
            farmer.phone ||
            "—",

          email:
            profile.email ||
            farmer.email ||
            "—",

          city:
            profile.city ||
            farmer.city ||
            "—",

          district:
            profile.district ||
            farmer.district ||
            "—",

          state:
            profile.state ||
            farmer.state ||
            "—",

          farmName:
            farmer.farm_name ||
            "—",

          earning:
            earningMap.get(
              String(farmer.id)
            ) || 0,
        };
      }
    );

    renderFarmers();

  } catch (error) {
    console.error(
      "Farmers load error:",
      error
    );

    state.farmers = [];

    renderFarmers();
  }
}

function renderFarmers() {
  const container =
    $("farmersTableBody");

  const empty =
    $("farmersEmpty");

  if (!container) {
    return;
  }

  const search = normalize(
    $("farmerSearch")?.value
  );

  const filtered =
    state.farmers.filter(
      (farmer) => {
        if (!search) {
          return true;
        }

        return [
          farmer.name,
          farmer.mobile,
          farmer.email,
          farmer.farmName,
          farmer.city,
          farmer.district,
          farmer.state,
        ].some(
          (value) =>
            normalize(value)
              .includes(search)
        );
      }
    );

  container.innerHTML =
    filtered.map(
      (farmer) => `
        <tr>
          <td>
            <strong>
              ${escapeHTML(
                farmer.name
              )}
            </strong>

            <small>
              ${escapeHTML(
                farmer.farmName
              )}
            </small>
          </td>

          <td>
            ${escapeHTML(
              farmer.mobile
            )}
          </td>

          <td>
            ${escapeHTML(
              farmer.email
            )}
          </td>

          <td>
            ${escapeHTML(
              farmer.city
            )}
          </td>

          <td>
            <strong>
              ${formatCurrency(
                farmer.earning
              )}
            </strong>
          </td>

          <td>
            <span class="status-badge ${normalize(
              farmer.verification_status
            )}">
              ${escapeHTML(
                farmer.verification_status ||
                "pending"
              )}
            </span>
          </td>
        </tr>
      `
    ).join("");

  if (empty) {
    empty.style.display =
      filtered.length
        ? "none"
        : "block";
  }
}

/* =========================================================
   DELIVERY PARTNERS

   delivery_partners.user_id -> profiles.id
========================================================= */

async function loadDeliveryPartners() {
  try {
    const [
      partners,
      profiles,
      deliveries,
      orders,
    ] = await Promise.all([
      fetchRows(
        "delivery_partners",
        "*"
      ),

      fetchRows(
        "profiles",
        `
          id,
          full_name,
          phone,
          email,
          address,
          city,
          district,
          state,
          mobile,
          role,
          is_active
        `
      ),

      fetchRows(
        "deliveries",
        "*"
      ).catch(() => []),

      fetchRows(
        "orders",
        "*"
      ).catch(() => []),
    ]);

    const profileMap = new Map(
      profiles.map((profile) => [
        String(profile.id),
        profile,
      ])
    );

    const orderMap = new Map(
      orders.map((order) => [
        String(order.id),
        order,
      ])
    );

    const earningMap = new Map();

    for (const delivery of deliveries) {
      const partnerId = String(
        delivery.delivery_partner_id ?? ""
      );

      if (!partnerId) {
        continue;
      }

      const deliveryStatus =
        normalize(delivery.status);

      const order
