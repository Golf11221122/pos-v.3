import { supabase } from './supabase.js'
import { applyRoleGuard } from './role-guard.js?v=3.12.0'


/* ========================================
   ELEMENTS
======================================== */

const elements = {

    logoutBtn:
        document.getElementById(
            'logoutBtn'
        ),

    menuToggle:
        document.getElementById(
            'menuToggle'
        ),

    sidebar:
        document.getElementById(
            'sidebar'
        ),

    sidebarOverlay:
        document.getElementById('sidebarOverlay'),

    managementToggle:
        document.getElementById('managementToggle'),

    managementMenu:
        document.getElementById('managementMenu'),

    currentDate:
        document.getElementById(
            'currentDate'
        ),


    /* USER */

    userAvatar:
        document.getElementById(
            'userAvatar'
        ),

    userName:
        document.getElementById(
            'userName'
        ),

    userRole:
        document.getElementById(
            'userRole'
        ),

    welcomeName:
        document.getElementById(
            'welcomeName'
        ),

    userEmail:
        document.getElementById(
            'userEmail'
        ),

    profileName:
        document.getElementById(
            'profileName'
        ),

    profileRole:
        document.getElementById(
            'profileRole'
        ),

    profileBranch:
        document.getElementById(
            'profileBranch'
        ),


    /* TODAY SUMMARY */

    todaySales:
        document.getElementById(
            'todaySales'
        ),

    todayBills:
        document.getElementById(
            'todayBills'
        ),

    todayCash:
        document.getElementById(
            'todayCash'
        ),

    todayQr:
        document.getElementById(
            'todayQr'
        ),


    /* BUSINESS SUMMARY */

    monthSales:
        document.getElementById(
            'monthSales'
        ),

    todayProfit:
        document.getElementById(
            'todayProfit'
        ),

    productCount:
        document.getElementById(
            'productCount'
        ),

    categoryCount:
        document.getElementById(
            'categoryCount'
        ),


    /* REPORT */

    sevenDayChart:
        document.getElementById(
            'sevenDayChart'
        ),

    topProducts:
        document.getElementById(
            'topProducts'
        ),


    /* STATUS */

    statusMessage:
        document.getElementById(
            'statusMessage'
        ),

    refreshDashboardBtn:
        document.getElementById(
            'refreshDashboardBtn'
        ),


    /* QUICK ACTION */

    openPosBtn:
        document.getElementById(
            'openPosBtn'
        ),

    openProductsBtn:
        document.getElementById(
            'openProductsBtn'
        ),

    openSalesBtn:
        document.getElementById(
            'openSalesBtn'
        ),

    openSalesReportBtn:
        document.getElementById(
            'openSalesReportBtn'
        ),

    openReportsBtn:
        document.getElementById(
            'openReportsBtn'
        ),


    /* MENU */

    settingsMenu:
        document.getElementById(
            'settingsMenu'
        )
}


/* ========================================
   STATE
======================================== */

const state = {

    session: null,

    profile: null,

    branch: null,

    role: null,

    sales: [],

    saleItems: []
}


/* ========================================
   HELPERS
======================================== */

function money(value) {

    return new Intl.NumberFormat(
        'th-TH',
        {
            style:
                'currency',

            currency:
                'THB',

            minimumFractionDigits:
                2
        }
    ).format(
        Number(
            value || 0
        )
    )
}


/* ========================================
   STATUS MESSAGE
======================================== */

function showStatus(
    message = '',
    isError = true
) {

    if (
        !elements.statusMessage
    ) {
        return
    }


    elements.statusMessage.textContent =
        message


    elements.statusMessage.style.color =
        isError
            ? '#d93025'
            : '#188038'
}


/* ========================================
   ROLE TEXT
======================================== */

function formatRole(role) {

    const roles = {

        admin:
            'ผู้ดูแลระบบ',

        manager:
            'ผู้จัดการ',

        staff:
            'พนักงานขาย',

        cashier:
            'พนักงานขาย',

        kitchen:
            'พนักงานครัว'
    }


    return (
        roles[role]
        ||
        role
        ||
        'ผู้ใช้งาน'
    )
}


/* ========================================
   CURRENT DATE
======================================== */

function setCurrentDate() {

    const date =
        new Date()


    if (
        !elements.currentDate
    ) {
        return
    }


    elements.currentDate.textContent =
        date.toLocaleDateString(
            'th-TH',
            {
                weekday:
                    'long',

                day:
                    'numeric',

                month:
                    'long',

                year:
                    'numeric'
            }
        )
}


