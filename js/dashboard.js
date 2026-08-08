import { supabase } from './supabase.js'


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

    currentDate:
        document.getElementById(
            'currentDate'
        ),


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


    sevenDayChart:
        document.getElementById(
            'sevenDayChart'
        ),

    topProducts:
        document.getElementById(
            'topProducts'
        ),


    statusMessage:
        document.getElementById(
            'statusMessage'
        ),

    refreshDashboardBtn:
        document.getElementById(
            'refreshDashboardBtn'
        ),


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

    openReportsBtn:
        document.getElementById(
            'openReportsBtn'
        ),

    categoriesMenu:
        document.getElementById(
            'categoriesMenu'
        ),

    stockMenu:
        document.getElementById(
            'stockMenu'
        ),

    settingsMenu:
        document.getElementById(
            'settingsMenu'
        )
}


const state = {

    session: null,

    profile: null,

    branch: null,

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


function showStatus(
    message = '',
    isError = true
) {

    elements.statusMessage.textContent =
        message


    elements.statusMessage.style.color =
        isError
            ? '#d93025'
            : '#188038'
}


function formatRole(role) {

    const roles = {

        admin:
            'ผู้ดูแลระบบ',

        manager:
            'ผู้จัดการ',

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


function setCurrentDate() {

    const date =
        new Date()


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


    elements.userEmail.textContent =
        user.email || '-'


    elements.profileName.textContent =
        fullName


    elements.profileRole.textContent =
        roleText


    elements.profileBranch.textContent =
        branchText


    elements.userName.textContent =
        fullName


    elements.userRole.textContent =
        roleText


    elements.welcomeName.textContent =
        fullName


    elements.userAvatar.textContent =
        fullName
            .charAt(0)
            .toUpperCase()
}


/* ========================================
   COUNTS
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

async function loadSales() {

    const sevenDaysAgo =
        startOfSevenDays()


    const monthStart =
        startOfMonth()


    const earliest =
        sevenDaysAgo <
            monthStart

            ? sevenDaysAgo

            : monthStart


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
                    isCompleted(sale)
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
                    isCompleted(sale)
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
                    isCompleted(sale)
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


    elements.todaySales.textContent =
        money(total)


    elements.todayBills.textContent =
        sales
            .length
            .toLocaleString(
                'th-TH'
            )


    elements.todayCash.textContent =
        money(cash)


    elements.todayQr.textContent =
        money(qr)
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
                        isCompleted(sale)
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


    elements.monthSales.textContent =
        money(amount)
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
                            isCompleted(sale)
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


    elements.todayProfit.textContent =
        money(profit)
}


/* ========================================
   7 DAY CHART
======================================== */

function renderSevenDayChart() {

    const days = []


    const start =
        startOfSevenDays()


    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const day =
            new Date(start)


        day.setDate(
            start.getDate() +
            i
        )


        const next =
            new Date(day)


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
                            isCompleted(sale)
                            &&
                            created >= day
                            &&
                            created < next
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
                                ></div>

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

    const validSaleIds =
        new Set(

            state.sales
                .filter(
                    sale => {

                        return (
                            isCompleted(sale)
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
            productMap.get(key)
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
                            ${index + 1
                    }
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
   LOAD DASHBOARD
======================================== */

async function loadDashboard() {

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

        const session =
            await getCurrentSession()


        if (!session) {
            return
        }


        const user =
            session.user


        const profile =
            await getProfile(
                user.id
            )


        const branch =
            await getBranch(
                profile.branch_id
            )


        displayUser(
            user,
            profile,
            branch
        )


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


        elements.productCount.textContent =
            productCount
                .toLocaleString(
                    'th-TH'
                )


        elements.categoryCount.textContent =
            categoryCount
                .toLocaleString(
                    'th-TH'
                )


        await loadSales()


        await loadSaleItems()


        renderTodaySummary()

        renderMonthSales()

        renderTodayProfit()

        renderSevenDayChart()

        renderTopProducts()


        showStatus(
            'โหลดข้อมูลสำเร็จ',
            false
        )


        setTimeout(
            () => {

                elements
                    .statusMessage
                    .textContent =
                    ''

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

    elements.logoutBtn.disabled =
        true


    elements.logoutBtn.textContent =
        'กำลังออกจากระบบ...'


    const {
        error
    } =
        await supabase
            .auth
            .signOut()


    if (error) {

        elements.logoutBtn.disabled =
            false


        elements.logoutBtn.innerHTML =
            '<span>🚪</span> ออกจากระบบ'


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

elements.logoutBtn
    .addEventListener(
        'click',
        logout
    )


elements.menuToggle
    .addEventListener(
        'click',
        () => {

            elements.sidebar
                .classList
                .toggle(
                    'open'
                )
        }
    )


elements.openPosBtn
    .addEventListener(
        'click',
        () => {

            window.location.href =
                './pos.html'
        }
    )


elements.openProductsBtn
    .addEventListener(
        'click',
        () => {

            window.location.href =
                './products.html'
        }
    )


elements.openSalesBtn
    .addEventListener(
        'click',
        () => {

            window.location.href =
                './sales-history.html'
        }
    )


elements.openReportsBtn
    .addEventListener(
        'click',
        () => {

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


elements.refreshDashboardBtn
    .addEventListener(
        'click',
        loadDashboard
    )


elements.categoriesMenu
    ?.addEventListener(
        'click',
        event => {

            event.preventDefault()

            alert(
                'หน้าจัดการหมวดหมู่จะทำในขั้นตอนถัดไปครับ'
            )
        }
    )


elements.stockMenu
    ?.addEventListener(
        'click',
        event => {

            event.preventDefault()

            alert(
                'ระบบวัตถุดิบและสต็อกจะทำในขั้นตอนถัดไปครับ'
            )
        }
    )


elements.settingsMenu
    ?.addEventListener(
        'click',
        event => {

            event.preventDefault()

            alert(
                'หน้าตั้งค่าจะทำในขั้นตอนถัดไปครับ'
            )
        }
    )


supabase.auth.onAuthStateChange(
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

            window.location.replace(
                './index.html'
            )
        }
    }
)


setCurrentDate()

loadDashboard()
