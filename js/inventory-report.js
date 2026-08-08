import { supabase } from './supabase.js'


const state = {
    session: null,
    profile: null,
    branch: null,

    reportRows: []
}


const $ = id =>
    document.getElementById(id)


const el = {
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),

    branchText: $('branchText'),
    userName: $('userName'),

    refreshBtn: $('refreshBtn'),

    dateFrom: $('dateFrom'),
    dateTo: $('dateTo'),

    searchInput: $('searchInput'),

    todayBtn: $('todayBtn'),
    clearFilterBtn: $('clearFilterBtn'),

    stockValue: $('stockValue'),
    saleCost: $('saleCost'),
    stockInValue: $('stockInValue'),
    wasteValue: $('wasteValue'),

    pageMessage: $('pageMessage'),

    resultCount: $('resultCount'),
    loadingState: $('loadingState'),
    emptyState: $('emptyState'),

    tableWrap: $('tableWrap'),
    reportTableBody: $('reportTableBody'),

    lowStockList: $('lowStockList')
}


/* ========================================
   HELPERS
======================================== */

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}


function money(value) {
    return new Intl.NumberFormat(
        'th-TH',
        {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }
    ).format(
        Number(value || 0)
    )
}


function number(value) {
    return Number(value || 0)
        .toLocaleString(
            'th-TH',
            {
                maximumFractionDigits: 3
            }
        )
}


function message(
    target,
    text = '',
    type = 'error'
) {
    if (!target) {
        return
    }

    target.textContent = text

    target.style.color =
        type === 'success'
            ? '#188038'
            : '#d93025'
}


function getLocalDateValue(date) {
    const year =
        date.getFullYear()

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            '0'
        )

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            '0'
        )

    return `${year}-${month}-${day}`
}


/* ========================================
   SESSION
======================================== */