/* ========================================
   DATE HELPERS
======================================== */

function startOfToday() {

    const date =
        new Date()


    date.setHours(
        0,
        0,
        0,
        0
    )


    return date
}


function startOfMonth() {

    const now =
        new Date()


    return new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0
    )
}


function startOfSevenDays() {

    const date =
        startOfToday()


    date.setDate(
        date.getDate() - 6
    )


    return date
}


/* ========================================
   SALE STATUS
======================================== */

function isCompleted(sale) {

    return (
        sale.status
        !==
        'cancelled'
    )
}


/* ========================================
   SESSION
======================================== */

async function getCurrentSession() {

    const {
        data: {
            session
        },
        error
    } =
        await supabase
            .auth
            .getSession()


    if (error) {
        throw error
    }


    if (!session) {

        window.location.replace(
            './index.html'
        )


        return null
    }


    state.session =
        session


    return session
}


/* ========================================
   PROFILE
======================================== */

async function getProfile(
    userId
) {

    const {
        data,
        error
    } =
        await supabase
            .from(
                'profiles'
            )
            .select(
                `
                id,
                full_name,
                role,
                branch_id
                `
            )
            .eq(
                'id',
                userId
            )
            .maybeSingle()


    if (error) {

        console.error(
            'Profile error:',
            error
        )


        throw error
    }


    if (!data) {

        throw new Error(
            'ไม่พบข้อมูลผู้ใช้งานใน profiles'
        )
    }


    state.profile =
        data


    return data
}


/* ========================================
   BRANCH
======================================== */

async function getBranch(
    branchId
) {

    if (!branchId) {

        throw new Error(
            'บัญชียังไม่ได้กำหนดสาขา'
        )
    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                'branches'
            )
            .select(
                'id,name'
            )
            .eq(
                'id',
                branchId
            )
            .maybeSingle()


    if (error) {
        throw error
    }


    if (!data) {

        throw new Error(
            'ไม่พบข้อมูลสาขา'
        )
    }


    state.branch =
        data


    return data
}


/* ========================================
   USER DISPLAY
======================================== */

function displayUser(
    user,
    profile,
    branch
) {

    const fullName =

        profile
            ?.full_name
            ?.trim()

        ||

        user
            .email
            ?.split('@')[0]

        ||

        'ผู้ใช้งาน'


    const roleText =
        formatRole(
            profile?.role
        )


    const branchText =
        branch?.name
        ||
        'ยังไม่ได้กำหนดสาขา'


    if (
        elements.userEmail
    ) {

        elements.userEmail.textContent =
            user.email || '-'
    }


    if (
        elements.profileName
    ) {

        elements.profileName.textContent =
            fullName
    }


    if (
        elements.profileRole
    ) {

        elements.profileRole.textContent =
            roleText
    }


    if (
        elements.profileBranch
    ) {

        elements.profileBranch.textContent =
            branchText
    }


    if (
        elements.userName
    ) {

        elements.userName.textContent =
            fullName
    }


    if (
        elements.userRole
    ) {

        elements.userRole.textContent =
            roleText
    }


    if (
        elements.welcomeName
    ) {

        elements.welcomeName.textContent =
            fullName
    }


    if (
        elements.userAvatar
    ) {

        elements.userAvatar.textContent =
            fullName
                .charAt(0)
                .toUpperCase()
    }
}


/* ========================================
   TABLE COUNT
======================================== */

async function getTableCount(
    tableName,
    branchId
) {

    let query =
        supabase
            .from(
                tableName
            )
            .select(
                '*',
                {
                    count:
                        'exact',

                    head:
                        true
                }
            )


    if (branchId) {

        query =
            query.eq(
                'branch_id',
                branchId
            )
    }


    const {
        count,
        error
    } =
        await query


    if (error) {

        console.warn(
            `${tableName} count error:`,
            error
        )


        return 0
    }


    return count || 0
}


/* ========================================
   LOAD SALES
======================================== */

