import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://iyurbpfsvqzmdyaqinqi.supabase.co";
export const SUPABASE_KEY = "sb_publishable_yMfCVOi95ZMwNjyHNuc-Ww_8LyLAwDE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export const TABLES = {
  profiles: "profiles",
  farmers: "farmers",
  customers: "customers",
  deliveryBoys: "delivery_boys",
  products: "products",
  orders: "orders",
  platformSettings: "platform_settings",
  siteSettings: "site_settings",
  adminUsers: "admin_users"
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
    try { return await countRows(item.table, item.column, item.value); } catch (_) {}
  }
  return 0;
}

export function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
