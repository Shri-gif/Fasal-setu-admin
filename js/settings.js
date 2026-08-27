import { supabase } from "./supabase.js";
import { requireAdmin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await requireAdmin();
    if (!user) return;

    await loadSettings();
    setupSettingsForm();
});

/*
=========================================================
LOAD SETTINGS
=========================================================
*/

async function loadSettings() {
    try {
        const {
            data,
            error
        } = await supabase
            .from("site_settings")
            .select("*")
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            console.warn("No site_settings row found.");
            return;
        }

        setValue("siteName", data.site_name);
        setValue("siteTagline", data.tagline);
        setValue("siteQuote", data.quote);
        setValue("platformFee", data.platform_fee);
    } catch (error) {
        console.error("Settings load error:", error);
        showMessage(
            error.message || "Could not load settings.",
            "error"
        );
    }
}

/*
=========================================================
SETTINGS FORM
=========================================================
*/

function setupSettingsForm() {
    const form = document.getElementById("settingsForm");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const siteName =
            document.getElementById("siteName")?.value.trim();

        const tagline =
            document.getElementById("siteTagline")?.value.trim();

        const quote =
            document.getElementById("siteQuote")?.value.trim();

        const platformFee =
            document.getElementById("platformFee")?.value;

        const saveButton =
            document.getElementById("saveSettingsButton");

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        try {
            const {
                data: existing,
                error: findError
            } = await supabase
                .from("site_settings")
                .select("id")
                .limit(1)
                .maybeSingle();

            if (findError) {
                throw findError;
            }

            const values = {
                site_name: siteName || null,
                tagline: tagline || null,
                quote: quote || null,
                platform_fee:
                    platformFee === ""
                        ? null
                        : Number(platformFee),
                updated_at: new Date().toISOString()
            };

            let result;

            if (existing?.id) {
                result = await supabase
                    .from("site_settings")
                    .update(values)
                    .eq("id", existing.id)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from("site_settings")
                    .insert(values)
                    .select()
                    .single();
            }

            if (result.error) {
                throw result.error;
            }

            showMessage(
                "Settings updated successfully ✓",
                "success"
            );

        } catch (error) {
            console.error(
                "Settings save error:",
                error
            );

            showMessage(
                error.message ||
                    "Could not save settings.",
                "error"
            );
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Save Changes";
            }
        }
    });
}

/*
=========================================================
HELPERS
=========================================================
*/

function setValue(id, value) {
    const element =
        document.getElementById(id);

    if (!element) return;

    element.value =
        value ?? "";
}

function showMessage(message, type) {
    const element =
        document.getElementById("settingsMessage");

    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
    element.classList.add("show");

    setTimeout(() => {
        element.classList.remove("show");
    }, 3000);
}