async function loadSales(
    role
) {

    const sevenDaysAgo =
        startOfSevenDays()


    const monthStart =
        startOfMonth()


    /*
     * Staff
     * ใช้แค่วันนี้ + 7 วันย้อนหลัง
     *
     * Manager / Admin
     * ใช้ข้อมูลเดือนด้วย
     */
    const earliest =

        role === 'staff'

            ? sevenDaysAgo

            : (
                sevenDaysAgo <
                    monthStart

                    ? sevenDaysAgo

                    : monthStart
            )


    const {
        data,
        error
    } =
        await supabase
            .from(
                'sales'
            )
            .select(
                `
                id,
                invoice_no,
                branch_id,
                subtotal,
                discount,
                total,
                payment_method,
                received_amount,
                change_amount,
                status,
                created_at
                `
            )
            .eq(
                'branch_id',
                state.profile.branch_id
            )
            .gte(
                'created_at',
                earliest.toISOString()
            )
            .order(
                'created_at',
                {
                    ascending:
                        false
                }
            )


    if (error) {

        console.error(
            'Sales error:',
            error
        )


        throw error
    }


    state.sales =
        data || []
}


/* ========================================
   LOAD SALE ITEMS
======================================== */

async function loadSaleItems() {

    const todaySales =
        state.sales.filter(
            sale => {

                return (
                    isCompleted(
                        sale
                    )
                    &&
                    new Date(
                        sale.created_at
                    )
                    >=
                    startOfToday()
                )
            }
        )


    const sevenDaySales =
        state.sales.filter(
            sale => {

                return (
                    isCompleted(
                        sale
                    )
                    &&
                    new Date(
                        sale.created_at
                    )
                    >=
                    startOfSevenDays()
                )
            }
        )


    const saleIds = [

        ...new Set(

            [
                ...todaySales,
                ...sevenDaySales
            ]
                .map(
                    sale =>
                        sale.id
                )
        )

    ]


    if (
        saleIds.length ===
        0
    ) {

        state.saleItems =
            []


        return
    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                'sale_items'
            )
            .select(
                `
                id,
                sale_id,
                product_id,
                product_name,
                quantity,
                unit_price,
                unit_cost,
                total_price
                `
            )
            .in(
                'sale_id',
                saleIds
            )


    if (error) {

        console.error(
            'Sale items error:',
            error
        )


        throw error
    }


    state.saleItems =
        data || []
}


/* ========================================
   TODAY SUMMARY
======================================== */

function renderTodaySummary() {

    const today =
        startOfToday()


    const sales =
        state.sales.filter(
            sale => {

                return (
                    isCompleted(
                        sale
                    )
                    &&
                    new Date(
                        sale.created_at
                    )
                    >=
                    today
                )
            }
        )


    const total =
        sales.reduce(
            (
                sum,
                sale
            ) =>

                sum +
                Number(
                    sale.total || 0
                ),

            0
        )


    const cash =
        sales
            .filter(
                sale =>
                    sale.payment_method
                    ===
                    'cash'
            )
            .reduce(
                (
                    sum,
                    sale
                ) =>

                    sum +
                    Number(
                        sale.total || 0
                    ),

                0
            )


    const qr =
        sales
            .filter(
                sale =>
                    sale.payment_method
                    ===
                    'qr'
            )
            .reduce(
                (
                    sum,
                    sale
                ) =>

                    sum +
                    Number(
                        sale.total || 0
                    ),

                0
            )


    if (
        elements.todaySales
    ) {

        elements.todaySales.textContent =
            money(
                total
            )
    }


    if (
        elements.todayBills
    ) {

        elements.todayBills.textContent =
            sales
                .length
                .toLocaleString(
                    'th-TH'
                )
    }


    if (
        elements.todayCash
    ) {

        elements.todayCash.textContent =
            money(
                cash
            )
    }


    if (
        elements.todayQr
    ) {

        elements.todayQr.textContent =
            money(
                qr
            )
    }
}


/* ========================================
   MONTH SALES
======================================== */

function renderMonthSales() {

    const month =
        startOfMonth()


    const amount =
        state.sales
            .filter(
                sale => {

                    return (
                        isCompleted(
                            sale
                        )
                        &&
                        new Date(
                            sale.created_at
                        )
                        >=
                        month
                    )
                }
            )
            .reduce(
                (
                    sum,
                    sale
                ) =>

                    sum +
                    Number(
                        sale.total || 0
                    ),

                0
            )


    if (
        elements.monthSales
    ) {

        elements.monthSales.textContent =
            money(
                amount
            )
    }
}


/* ========================================
   TODAY PROFIT
======================================== */

