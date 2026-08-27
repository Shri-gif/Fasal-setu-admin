import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/*
  Put the SAME Supabase project URL and publishable/anon key used by
  your Farmer + Customer websites here.
*/
export const SUPABASE_URL = "https://iyurbpfsvqzmdyaqinqi.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dXJicGZzdnF6bWR5YXFpbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjkyODUsImV4cCI6MjEwMjkwNTI4NX0.QiHk-cjLDETbK385RqW3R40A3ePpTn1B0XgN4FOJs2Q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const TABLES = {
  profiles: "profiles",
  farmers: "farmers",
  customers: "customers",
  deliveryBoys: "delivery_boys",
  products: "products",
  orders: "orders",
  platformSettings: "platform_settings",
  siteSettings: "site_settings"
};

export async function countRows(table, filterColumn = null, filterValue = null) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filterColumn && filterValue !== null) query = query.eq(filterColumn, filterValue);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function firstWorkingCount(candidates) {
  for (const item of candidates) {
    try {
      const count = await countRows(item.table, item.column, item.value);
      return count;
    } catch (_) {}
  }
  return 0;
}

export function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
