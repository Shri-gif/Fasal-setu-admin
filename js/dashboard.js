import {
    supabase,
    TABLES,
    showToast
} from "./supabase.js";


/* =========================================================
   HELPERS
   ========================================================= */

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function money(value) {
    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}


/* =========================================================
   COUNT ROWS
   ========================================================= */

async function countRows(
    table,
    column = null,
    value = null
) {
    try {
        let query = supabase
            .from(table)
            .select("*", {
                count: "exact",
                head: true
            });

        if (
            column &&
            value !== null &&
            value !== undefined
        ) {
            query = query.eq(column, value);
        }

        const {
            count,
            error
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
   BASIC COUNTS
   ========================================================= */

async function loadBasicCounts() {

    /* -----------------------------------------------------
       FARMERS
       ----------------------------------------------------- */

    const farmers = await countRows(
        "farmers"
    );

    setText(
        "farmersCount",
        farmers
    );


    /* -----------------------------------------------------
       CUSTOMERS
       
       IMPORTANT:
       Customer accounts are stored in profiles.

       Actual customer role:
       customer
       ----------------------------------------------------- */

    const customers = await countRows(
        "profiles",
        "role",
        "customer"
    );

    setText(
        "customersCount",
        customers
    );


    /* -----------------------------------------------------
       DELIVERY BOYS

       Actual table:
       delivery_partners
       ----------------------------------------------------- */

    const deliveryBoys = await countRows(
        "delivery_partners"
    );

    setText(
        "deliveryBoysCount",
        deliveryBoys
    );


    /* -----------------------------------------------------
       PRODUCTS
       ----------------------------------------------------- */

    const products = await countRows(
        "products"
    );

    setText(
        "productsCount",
        products
    );
}


/* =========================================================
   ORDER STATUS
   ========================================================= */

function getOrderStatus(order) {

    return String(
        order.order_status ??
        order.status ??
        ""
    )
        .trim()
        .toLowerCase();
}


function isCompletedOrder(order) {

    const status = getOrderStatus(order);

    return [
        "completed",
        "complete",
        "delivered",
        "success",
        "successful",
        "fulfilled"
    ].includes(status);
}


function isPendingOrder(order) {

    const status = getOrderStatus(order);

    return [
        "pending",
        "placed",
        "processing",
        "confirmed",
        "accepted",
        "assigned",
        "out_for_delivery",
        "out for delivery"
    ].includes(status);
}


/* =========================================================
   ORDER DATE
   ========================================================= */

function getOrderDate(order) {

    return (
        order.created_at ??
        order.order_date ??
        order.createdAt ??
        order.updated_at ??
        null
    );
}


/* =========================================================
   ORDER AMOUNT
   ========================================================= */

function getOrderAmount(order) {

    /*
     * If the database has a specific platform/admin
     * earning field, use that first.
     */

    const platformFeeFields = [
        "platform_fee",
        "platformFee",
        "admin_fee",
        "adminFee",
        "commission",
        "commission_amount"
    ];


    for (const field of platformFeeFields) {

        const value = order[field];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const amount = Number(value);

            if (Number.isFinite(amount)) {
                return amount;
            }
        }
    }


    /*
     * Otherwise use the actual order total.
     */

    const amountFields = [
        "total_amount",
        "total",
        "grand_total",
        "order_total",
        "amount",
        "price"
    ];


    for (const field of amountFields) {

        const value = order[field];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const amount = Number(value);

            if (Number.isFinite(amount)) {
                return amount;
            }
        }
    }


    return 0;
}


/* =========================================================
   GET ORDERS
   ========================================================= */

async function loadOrders() {

    try {

        const {
            data,
            error
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


        /* -------------------------------------------------
           TOTAL ORDERS
           ------------------------------------------------- */

        setText(
            "totalOrders",
            orders.length
        );


        let pending = 0;
        let completed = 0;


        /* -------------------------------------------------
           STATUS COUNTS
           ------------------------------------------------- */

        for (const order of orders) {

            if (isCompletedOrder(order)) {

                completed++;

                continue;
            }


            if (isPendingOrder(order)) {

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
   DATE RANGE
   ========================================================= */

function getDateRange(type) {

    const now = new Date();

    const start = new Date(now);


    /* -----------------------------------------------------
       CURRENT WEEK

       Monday = first day
       ----------------------------------------------------- */

    if (type === "week") {

        const day = start.getDay();

        const difference =
            day === 0
                ? 6
                : day - 1;


        start.setDate(
            start.getDate() - difference
        );
    }


    /* -----------------------------------------------------
       CURRENT MONTH
       ----------------------------------------------------- */

    else if (type === "month") {

        start.setDate(1);
    }


    /* -----------------------------------------------------
       CURRENT YEAR
       ----------------------------------------------------- */

    else if (type === "year") {

        start.setMonth(0);
        start.setDate(1);
    }


    start.setHours(
        0,
        0,
        0,
        0
    );


    return start;
}


/* =========================================================
   CALCULATE EARNINGS
   ========================================================= */

function calculateEarnings(
    orders,
    period
) {

    const start = getDateRange(
        period
    );


    let total = 0;


    for (const order of orders) {

        /*
         * Earnings are counted only for
         * completed/delivered orders.
         */

        if (!isCompletedOrder(order)) {
            continue;
        }


        const dateValue =
            getOrderDate(order);


        if (!dateValue) {
            continue;
        }


        const orderDate =
            new Date(dateValue);


        if (
            Number.isNaN(
                orderDate.getTime()
            )
        ) {
            continue;
        }


        if (orderDate < start) {
            continue;
        }


        total += getOrderAmount(
            order
        );
    }


    return total;
}


/* =========================================================
   LOAD EARNINGS
   ========================================================= */

function loadEarnings(orders) {

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
        money(weekly)
    );


    setText(
        "monthlyEarnings",
        money(monthly)
    );


    setText(
        "yearlyEarnings",
        money(yearly)
    );
}


/* =========================================================
   MAIN DASHBOARD
   ========================================================= */

async function loadDashboard() {

    try {

        /*
         * Load basic counts and orders
         * together.
         */

        const [
            _basicCounts,
            orders
        ] = await Promise.all([
            loadBasicCounts(),
            loadOrders()
        ]);


        /* -------------------------------------------------
           EARNINGS
           ------------------------------------------------- */

        loadEarnings(
            orders
        );


        /* -------------------------------------------------
           LAST UPDATED
           ------------------------------------------------- */

        setText(
            "lastUpdated",
            `Updated ${new Date().toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            )}`
        );


    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showToast(
            "Could not load dashboard data."
        );
    }
}


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

document
    .getElementById(
        "refreshDashboardBtn"
    )
    ?.addEventListener(
        "click",
        async () => {

            await loadDashboard();
        }
    );


/* =========================================================
   ADMIN READY
   ========================================================= */

window.addEventListener(
    "admin-ready",
    async () => {

        await loadDashboard();
    }
);


/* =========================================================
   DASHBOARD REQUESTED
   ========================================================= */

window.addEventListener(
    "dashboard-requested",
    async () => {

        await loadDashboard();
    }
);