function renderTodayProfit() {

    const today =
        startOfToday()


    const todaySaleIds =
        new Set(

            state.sales
                .filter(
                    sale => {

                        return (
                            isCompleted(
                                sale
                            )
                            &&
                            new Date(
                                sale.created_at
                            )
                            >=
                            today
                        )
                    }
                )
                .map(
                    sale =>
                        sale.id
                )
        )


    let revenue =
        0


    let cost =
        0


    for (
        const item
        of
        state.saleItems
    ) {

        if (
            !todaySaleIds.has(
                item.sale_id
            )
        ) {

            continue
        }


        const quantity =
            Number(
                item.quantity || 0
            )


        revenue +=
            Number(
                item.total_price || 0
            )


        cost +=
            Number(
                item.unit_cost || 0
            )
            *
            quantity
    }


    const profit =
        revenue -
        cost


    if (
        elements.todayProfit
    ) {

        elements.todayProfit.textContent =
            money(
                profit
            )
    }
}


/* ========================================
   7 DAY CHART
======================================== */

function renderSevenDayChart() {

    if (
        !elements.sevenDayChart
    ) {
        return
    }


    const days =
        []


    const start =
        startOfSevenDays()


    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const day =
            new Date(
                start
            )


        day.setDate(
            start.getDate() +
            i
        )


        const next =
            new Date(
                day
            )


        next.setDate(
            next.getDate() +
            1
        )


        const total =
            state.sales
                .filter(
                    sale => {

                        const created =
                            new Date(
                                sale.created_at
                            )


                        return (
                            isCompleted(
                                sale
                            )
                            &&
                            created >=
                            day
                            &&
                            created <
                            next
                        )
                    }
                )
                .reduce(
                    (
                        sum,
                        sale
                    ) =>

                        sum +
                        Number(
                            sale.total || 0
                        ),

                    0
                )


        days.push({

            date:
                day,

            total:
                total

        })
    }


    const max =
        Math.max(

            ...days.map(
                day =>
                    day.total
            ),

            1
        )


    elements.sevenDayChart.innerHTML =
        days
            .map(
                day => {

                    const height =

                        day.total > 0

                            ? Math.max(
                                (
                                    day.total /
                                    max
                                )
                                *
                                100,
                                4
                            )

                            : 2


                    const label =
                        day.date
                            .toLocaleDateString(
                                'th-TH',
                                {
                                    day:
                                        'numeric',

                                    month:
                                        'short'
                                }
                            )


                    return `

                        <div
                            class="
                                chart-column
                            "
                        >

                            <div
                                class="
                                    chart-value
                                "
                            >

                                ${day.total > 0

                            ? Math.round(
                                day.total
                            )
                                .toLocaleString(
                                    'th-TH'
                                )

                            : '0'
                        }

                            </div>


                            <div
                                class="
                                    chart-bar-wrap
                                "
                            >

                                <div
                                    class="
                                        chart-bar
                                    "

                                    style="
                                        height:
                                        ${height}%;
                                    "

                                    title="${money(
                            day.total
                        )
                        }"
                                >
                                </div>

                            </div>


                            <div
                                class="
                                    chart-label
                                "
                            >

                                ${label}

                            </div>

                        </div>

                    `
                }
            )
            .join('')
}


/* ========================================
   TOP PRODUCTS
======================================== */

