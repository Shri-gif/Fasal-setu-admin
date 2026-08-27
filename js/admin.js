import {
    supabase
} from "./supabase.js";

import {
    requireAdmin,
    logoutAdmin
} from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await requireAdmin();

    if (!user) return;

    setupAdminUI(user);
});

function setupAdminUI(user) {

    const emailElement =
        document.getElementById("adminEmail");

    if (emailElement) {
        emailElement.textContent =
            user.email || "Admin";
    }

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logoutAdmin
        );
    }
}

/*
=========================================================
COMMON ADMIN HELPERS
=========================================================
*/

export function showToast(message, type = "success") {

    let toast =
        document.getElementById("adminToast");

    if (!toast) {

        toast = document.createElement("div");

        toast.id = "adminToast";

        toast.className = "admin-toast";

        document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.dataset.type = type;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


export function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("en-IN");
}


export function formatRupees(value) {

    return "₹" +
        Number(value || 0)
            .toLocaleString("en-IN");
}


/*
=========================================================
SAFE DATABASE COUNT
=========================================================
*/

export async function getTableCount(table) {

    const {
        count,
        error
    } = await supabase
        .from(table)
        .select("*", {
            count: "exact",
            head: true
        });

    if (error) {
        console.error(
            `Count error (${table}):`,
            error
        );

        return 0;
    }

    return count || 0;
}


/*
=========================================================
GENERIC SETTINGS UPDATE
=========================================================
*/

export async function updateSetting(
    id,
    values
) {

    const {
        data,
        error
    } = await supabase
        .from("site_settings")
        .update(values)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error(
            "Settings update error:",
            error
        );

        showToast(
            error.message ||
            "Unable to update settings.",
            "error"
        );

        return null;
    }

    showToast(
        "Settings updated successfully."
    );

    return data;
}
