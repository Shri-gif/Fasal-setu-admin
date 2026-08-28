import { supabase, TABLES, showToast } from "./supabase.js";

const form = document.getElementById("settingsForm");
const saveBtn = document.getElementById("saveSettingsBtn");

const field = id => document.getElementById(id);

function setValue(id, value) {
  const el = field(id);
  if (el) el.value = value ?? "";
}

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

let platformRow = null;
let siteRow = null;

async function loadSettings() {
  try {
    platformRow = null;
    siteRow = null;

    const platform = await supabase.from(TABLES.platformSettings).select("*").eq("id", 1).maybeSingle();
    if (!platform.error) platformRow = platform.data;

    const site = await supabase.from(TABLES.siteSettings).select("*").eq("id", 1).maybeSingle();
    if (!site.error) siteRow = site.data;

    const data = { ...(platformRow || {}), ...(siteRow || {}) };
    setValue("platformFee", data.platform_fee ?? data.fee ?? "");
    setValue("platformFeeType", data.platform_fee_type ?? data.fee_type ?? "percentage");
    setValue("feeEffectiveFrom", toLocalDateTime(data.effective_from ?? data.fee_effective_from));
    setValue("siteName", data.site_name ?? data.name ?? "");
    setValue("siteTagline", data.site_tagline ?? data.tagline ?? "");
    setValue("siteQuote", data.site_quote ?? data.quote ?? "");
  } catch (error) {
    console.error("Settings load error:", error);
    showToast(error?.message || "Could not load settings.");
  }
}

function buildSiteData() {
  const name = field("siteName")?.value.trim() || null;
  const tagline = field("siteTagline")?.value.trim() || null;
  const quote = field("siteQuote")?.value.trim() || null;

  // Existing schema in this project uses site_name + tagline + quote.
  // If newer column names are already present, use those instead.
  const data = { id: siteRow?.id ?? 1 };
  if (siteRow && Object.prototype.hasOwnProperty.call(siteRow, "site_name")) data.site_name = name;
  else if (siteRow && Object.prototype.hasOwnProperty.call(siteRow, "name")) data.name = name;
  else data.site_name = name;

  if (siteRow && Object.prototype.hasOwnProperty.call(siteRow, "site_tagline")) data.site_tagline = tagline;
  else data.tagline = tagline;

  if (siteRow && Object.prototype.hasOwnProperty.call(siteRow, "site_quote")) data.site_quote = quote;
  else data.quote = quote;
  return data;
}

function buildPlatformData() {
  const fee = Number(field("platformFee")?.value || 0);
  const feeType = field("platformFeeType")?.value || "percentage";
  const effective = field("feeEffectiveFrom")?.value;
  const data = {
    id: platformRow?.id ?? 1,
    platform_fee: fee,
    platform_fee_type: feeType,
    effective_from: effective ? new Date(effective).toISOString() : new Date().toISOString()
  };
  return data;
}

async function saveSettings(event) {
  event.preventDefault();
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; }

  try {
    const platformData = buildPlatformData();
    const siteData = buildSiteData();

    let platformSaved = false;
    if (platformRow || !siteRow) {
      const result = await supabase.from(TABLES.platformSettings).upsert(platformData, { onConflict: "id" });
      if (!result.error) platformSaved = true;
      else if (!siteRow) throw new Error(`Platform settings: ${result.error.message}`);
    }

    // If platform_settings does not exist, keep fee fields in site_settings.
    if (!platformSaved) {
      const existing = siteRow || {};
      const fallback = { id: existing.id ?? 1, ...siteData,
        platform_fee: platformData.platform_fee,
        platform_fee_type: platformData.platform_fee_type,
        effective_from: platformData.effective_from
      };
      const result = await supabase.from(TABLES.siteSettings).upsert(fallback, { onConflict: "id" });
      if (result.error) throw new Error(`Site settings: ${result.error.message}`);
    }

    if (platformSaved) {
      const result = await supabase.from(TABLES.siteSettings).upsert(siteData, { onConflict: "id" });
      if (result.error) throw new Error(`Site content: ${result.error.message}`);
    }

    showToast("Settings saved successfully ✓");
    await loadSettings();
  } catch (error) {
    console.error("Settings save error:", error);
    showToast(error?.message || "Could not save settings.");
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Changes"; }
  }
}

form?.addEventListener("submit", saveSettings);
window.addEventListener("admin-ready", loadSettings);
window.addEventListener("settings-requested", loadSettings);