function renderTopProducts() {

    if (
        !elements.topProducts
    ) {
        return
    }


    const validSaleIds =
        new Set(

            state.sales
                .filter(
                    sale => {

                        return (
                            isCompleted(
                                sale
                            )
                            &&
                            new Date(
                                sale.created_at
                            )
                            >=
                            startOfSevenDays()
                        )
                    }
                )
                .map(
                    sale =>
                        sale.id
                )
        )


    const productMap =
        new Map()


    for (
        const item
        of
        state.saleItems
    ) {

        if (
            !validSaleIds.has(
                item.sale_id
            )
        ) {

            continue
        }


        const key =
            item.product_id
            ||
            item.product_name


        if (!key) {
            continue
        }


        const old =
            productMap.get(
                key
            )
            ||
            {

                name:
                    item.product_name
                    ||
                    'สินค้า',

                quantity:
                    0,

                total:
                    0

            }


        old.quantity +=
            Number(
                item.quantity || 0
            )


        old.total +=
            Number(
                item.total_price || 0
            )


        productMap.set(
            key,
            old
        )
    }


    const top =
        [
            ...productMap.values()
        ]
            .sort(
                (
                    a,
                    b
                ) =>

                    b.quantity -
                    a.quantity
            )
            .slice(
                0,
                5
            )


    if (
        top.length ===
        0
    ) {

        elements.topProducts.innerHTML =
            `
            <div class="chart-empty">
                ยังไม่มีข้อมูลการขาย
            </div>
            `


        return
    }


    elements.topProducts.innerHTML =
        top
            .map(
                (
                    product,
                    index
                ) => `

                    <div
                        class="
                            top-product
                        "
                    >

                        <div
                            class="
                                top-rank
                            "
                        >

                            ${index + 1}

                        </div>


                        <div
                            class="
                                top-info
                            "
                        >

                            <strong>

                                ${escapeHtml(
                    product.name
                )
                    }

                            </strong>


                            <small>

                                ยอดขาย

                                ${money(
                        product.total
                    )
                    }

                            </small>

                        </div>


                        <div
                            class="
                                top-qty
                            "
                        >

                            ${product
                        .quantity
                        .toLocaleString(
                            'th-TH'
                        )
                    }

                        </div>

                    </div>

                `
            )
            .join('')
}


/* ========================================
   ESCAPE HTML
======================================== */

function escapeHtml(value) {

    return String(
        value ?? ''
    )
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
        )
}


/* ========================================
   DASHBOARD ROLE VIEW
======================================== */

function applyDashboardRoleView(
    role
) {

    /*
     * ================================
     * ADMIN / MANAGER
     * ================================
     *
     * แสดง Dashboard เต็ม
     */

    if (
        role !==
        'staff'
    ) {

        return
    }
    if (
        elements.openSalesReportBtn
    ) {

        elements.openSalesReportBtn
            .style
            .display =
            'none'
    }

    /*
     * ================================
     * STAFF DASHBOARD
     * ================================
     *
     * เห็น:
     *
     * - ยอดขายวันนี้
     * - จำนวนบิลวันนี้
     * - เงินสด
     * - QR
     * - กราฟยอดขายย้อนหลัง 7 วัน
     * - เปิด POS
     * - ประวัติการขาย
     *
     *
     * ซ่อน:
     *
     * - ยอดขายเดือนนี้
     * - กำไรขั้นต้น
     * - จำนวนสินค้า
     * - จำนวนหมวดหมู่
     * - สินค้าขายดี
     * - จัดการสินค้า
     * - ดูรายงาน
     */


    /* =================================
       HIDE BUSINESS SUMMARY
    ================================= */

    const businessSummary =
        document.querySelector(
            '.business-summary'
        )


    if (
        businessSummary
    ) {

        businessSummary.style.display =
            'none'


        /*
         * ซ่อนหัวข้อ
         * "ภาพรวมร้าน"
         */
        const heading =
            businessSummary
                .previousElementSibling


        if (
            heading
            &&
            heading
                .classList
                .contains(
                    'section-title'
                )
        ) {

            heading.style.display =
                'none'
        }
    }


    /* =================================
       REPORT PANELS
    ================================= */

    const reportPanels =
        document.querySelectorAll(
            '#reports .panel'
        )


    /*
     * Panel 0
     * = กราฟ 7 วัน
     */

    if (
        reportPanels[0]
    ) {

        reportPanels[0]
            .style
            .gridColumn =
            '1 / -1'
    }


    /*
     * Panel 1
     * = สินค้าขายดี
     *
     * Staff ไม่เห็น
     */

    if (
        reportPanels[1]
    ) {

        reportPanels[1]
            .style
            .display =
            'none'
    }


    /* =================================
       QUICK ACTION
    ================================= */

    /*
     * Staff ไม่เห็น
     * จัดการสินค้า
     */

    if (
        elements.openProductsBtn
    ) {

        elements
            .openProductsBtn
            .style
            .display =
            'none'
    }


    /*
     * Staff ไม่เห็น
     * ดูรายงานเต็ม
     */

    if (
        elements.openReportsBtn
    ) {

        elements
            .openReportsBtn
            .style
            .display =
            'none'
    }
}


/* ========================================
   LOAD DASHBOARD
======================================== */

