import { supabase } from "./supabase.js";

/* =========================================================
   FASAL SETU ADMIN — DASHBOARD
   COMPLETE CORRECTED VERSION
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   BASIC HELPERS
========================================================= */

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
    if (!date) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "success") {
    const toast = $("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}


/* =========================================================
   SAFE ROW COUNT

   IMPORTANT:
   Agar ek table me RLS / schema / permission error aaye,
   to dashboard ke baaki sections par koi effect nahi hoga.
========================================================= */

async function countRows(table, filters = []) {
    try {
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

            if (filter.operator === "in") {
                query = query.in(
                    filter.column,
                    filter.value
                );
            }
        }

        const {
            count,
            error,
        } = await query;

        if (error) {
            console.error(
                `Count error for ${table}:`,
                error
            );

            return 0;
        }

        return Number(count || 0);

    } catch (error) {
        console.error(
            `Count exception for ${table}:`,
            error
        );

        return 0;
    }
}


/* =========================================================
   FARMER COUNT
========================================================= */

async function loadFarmersCount() {
    const farmers = await countRows(
        "farmers"
    );

    setText(
        "farmersCount",
        farmers
    );

    return farmers;
}


/* =========================================================
   CUSTOMER COUNT

   ACTUAL SUPABASE ROLE:
   customer

   Older data may contain:
   consumer

   Isliye pehle customer check hoga.
   Agar 0 ho to consumer fallback check hoga.
========================================================= */

async function loadCustomersCount() {

    let customers = await countRows(
        "profiles",
        [
            {
                column: "role",
                operator: "eq",
                value: "customer",
            },
        ]
    );


    /*
     * Backward compatibility
     *
     * Agar purane rows me consumer role hai
     */
    if (customers === 0) {

        customers = await countRows(
            "profiles",
            [
                {
                    column: "role",
                    operator: "eq",
                    value: "consumer",
                },
            ]
        );
    }


    setText(
        "customersCount",
        customers
    );

    return customers;
}


/* =========================================================
   DELIVERY PARTNER COUNT

   Actual table:
   delivery_partners
========================================================= */

async function loadDeliveryPartnersCount() {

    const deliveryBoys = await countRows(
        "delivery_partners"
    );


    setText(
        "deliveryBoysCount",
        deliveryBoys
    );

    return deliveryBoys;
}


/* =========================================================
   PRODUCTS COUNT
========================================================= */

async function loadProductsCount() {

    const products = await countRows(
        "products"
    );


    setText(
        "productsCount",
        products
    );

    return products;
}


/* =========================================================
   LOAD BASIC COUNTS

   VERY IMPORTANT:

   Promise.allSettled is used so that:

   farmers error
        ↓
   does NOT stop customers

   customers error
        ↓
   does NOT stop products

   delivery error
        ↓
   does NOT stop the entire dashboard
========================================================= */

async function loadBasicCounts() {

    const results = await Promise.allSettled([
        loadFarmersCount(),
        loadCustomersCount(),
        loadDeliveryPartnersCount(),
        loadProductsCount(),
    ]);


    results.forEach(
        (result, index) => {

            if (result.status === "rejected") {

                const sectionNames = [
                    "Farmers",
                    "Customers",
                    "Delivery Partners",
                    "Products",
                ];

                console.error(
                    `${sectionNames[index]} dashboard section failed:`,
                    result.reason
                );
            }
        }
    );
}


/* =========================================================
   ORDERS
========================================================= */

async function loadOrders() {

    try {

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


            setText(
                "totalOrders",
                0
            );

            setText(
                "pendingOrders",
                0
            );

            setText(
                "completedOrders",
                0
            );


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


            /* ---------------------------------------------
               COMPLETED
            --------------------------------------------- */

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


            /* ---------------------------------------------
               PENDING
            --------------------------------------------- */

            if (
                [
                    "pending",
                    "placed",
                    "processing",
                    "confirmed",
                    "accepted",
                    "assigned",
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

    } catch (error) {

        console.error(
            "Orders loading exception:",
            error
        );


        setText(
            "totalOrders",
            0
        );

        setText(
            "pendingOrders",
            0
        );

        setText(
            "completedOrders",
            0
        );


        return [];
    }
}


/* =========================================================
   ORDER STATUS
========================================================= */

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


/* =========================================================
   ORDER DATE
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


/* =========================================================
   ACTUAL PLATFORM EARNING

   IMPORTANT:

   Yahan order total ko earning NAHI maana jayega.

   Example:

   Order total = ₹500
   Platform fee = ₹50

   Admin earning = ₹50

   NOT ₹500
========================================================= */

function getPlatformEarning(order) {


    /*
     * Possible actual platform earning columns
     *
     * Existing order data me jo field hogi,
     * wahi use hogi.
     */

    const platformFeeFields = [

        "platform_fee",

        "platform_earning",

        "platform_earnings",

        "admin_fee",

        "commission",

        "commission_amount",

        "admin_commission",

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


            if (
                Number.isFinite(amount)
            ) {

                return amount;
            }
        }
    }


    /*
     * IMPORTANT:

     * Agar order me platform fee field nahi hai,
     * to earning ₹0 hi hogi.

     * Order ka total amount use nahi karenge.
     *
     * This prevents:
     *
     * ₹240 order sales
     * being incorrectly shown as
     * ₹240 admin earnings.
     */

    return 0;
}


/* =========================================================
   DATE RANGE
========================================================= */

function getDateRange(type) {

    const now = new Date();


    const start = new Date(now);


    /* ---------------------------------------------
       WEEK
       Monday to today
    --------------------------------------------- */

    if (type === "week") {

        const day = start.getDay();


        const difference =
            day === 0
                ? 6
                : day - 1;


        start.setDate(
            start.getDate() -
            difference
        );


        start.setHours(
            0,
            0,
            0,
            0
        );
    }


    /* ---------------------------------------------
       MONTH
    --------------------------------------------- */

    if (type === "month") {

        start.setDate(1);


        start.setHours(
            0,
            0,
            0,
            0
        );
    }


    /* ---------------------------------------------
       YEAR
    --------------------------------------------- */

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


/* =========================================================
   CALCULATE PLATFORM EARNINGS
========================================================= */

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


        /*
         * Only completed orders count as earnings
         */
        if (
            !isCompletedOrder(order)
        ) {
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


        /*
         * Order must be inside
         * requested period
         */
        if (
            orderDate >= start &&
            orderDate <= end
        ) {

            const platformEarning =
                getPlatformEarning(order);


            total += platformEarning;
        }
    }


    return total;
}


/* =========================================================
   LOAD EARNINGS
========================================================= */

async function loadEarnings(orders) {

    try {

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

    } catch (error) {

        console.error(
            "Earnings calculation error:",
            error
        );


        setText(
            "weeklyEarnings",
            "₹0"
        );


        setText(
            "monthlyEarnings",
            "₹0"
        );


        setText(
            "yearlyEarnings",
            "₹0"
        );
    }
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
   MAIN DASHBOARD LOADER
========================================================= */

export async function loadDashboard() {

    try {


        /*
         * Start with counts
         *
         * Each count has independent error handling
         */
        await loadBasicCounts();


        /*
         * Load order rows
         */
        const orders =
            await loadOrders();


        /*
         * Calculate actual platform earnings
         *
         * ONLY platform_fee / commission
         * NOT order total
         */
        await loadEarnings(
            orders
        );


        /*
         * Update timestamp
         */
        updateLastUpdated();


    } catch (error) {


        /*
         * This is the final safety net.
         */
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


                    refreshButton.disabled =
                        true;


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