async function requireSession() {
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
        location.replace(
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

async function loadProfile(userId) {
    const {
        data,
        error
    } =
        await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                role,
                branch_id
            `)
            .eq(
                'id',
                userId
            )
            .maybeSingle()


    if (error) {
        throw error
    }


    if (!data) {
        throw new Error(
            'ไม่พบข้อมูลผู้ใช้งาน'
        )
    }


    if (!data.branch_id) {
        throw new Error(
            'บัญชียังไม่ได้กำหนดสาขา'
        )
    }


    state.profile =
        data
}


/* ========================================
   BRANCH
======================================== */

async function loadBranch() {
    const {
        data,
        error
    } =
        await supabase
            .from('branches')
            .select(
                'id,name'
            )
            .eq(
                'id',
                state.profile.branch_id
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


    el.branchText.textContent =
        `สาขา: ${data.name}`


    el.userName.textContent =
        state.profile.full_name
        ||
        state.session.user.email
            ?.split('@')[0]
        ||
        'ผู้ใช้งาน'
}


/* ========================================
   LOAD REPORT
======================================== */

async function loadInventoryReport() {
    el.loadingState
        .classList
        .remove('hidden')


    el.emptyState
        .classList
        .add('hidden')


    el.tableWrap
        .classList
        .add('hidden')


    message(
        el.pageMessage,
        ''
    )


    try {
        const {
            data,
            error
        } =
            await supabase.rpc(
                'get_inventory_report',
                {
                    p_branch_id:
                        state.profile.branch_id,

                    p_date_from:
                        el.dateFrom.value
                        ||
                        null,

                    p_date_to:
                        el.dateTo.value
                        ||
                        null
                }
            )


        if (error) {
            throw error
        }


        console.log(
            'Inventory report:',
            data
        )


        state.reportRows =
            data || []


        renderTable()

        renderSummary()

        renderLowStock()


    } catch (error) {
        console.error(
            'Inventory report error:',
            error
        )


        state.reportRows =
            []


        renderTable()

        renderSummary()

        renderLowStock()


        message(
            el.pageMessage,
            error.message
            ||
            'โหลดรายงานไม่สำเร็จ'
        )

    } finally {
        el.loadingState
            .classList
            .add('hidden')
    }
}


/* ========================================
   SEARCH
======================================== */

function getFilteredRows() {
    const keyword =
        el.searchInput.value
            .trim()
            .toLowerCase()


    if (!keyword) {
        return state.reportRows
    }


    return state.reportRows.filter(
        row => {

            const name =
                String(
                    row.ingredient_name
                    ||
                    ''
                )
                    .toLowerCase()


            return name.includes(
                keyword
            )
        }
    )
}


/* ========================================
   TABLE
======================================== */

function renderTable() {
    const list =
        getFilteredRows()


    el.resultCount.textContent =
        `${list.length.toLocaleString(
            'th-TH'
        )} รายการ`


    if (!list.length) {
        el.emptyState
            .classList
            .remove('hidden')


        el.tableWrap
            .classList
            .add('hidden')


        el.reportTableBody.innerHTML =
            ''


        return
    }


    el.emptyState
        .classList
        .add('hidden')


    el.tableWrap
        .classList
        .remove('hidden')


    el.reportTableBody.innerHTML =
        list.map(
            row => {

                /*
                 * ยอดคงเหลือ ณ สิ้นช่วง
                 */
                const closingStock =
                    Number(
                        row.closing_stock
                        ||
                        0
                    )


                const minStock =
                    Number(
                        row.min_stock
                        ||
                        0
                    )


                let stockClass =
                    ''


                if (
                    closingStock <= 0
                ) {
                    stockClass =
                        'stock-out'
                }
                else if (
                    minStock > 0
                    &&
                    closingStock <=
                    minStock
                ) {
                    stockClass =
                        'stock-low'
                }


                return `
                    <tr>

                        <!-- วัตถุดิบ -->
                        <td>

                            <span
                                class="ingredient-name"
                            >
                                ${esc(
                    row.ingredient_name
                )
                    }
                            </span>

                        </td>


                        <!-- หน่วย -->
                        <td>
                            ${esc(
                        row.unit
                    )
                    }
                        </td>


                        <!-- ยอดยกมา -->
                        <td class="text-right">

                            ${number(
                        row.opening_stock
                    )
                    }

                        </td>


                        <!-- รับเข้า -->
                        <td class="text-right">

                            ${number(
                        row.stock_in_qty
                    )
                    }

                        </td>


                        <!-- ใช้จากการขาย -->
                        <td class="text-right">

                            ${number(
                        row.sale_qty
                    )
                    }

                        </td>


                        <!-- ของเสีย -->
                        <td class="text-right">

                            ${number(
                        row.waste_qty
                    )
                    }

                        </td>


                        <!-- ปรับเพิ่ม -->
                        <td class="text-right">

                            ${number(
                        row.adjust_in_qty
                    )
                    }

                        </td>


                        <!-- ปรับลด -->
                        <td class="text-right">

                            ${number(
                        row.adjust_out_qty
                    )
                    }

                        </td>


                        <!-- ยอดคงเหลือ -->
                        <td
                            class="
                                text-right
                                ${stockClass}
                            "
                        >

                            ${number(
                        row.closing_stock
                    )
                    }

                        </td>


                        <!-- ต้นทุนต่อหน่วย -->
                        <td class="text-right">

                            ${money(
                        row.cost_per_unit
                    )
                    }

                        </td>


                        <!-- มูลค่าคงเหลือ -->
                        <td class="text-right">

                            ${money(
                        row.closing_stock_value
                    )
                    }

                        </td>

                    </tr>
                `
            }
        ).join('')
}


/* ========================================
   SUMMARY
======================================== */

function renderSummary() {
    /*
     * มูลค่าสต็อก ณ สิ้นช่วง
     */
    const stockValue =
        state.reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum
                +
                Number(
                    row.closing_stock_value
                    ||
                    0
                ),
            0
        )


    /*
     * ต้นทุนวัตถุดิบที่ใช้จากการขาย
     */
    const saleCost =
        state.reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum
                +
                Number(
                    row.sale_cost
                    ||
                    0
                ),
            0
        )


    /*
     * มูลค่ารับเข้า
     */
    const stockInValue =
        state.reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum
                +
                Number(
                    row.stock_in_value
                    ||
                    0
                ),
            0
        )


    /*
     * มูลค่าของเสีย
     */
    const wasteValue =
        state.reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum
                +
                Number(
                    row.waste_value
                    ||
                    0
                ),
            0
        )


    el.stockValue.textContent =
        money(
            stockValue
        )


    el.saleCost.textContent =
        money(
            saleCost
        )


    el.stockInValue.textContent =
        money(
            stockInValue
        )


    el.wasteValue.textContent =
        money(
            wasteValue
        )
}


/* ========================================
   LOW STOCK
======================================== */

function renderLowStock() {
    const list =
        state.reportRows
            .filter(
                row => {

                    /*
                     * ใช้ closing_stock
                     * ไม่ใช้ current_stock
                     */
                    const stock =
                        Number(
                            row.closing_stock
                            ||
                            0
                        )


                    const min =
                        Number(
                            row.min_stock
                            ||
                            0
                        )


                    return (
                        stock <= 0
                        ||
                        (
                            min > 0
                            &&
                            stock <= min
                        )
                    )
                }
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.closing_stock
                        ||
                        0
                    )
                    -
                    Number(
                        b.closing_stock
                        ||
                        0
                    )
            )


    if (!list.length) {
        el.lowStockList.innerHTML =
            `
                <div class="state">
                    ไม่มีวัตถุดิบใกล้หมด
                </div>
            `

        return
    }


    el.lowStockList.innerHTML =
        list.map(
            row => {

                const stock =
                    Number(
                        row.closing_stock
                        ||
                        0
                    )


                const out =
                    stock <= 0


                return `
                    <div
                        class="
                            low-stock-item
                            ${out
                        ? 'out'
                        : 'low'
                    }
                        "
                    >

                        <strong>
                            ${esc(
                        row.ingredient_name
                    )
                    }
                        </strong>


                        <span>
                            คงเหลือ:
                            ${number(
                        row.closing_stock
                    )
                    }
                            ${esc(
                        row.unit
                    )
                    }
                        </span>


                        <span>
                            จุดเตือน:
                            ${number(
                        row.min_stock
                    )
                    }
                            ${esc(
                        row.unit
                    )
                    }
                        </span>

                    </div>
                `
            }
        ).join('')
}


/* ========================================
   TODAY
======================================== */

async function setTodayFilter() {
    const today =
        getLocalDateValue(
            new Date()
        )


    el.dateFrom.value =
        today


    el.dateTo.value =
        today


    await loadInventoryReport()
}


/* ========================================
   CLEAR FILTER
======================================== */

async function clearFilters() {
    el.dateFrom.value =
        ''


    el.dateTo.value =
        ''


    el.searchInput.value =
        ''


    await loadInventoryReport()
}


/* ========================================
   LOGOUT
======================================== */

async function logout() {
    await supabase
        .auth
        .signOut()


    location.replace(
        './index.html'
    )
}


/* ========================================
   INIT
======================================== */

async function init() {
    try {
        const session =
            await requireSession()


        if (!session) {
            return
        }


        await loadProfile(
            session.user.id
        )


        await loadBranch()


        /*
         * เปิดหน้าครั้งแรก
         * ให้รายงานวันนี้
         */
        const today =
            getLocalDateValue(
                new Date()
            )


        el.dateFrom.value =
            today


        el.dateTo.value =
            today


        await loadInventoryReport()


    } catch (error) {
        console.error(
            'Inventory report init error:',
            error
        )


        el.loadingState
            .classList
            .add('hidden')


        message(
            el.pageMessage,
            error.message
            ||
            'โหลดข้อมูลไม่สำเร็จ'
        )
    }
}


/* ========================================
   EVENTS
======================================== */

el.backBtn.onclick =
    () => {

        location.href =
            './dashboard.html'
    }


el.logoutBtn.onclick =
    logout


el.refreshBtn.onclick =
    loadInventoryReport


el.todayBtn.onclick =
    setTodayFilter


el.clearFilterBtn.onclick =
    clearFilters


/*
 * ค้นหาชื่อ ไม่ต้องยิง Supabase ใหม่
 */
el.searchInput.oninput =
    () => {

        renderTable()
    }


/*
 * เปลี่ยนช่วงวันที่
 * ให้โหลด SQL report ใหม่
 */
el.dateFrom.onchange =
    loadInventoryReport


el.dateTo.onchange =
    loadInventoryReport


/* ========================================
   AUTH
======================================== */

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

            location.replace(
                './index.html'
            )
        }
    }
)


/* ========================================
   START
======================================== */

init()