async function loadDashboard() {

    /*
     * =====================================
     * ROLE GUARD
     * =====================================
     *
     * Admin
     * = Dashboard เต็ม
     *
     * Manager
     * = Dashboard เต็ม
     *
     * Staff
     * = Dashboard แบบย่อ
     */


    const guard =
        await applyRoleGuard()


    if (!guard) {

        return
    }


    /*
     * เก็บ Role ที่ normalize
     * จาก Role Guard
     */

    state.role =
        guard.role


    /*
     * ปรับหน้าตา Dashboard
     * ตาม Role
     */

    applyDashboardRoleView(
        state.role
    )


    showStatus(
        'กำลังโหลดข้อมูล...',
        false
    )


    if (
        elements.refreshDashboardBtn
    ) {

        elements
            .refreshDashboardBtn
            .disabled =
            true
    }


    try {

        /* =================================
           SESSION
        ================================= */

        const session =
            await getCurrentSession()


        if (!session) {

            return
        }


        const user =
            session.user


        /* =================================
           PROFILE
        ================================= */

        const profile =
            await getProfile(
                user.id
            )


        /* =================================
           BRANCH
        ================================= */

        const branch =
            await getBranch(
                profile.branch_id
            )


        /* =================================
           USER DISPLAY
        ================================= */

        displayUser(
            user,
            profile,
            branch
        )


        /* =================================
           LOAD SALES
        ================================= */

        /*
         * ทุก Role
         * ต้องใช้ข้อมูลยอดขาย
         */

        await loadSales(
            state.role
        )


        /* =================================
           TODAY SUMMARY
        ================================= */

        /*
         * ทุก Role เห็น:
         *
         * - ยอดขายวันนี้
         * - จำนวนบิล
         * - เงินสด
         * - QR
         */

        renderTodaySummary()


        /* =================================
           7 DAY SALES
        ================================= */

        /*
         * ทุก Role เห็นกราฟ
         * ย้อนหลัง 7 วัน
         */

        renderSevenDayChart()


        /* =================================
           ADMIN / MANAGER
        ================================= */

        if (
            state.role !==
            'staff'
        ) {

            /*
             * PRODUCT COUNT
             *
             * CATEGORY COUNT
             */

            const [
                productCount,
                categoryCount
            ] =
                await Promise.all(
                    [

                        getTableCount(
                            'products',
                            profile.branch_id
                        ),

                        getTableCount(
                            'categories',
                            profile.branch_id
                        )

                    ]
                )


            if (
                elements.productCount
            ) {

                elements
                    .productCount
                    .textContent =
                    productCount
                        .toLocaleString(
                            'th-TH'
                        )
            }


            if (
                elements.categoryCount
            ) {

                elements
                    .categoryCount
                    .textContent =
                    categoryCount
                        .toLocaleString(
                            'th-TH'
                        )
            }


            /*
             * โหลดรายการสินค้า
             * ของบิล
             *
             * ใช้สำหรับ:
             *
             * - กำไรขั้นต้น
             * - Top Products
             */

            await loadSaleItems()


            /*
             * ยอดขายเดือนนี้
             */

            renderMonthSales()


            /*
             * กำไรขั้นต้นวันนี้
             */

            renderTodayProfit()


            /*
             * Top Products
             */

            renderTopProducts()

        } else {

            /*
             * STAFF
             *
             * ไม่โหลด Sale Items
             * เพราะไม่ต้องเห็นกำไร
             * และ Top Products
             */

            state.saleItems =
                []
        }


        /* =================================
           SUCCESS
        ================================= */

        showStatus(
            'โหลดข้อมูลสำเร็จ',
            false
        )


        setTimeout(
            () => {

                if (
                    elements.statusMessage
                ) {

                    elements
                        .statusMessage
                        .textContent =
                        ''
                }

            },
            2000
        )


    } catch (error) {

        console.error(
            'Dashboard load error:',
            error
        )


        showStatus(
            `โหลดข้อมูลไม่สำเร็จ: ${error.message
            ||
            'เกิดข้อผิดพลาด'
            }`
        )


    } finally {

        if (
            elements.refreshDashboardBtn
        ) {

            elements
                .refreshDashboardBtn
                .disabled =
                false
        }
    }
}


/* ========================================
   LOGOUT
======================================== */

async function logout() {

    if (
        elements.logoutBtn
    ) {

        elements.logoutBtn.disabled =
            true


        elements.logoutBtn.textContent =
            'กำลังออกจากระบบ...'
    }


    const {
        error
    } =
        await supabase
            .auth
            .signOut()


    if (error) {

        if (
            elements.logoutBtn
        ) {

            elements.logoutBtn.disabled =
                false


            elements.logoutBtn.innerHTML =
                '<span>🚪</span> ออกจากระบบ'
        }


        showStatus(
            `ออกจากระบบไม่สำเร็จ: ${error.message
            }`
        )


        return
    }


    window.location.replace(
        './index.html'
    )
}


