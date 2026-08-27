import {
    supabase
} from "./supabase.js";

import {
    requireAdmin,
    logoutAdmin
} from "./auth.js";

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const user =
            await requireAdmin();

        if (!user) return;

        await loadDashboard();

        setupLogout();
    }
);


/*
=========================================================
DASHBOARD
=========================================================
*/

async function loadDashboard() {

    try {

        /*
        -----------------------------------------------
        FARMERS
        -----------------------------------------------
        */

        const farmers =
            await getCount("farmers");

        setText(
            "farmersCount",
            farmers
        );


        /*
        -----------------------------------------------
        CUSTOMERS
        -----------------------------------------------
        */

        const customers =
            await getCount("customers");

        setText(
            "customersCount",
            customers
        );


        /*
        -----------------------------------------------
        DELIVERY BOYS
        -----------------------------------------------
        */

        const deliveryBoys =
            await getCount("delivery_boys");

        setText(
            "deliveryBoysCount",
            deliveryBoys
        );


        /*
        -----------------------------------------------
        EARNINGS
        -----------------------------------------------
        */

        await loadEarnings();


        /*
        -----------------------------------------------
        LAST UPDATED
        -----------------------------------------------
        */

        const updated =
            document.getElementById(
                "lastUpdated"
            );

        if (updated) {

            updated.textContent =
                "Updated just now";
        }

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

    }
}


/*
=========================================================
COUNT
=========================================================
*/

async function getCount(table) {

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
            `${table} count error:`,
            error
        );

        return 0;
    }

    return count || 0;
}


/*
=========================================================
EARNINGS
=========================================================

IMPORTANT:

This reads the orders table.

Only completed/delivered orders are counted.

It checks several possible amount column names
so the dashboard can work with the existing
Khet2Ghar database structure.
=========================================================
*/

async function loadEarnings() {

    const {
        data,
        error
    } = await supabase
        .from("orders")
        .select("*");

    if (error) {

        console.error(
            "Orders earnings error:",
            error
        );

        setText(
            "yearlyEarnings",
            "₹0"
        );

        setText(
            "monthlyEarnings",
            "₹0"
        );

        setText(
            "weeklyEarnings",
            "₹0"
        );

        return;
    }

    const orders =
        Array.isArray(data)
            ? data
            : [];

    const now = new Date();

    const currentYear =
        now.getFullYear();

    const currentMonth =
        now.getMonth();

    const weekStart =
        new Date(now);

    weekStart.setDate(
        now.getDate() -
        now.getDay()
    );

    weekStart.setHours(
        0,
        0,
        0,
        0
    );

    let yearly = 0;
    let monthly = 0;
    let weekly = 0;


    orders.forEach(order => {

        const status = String(
            order.order_status ||
            order.status ||
            ""
        ).toLowerCase();

        if (
            status !== "completed" &&
            status !== "delivered"
        ) {
            return;
        }

        const date =
            new Date(order.created_at);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return;
        }

        const amount = Number(
            order.total_amount ??
            order.subtotal ??
            order.amount ??
            order.total ??
            0
        );

        if (!Number.isFinite(amount)) {
            return;
        }


        /*
        YEAR
        */

        if (
            date.getFullYear() ===
            currentYear
        ) {
            yearly += amount;
        }


        /*
        MONTH
        */

        if (
            date.getFullYear() ===
                currentYear &&
            date.getMonth() ===
                currentMonth
        ) {
            monthly += amount;
        }


        /*
        WEEK
        */

        if (date >= weekStart) {
            weekly += amount;
        }

    });


    setText(
        "yearlyEarnings",
        formatRupees(yearly)
    );

    setText(
        "monthlyEarnings",
        formatRupees(monthly)
    );

    setText(
        "weeklyEarnings",
        formatRupees(weekly)
    );
}


/*
=========================================================
LOGOUT
=========================================================
*/

function setupLogout() {

    const button =
        document.getElementById(
            "logoutButton"
        );

    if (!button) return;

    button.addEventListener(
        "click",
        logoutAdmin
    );
}


/*
=========================================================
HELPERS
=========================================================
*/

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.textContent =
        value;
}
