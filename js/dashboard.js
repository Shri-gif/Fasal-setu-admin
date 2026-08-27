import { supabase, TABLES, firstWorkingCount, showToast } from "./supabase.js";

const money = value => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(Number(value || 0));

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function getOrderRows() {
  const candidates = [
    { table: TABLES.orders, amount: "total_amount", status: "status", created: "created_at" },
    { table: TABLES.orders, amount: "total", status: "status", created: "created_at" },
    { table: TABLES.orders, amount: "amount", status: "status", created: "created_at" },
    { table: TABLES.orders, amount: "price", status: "status", created: "created_at" }
  ];

  for (const c of candidates) {
    try {
      const { data, error } = await supabase
        .from(c.table)
        .select(`*,${c.amount},${c.status},${c.created}`);
      if (!error) return data || [];
    } catch (_) {}
  }
  return [];
}

function dateRange(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === "week") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  } else if (period === "month") {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

function calculateEarnings(rows, period) {
  const start = dateRange(period);
  return rows.reduce((sum, row) => {
    const created = new Date(row.created_at || row.created || 0);
    if (created < start) return sum;
    const total = Number(row.total_amount ?? row.total ?? row.amount ?? row.price ?? 0);
    const fee = Number(row.platform_fee ?? row.platformFee ?? 0);
    return sum + (fee || total);
  }, 0);
}

async function loadDashboard() {
  try {
    const [farmers, customers, delivery, products, orders] = await Promise.all([
      firstWorkingCount([
        { table: TABLES.farmers },
        { table: TABLES.profiles, column: "role", value: "farmer" }
      ]),
      firstWorkingCount([
        { table: TABLES.customers },
        { table: TABLES.profiles, column: "role", value: "customer" }
      ]),
      firstWorkingCount([
        { table: TABLES.deliveryBoys },
        { table: TABLES.profiles, column: "role", value: "delivery_boy" },
        { table: TABLES.profiles, column: "role", value: "delivery" }
      ]),
      firstWorkingCount([{ table: TABLES.products }]),
      getOrderRows()
    ]);

    setText("farmersCount", farmers);
    setText("customersCount", customers);
    setText("deliveryBoysCount", delivery);
    setText("productsCount", products);

    const total = orders.length;
    const pending = orders.filter(o => ["pending","processing","confirmed","assigned","out_for_delivery"].includes(String(o.status || "").toLowerCase())).length;
    const completed = orders.filter(o => ["completed","delivered","success"].includes(String(o.status || "").toLowerCase())).length;

    setText("totalOrders", total);
    setText("pendingOrders", pending);
    setText("completedOrders", completed);
    setText("weeklyEarnings", money(calculateEarnings(orders, "week")));
    setText("monthlyEarnings", money(calculateEarnings(orders, "month")));
    setText("yearlyEarnings", money(calculateEarnings(orders, "year")));

    setText("lastUpdated", `Updated ${new Date().toLocaleString("en-IN", { dateStyle:"medium", timeStyle:"short" })}`);
  } catch (error) {
    console.error(error);
    showToast("Could not load some dashboard data.");
  }
}

document.getElementById("refreshDashboardBtn")?.addEventListener("click", loadDashboard);
window.addEventListener("admin-ready", loadDashboard);
window.addEventListener("dashboard-requested", loadDashboard);