/* ========================================
   EVENTS
======================================== */


/* ========================================
   LOGOUT
======================================== */

elements.logoutBtn
    ?.addEventListener(
        'click',
        logout
    )


/* ========================================
   MOBILE SIDEBAR
======================================== */

function setSidebarOpen(isOpen) {
    elements.sidebar?.classList.toggle('open', isOpen)
    elements.sidebarOverlay?.classList.toggle('open', isOpen)
    document.body.classList.toggle('sidebar-open', isOpen)
}

elements.menuToggle
    ?.addEventListener('click', () => {
        setSidebarOpen(!elements.sidebar?.classList.contains('open'))
    })

elements.sidebarOverlay
    ?.addEventListener('click', () => setSidebarOpen(false))

elements.managementToggle
    ?.addEventListener('click', () => {
        const isOpen = elements.managementMenu?.classList.toggle('open') ?? false
        elements.managementToggle.classList.toggle('open', isOpen)
        elements.managementToggle.setAttribute('aria-expanded', String(isOpen))
    })

elements.sidebar
    ?.querySelectorAll('a.menu-item')
    .forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 760 && link.id !== 'settingsMenu') {
                setSidebarOpen(false)
            }
        })
    })

window.addEventListener('resize', () => {
    if (window.innerWidth > 760) setSidebarOpen(false)
})


/* ========================================
   OPEN POS
======================================== */

elements.openPosBtn
    ?.addEventListener(
        'click',
        () => {

            /*
             * Admin
             * Manager
             * Staff
             *
             * เข้า POS ได้ทั้งหมด
             */

            window.location.href =
                './pos.html'
        }
    )


/* ========================================
   OPEN PRODUCTS
======================================== */

elements.openProductsBtn
    ?.addEventListener(
        'click',
        () => {

            /*
             * Staff
             * ห้ามเข้า Products
             */

            if (
                state.role ===
                'staff'
            ) {

                return
            }


            window.location.href =
                './products.html'
        }
    )


/* ========================================
   OPEN SALES
======================================== */

elements.openSalesBtn
    ?.addEventListener(
        'click',
        () => {

            /*
             * Admin
             * Manager
             * Staff
             *
             * เข้า Sales History ได้
             */

            window.location.href =
                './sales-history.html'
        }
    )


/* ========================================
   OPEN REPORT
======================================== */

elements.openReportsBtn
    ?.addEventListener(
        'click',
        () => {

            /*
             * Staff
             * ไม่มีปุ่มนี้อยู่แล้ว
             *
             * เช็กซ้ำเพื่อความปลอดภัย
             */

            if (
                state.role ===
                'staff'
            ) {

                return
            }


            document
                .getElementById(
                    'reports'
                )
                ?.scrollIntoView(
                    {
                        behavior:
                            'smooth'
                    }
                )
        }
    )

/* ========================================
   OPEN SALES REPORT
======================================== */

elements.openSalesReportBtn
    ?.addEventListener(
        'click',
        () => {

            if (
                state.role ===
                'staff'
            ) {
                return
            }

            window.location.href =
                './sales-report.html'
        }
    )
/* ========================================
   REFRESH DASHBOARD
======================================== */

elements.refreshDashboardBtn
    ?.addEventListener(
        'click',
        loadDashboard
    )


/* ========================================
   SETTINGS
======================================== */

elements.settingsMenu
    ?.addEventListener(
        'click',
        event => {

            event.preventDefault()


            /*
             * Settings
             * เฉพาะ Admin
             */

            if (
                state.role !==
                'admin'
            ) {

                return
            }


            alert(
                'หน้าตั้งค่าจะทำในขั้นตอนถัดไปครับ'
            )
        }
    )


/* ========================================
   AUTH CHANGE
======================================== */

supabase.auth
    .onAuthStateChange(
        (
            event,
            session
        ) => {

            if (
                event ===
                'SIGNED_OUT'
                ||
                !session
            ) {

                window.location
                    .replace(
                        './index.html'
                    )
            }
        }
    )


/* ========================================
   START
======================================== */

setCurrentDate()

loadDashboard()