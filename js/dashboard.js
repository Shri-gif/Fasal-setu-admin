import { supabase, TABLES } from "./supabase.js";

/* =========================================================
   FASAL SETU ADMIN — DASHBOARD
   ========================================================= */

const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function setText(id, value) {
    const el = $(id);
    if (el) {
        el.textContent = value;
    }
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

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
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

/* ---------------------------------------------------------
   Count rows
--------------------------------------------------------- */

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
    /*
     * FARMERS
     */
    const farmers = await countRows(
        "farmers"
    );

    setText(
        "farmersCount",
        farmers
    );

    /*
     * CUSTOMERS
     *
     * IMPORTANT:
     * Your actual customer role is "consumer".
     */
    const customers = await countRows(
        "profiles",
        [
            {
                column: "role",
                operator: "eq",
                value: "consumer",
            },
        ]
    );

    setText(
        "customersCount",
        customers
    );

    /*
     * DELIVERY BOYS
     *
     * Actual table:
     * delivery_partners
     */
    const deliveryBoys = await countRows(
        "delivery_partners"
    );

    setText(
        "deliveryBoysCount",
        deliveryBoys
    );

    /*
     * PRODUCTS
     */
    const products = await countRows(
        "products"
    );

    setText(
        "productsCount",
        products
    );
}

/* =========================================================
   ORDERS
   ========================================================= */

async function loadOrders() {
    /*
     * Fetch all orders.
     *
     * We deliberately use "*" because your project may
     * have order_status rather than status.
     */
    const {
        data,
        error,
    } = await supabase
        .from("orders")
        .select("*");

    if (error) {
        console.error(
            "Orders fetch error:",
            error
        );

        setText("totalOrders", 0);
        setText("pendingOrders", 0);
        setText("completedOrders", 0);

        return [];
    }

    const orders = Array.isArray(data)
        ? data
        : [];

    setText(
        "totalOrders",
        orders.length
    );

    let pending = 0;
    let completed = 0;

    for (const order of orders) {
        const status = String(
            order.order_status ??
            order.status ??
            ""
        )
            .trim()
            .toLowerCase();

        /*
         * Completed statuses
         */
        if (
            [
                "completed",
                "complete",
                "delivered",
                "success",
                "successful",
                "fulfilled",
            ].includes(status)
        ) {
            completed++;
            continue;
        }

        /*
         * Pending statuses
         */
        if (
            [
                "pending",
                "placed",
                "processing",
                "confirmed",
                "accepted",
                "out_for_delivery",
                "out for delivery",
            ].includes(status)
        ) {
            pending++;
        }
    }

    setText(
        "pendingOrders",
        pending
    );

    setText(
        "completedOrders",
        completed
    );

    return orders;
}

/* =========================================================
   EARNINGS
   ========================================================= */

function getOrderDate(order) {
    return (
        order.created_at ||
        order.order_date ||
        order.createdAt ||
        order.updated_at ||
        null
    );
}

function getOrderAmount(order) {
    /*
     * Prefer actual platform earning.
     *
     * If platform_fee exists, that is the admin earning.
     *
     * Otherwise fall back to common amount fields.
     */
    const platformFeeFields = [
        "platform_fee",
        "platformFee",
        "admin_fee",
        "adminFee",
        "commission",
        "commission_amount",
    ];

    for (const field of platformFeeFields) {
        if (
            order[field] !== undefined &&
            order[field] !== null &&
            order[field] !== ""
        ) {
            const amount = Number(
                order[field]
            );

            if (Number.isFinite(amount)) {
                return amount;
            }
        }
    }

    /*
     * Fallback.
     *
     * This is used only when no platform fee field
     * exists in the order row.
     */
    const amountFields = [
        "total_amount",
        "total",
        "grand_total",
        "amount",
        "order_total",
    ];

    for (const field of amountFields) {
        if (
            order[field] !== undefined &&
            order[field] !== null &&
            order[field] !== ""
        ) {
            const amount = Number(
                order[field]
            );

            if (Number.isFinite(amount)) {
                return amount;
            }
        }
    }

    return 0;
}

function isCompletedOrder(order) {
    const status = String(
        order.order_status ??
        order.status ??
        ""
    )
        .trim()
        .toLowerCase();

    return [
        "completed",
        "complete",
        "delivered",
        "success",
        "successful",
        "fulfilled",
    ].includes(status);
}

function getDateRange(type) {
    const now = new Date();

    const start = new Date(now);

    if (type === "week") {
        /*
         * Monday = beginning of week
         */
        const day = start.getDay();

        const difference =
            day === 0
                ? 6
                : day - 1;

        start.setDate(
            start.getDate() - difference
        );

        start.setHours(
            0,
            0,
            0,
            0
        );
    }

    if (type === "month") {
        start.setDate(1);

        start.setHours(
            0,
            0,
            0,
            0
        );
    }

    if (type === "year") {
        start.setMonth(0);
        start.setDate(1);

        start.setHours(
            0,
            0,
            0,
            0
        );
    }

    return {
        start,
        end: now,
    };
}

function calculateEarnings(
    orders,
    type
) {
    const {
        start,
        end,
    } = getDateRange(type);

    let total = 0;

    for (const order of orders) {
        if (!isCompletedOrder(order)) {
            continue;
        }

        const rawDate =
            getOrderDate(order);

        if (!rawDate) {
            continue;
        }

        const orderDate =
            new Date(rawDate);

        if (
            Number.isNaN(
                orderDate.getTime()
            )
        ) {
            continue;
        }

        if (
            orderDate >= start &&
            orderDate <= end
        ) {
            total += getOrderAmount(
                order
            );
        }
    }

    return total;
}

async function loadEarnings(orders) {
    const weekly =
        calculateEarnings(
            orders,
            "week"
        );

    const monthly =
        calculateEarnings(
            orders,
            "month"
        );

    const yearly =
        calculateEarnings(
            orders,
            "year"
        );

    setText(
        "weeklyEarnings",
        formatCurrency(weekly)
    );

    setText(
        "monthlyEarnings",
        formatCurrency(monthly)
    );

    setText(
        "yearlyEarnings",
        formatCurrency(yearly)
    );
}

/* =========================================================
   LAST UPDATED
   ========================================================= */

function updateLastUpdated() {
    setText(
        "lastUpdated",
        formatDateTime(
            new Date()
        )
    );
}

/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

export async function loadDashboard() {
    try {
        /*
         * Load counts and orders independently.
         *
         * One failed query should NOT stop the
         * entire dashboard from rendering.
         */
        await loadBasicCounts();

        const orders =
            await loadOrders();

        await loadEarnings(
            orders
        );

        updateLastUpdated();

    } catch (error) {
        console.error(
            "Dashboard loading error:",
            error
        );

        showToast(
            "Some dashboard data could not be loaded.",
            "error"
        );
    }
}

/* =========================================================
   REFRESH BUTTON
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const refreshButton =
            $("refreshDashboardBtn");

        if (refreshButton) {
            refreshButton.addEventListener(
                "click",
                async () => {
                    refreshButton.disabled = true;

                    const originalText =
                        refreshButton.textContent;

                    refreshButton.textContent =
                        "↻ Refreshing...";

                    await loadDashboard();

                    refreshButton.disabled =
                        false;

                    refreshButton.textContent =
                        originalText ||
                        "↻ Refresh";
                }
            );
        }

        /*
         * Initial dashboard load
         */
        loadDashboard();
    }
);
