import { supabase, TABLES, showToast } from "./supabase.js";

const form = document.getElementById("settingsForm");
const saveBtn = document.getElementById("saveSettingsBtn");

const fields = {
  fee: document.getElementById("platformFee"),
  feeType: document.getElementById("platformFeeType"),
  effective: document.getElementById("feeEffectiveFrom"),
  name: document.getElementById("siteName"),
  tagline: document.getElementById("siteTagline"),
  quote: document.getElementById("siteQuote")
};

function fill(data = {}) {
  fields.fee.value = data.platform_fee ?? data.fee ?? "";
  fields.feeType.value = data.platform_fee_type ?? data.fee_type ?? "percentage";
  if (data.effective_from) fields.effective.value = String(data.effective_from).slice(0,16);
  fields.name.value = data.site_name ?? data.name ?? "";
  fields.tagline.value = data.site_tagline ?? data.tagline ?? "";
  fields.quote.value = data.site_quote ?? data.quote ?? "";
}

async function loadSettings() {
  try {
    let platform = {};
    let site = {};

    const p = await supabase.from(TABLES.platformSettings).select("*").eq("id", 1).maybeSingle();
    if (!p.error && p.data) platform = p.data;

    const s = await supabase.from(TABLES.siteSettings).select("*").eq("id", 1).maybeSingle();
    if (!s.error && s.data) site = s.data;

    fill({ ...platform, ...site });
  } catch (error) {
    console.error(error);
  }
}

async function saveSettings(event) {
  event.preventDefault();
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const platformData = {
    id: 1,
    platform_fee: Number(fields.fee.value || 0),
    platform_fee_type: fields.feeType.value,
    effective_from: fields.effective.value ? new Date(fields.effective.value).toISOString() : new Date().toISOString()
  };

  const siteData = {
    id: 1,
    site_name: fields.name.value.trim(),
    site_tagline: fields.tagline.value.trim(),
    site_quote: fields.quote.value.trim()
  };

  try {
    const platformResult = await supabase.from(TABLES.platformSettings).upsert(platformData, { onConflict: "id" });
    if (platformResult.error) throw new Error(`Platform settings: ${platformResult.error.message}`);

    const siteResult = await supabase.from(TABLES.siteSettings).upsert(siteData, { onConflict: "id" });
    if (siteResult.error) throw new Error(`Site settings: ${siteResult.error.message}`);

    showToast("Settings saved successfully.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not save settings.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}

form?.addEventListener("submit", saveSettings);
window.addEventListener("admin-ready", loadSettings);
window.addEventListener("settings-requested", loadSettings);
