import { supabase, TABLES, firstWorkingCount, showToast } from "./supabase.js";

const money = value => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(Number(value || 0));

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

async function getOrders() {
  const { data, error } = await supabase.from(TABLES.orders).select("*");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function getPlatformFee() {
  try {
    const { data } = await supabase.from(TABLES.platformSettings).select("*").eq("id", 1).maybeSingle();
    if (data) return data;
  } catch (_) {}
  try {
    const { data } = await supabase.from(TABLES.siteSettings).select("*").eq("id", 1).maybeSingle();
    return data || {};
  } catch (_) { return {}; }
}

function isCompleted(order) {
  return ["completed", "delivered", "success"].includes(String(order.order_status ?? order.status ?? "").toLowerCase());
}

function orderAmount(order) {
  return Number(order.total_amount ?? order.subtotal ?? order.amount ?? order.total ?? order.price ?? 0) || 0;
}

function platformEarning(order) {
  const direct = order.platform_fee ?? order.platformFee;
  return direct === null || direct === undefined || direct === "" ? null : Number(direct) || 0;
}

function startOfPeriod(period) {
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

function calculateEarnings(orders, period, settings) {
  const start = startOfPeriod(period);
  let total = 0;
  const fee = Number(settings.platform_fee ?? settings.fee ?? 0) || 0;
  const feeType = settings.platform_fee_type ?? settings.fee_type ?? "percentage";

  for (const order of orders) {
    if (!isCompleted(order)) continue;
    const date = new Date(order.created_at || order.created || 0);
    if (Number.isNaN(date.getTime()) || date < start) continue;

    const direct = platformEarning(order);
    if (direct !== null) {
      total += direct;
    } else if (fee > 0) {
      const amount = orderAmount(order);
      total += feeType === "fixed" ? fee : amount * fee / 100;
    }
  }
  return total;
}

async function loadDashboard() {
  try {
    const [farmers, customers, delivery, products, orders, settings] = await Promise.all([
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
      getOrders(),
      getPlatformFee()
    ]);

    setText("farmersCount", farmers);
    setText("customersCount", customers);
    setText("deliveryBoysCount", delivery);
    setText("productsCount", products);

    const pending = orders.filter(o => ["pending", "processing", "confirmed", "assigned", "out_for_delivery", "new"].includes(String(o.order_status ?? o.status ?? "").toLowerCase())).length;
    const completed = orders.filter(isCompleted).length;

    setText("totalOrders", orders.length);
    setText("pendingOrders", pending);
    setText("completedOrders", completed);
    setText("weeklyEarnings", money(calculateEarnings(orders, "week", settings)));
    setText("monthlyEarnings", money(calculateEarnings(orders, "month", settings)));
    setText("yearlyEarnings", money(calculateEarnings(orders, "year", settings)));
    setText("lastUpdated", `Updated ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`);
  } catch (error) {
    console.error("Dashboard error:", error);
    showToast(error?.message || "Could not load dashboard data.");
  }
}

document.getElementById("refreshDashboardBtn")?.addEventListener("click", loadDashboard);
window.addEventListener("admin-ready", loadDashboard);
window.addEventListener("dashboard-requested", loadDashboard);
