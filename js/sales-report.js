import { supabase } from './supabase.js'


/* ========================================
   STATE
======================================== */

const state = {

    session:
        null,

    profile:
        null,

    branch:
        null,

    sales:
        [],

    saleItems:
        [],

    filteredSales:
        []
}


/* ========================================
   ELEMENTS
======================================== */

const $ = id =>
    document.getElementById(
        id
    )


const el = {

    backBtn:
        $('backBtn'),

    logoutBtn:
        $('logoutBtn'),

    branchText:
        $('branchText'),

    userName:
        $('userName'),


    dateFrom:
        $('dateFrom'),

    dateTo:
        $('dateTo'),

    paymentFilter:
        $('paymentFilter'),

    todayBtn:
        $('todayBtn'),

    monthBtn:
        $('monthBtn'),

    clearFilterBtn:
        $('clearFilterBtn'),

    refreshBtn:
        $('refreshBtn'),


    pageMessage:
        $('pageMessage'),


    summarySales:
        $('summarySales'),

    summaryBills:
        $('summaryBills'),

    summaryCash:
        $('summaryCash'),

    summaryQr:
        $('summaryQr'),

    summaryDiscount:
        $('summaryDiscount'),

    summaryVoidBills:
        $('summaryVoidBills'),

    summaryVoidAmount:
        $('summaryVoidAmount'),


    dailySalesChart:
        $('dailySalesChart'),

    topProducts:
        $('topProducts'),


    resultCount:
        $('resultCount'),

    loadingState:
        $('loadingState'),

    emptyState:
        $('emptyState'),

    tableWrap:
        $('tableWrap'),

    dailyTableBody:
        $('dailyTableBody'),


    /* EXPORT */

    printReportBtn:
        $('printReportBtn'),

    exportPdfBtn:
        $('exportPdfBtn'),

    exportExcelBtn:
        $('exportExcelBtn'),

    sharePdfBtn:
        $('sharePdfBtn'),

    reportExportArea:
        $('reportExportArea'),

    printBranchText:
        $('printBranchText'),

    printPeriodText:
        $('printPeriodText')
}


/* ========================================
   HELPERS
======================================== */

function esc(value) {

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


function message(
    text = '',
    type = 'error'
) {

    if (
        !el.pageMessage
    ) {
        return
    }


    el.pageMessage.textContent =
        text


    el.pageMessage.style.color =
        type ===
        'success'

            ? '#188038'

            : '#d93025'
}


function getLocalDateValue(
    date
) {

    const year =
        date.getFullYear()


    const month =
        String(
            date.getMonth() +
            1
        )
            .padStart(
                2,
                '0'
            )


    const day =
        String(
            date.getDate()
        )
            .padStart(
                2,
                '0'
            )


    return (
        `${year}-${month}-${day}`
    )
}


function dateKey(
    value
) {

    const date =
        new Date(
            value
        )


    return getLocalDateValue(
        date
    )
}


function formatDate(
    value
) {

    if (!value) {

        return '-'
    }


    const [
        year,
        month,
        day
    ] =
        value.split(
            '-'
        )


    const date =
        new Date(
            Number(
                year
            ),
            Number(
                month
            ) - 1,
            Number(
                day
            )
        )


    return date
        .toLocaleDateString(
            'th-TH',
            {
                day:
                    'numeric',

                month:
                    'short',

                year:
                    'numeric'
            }
        )
}


/* ========================================
   REPORT PERIOD TEXT
======================================== */

function updateReportHeader() {

    if (
        el.printBranchText
    ) {

        el.printBranchText.textContent =
            `สาขา: ${
                state.branch?.name
                ||
                '-'
            }`
    }


    if (
        el.printPeriodText
    ) {

        const from =
            el.dateFrom.value

                ? formatDate(
                    el.dateFrom.value
                )

                : 'ทั้งหมด'


        const to =
            el.dateTo.value

                ? formatDate(
                    el.dateTo.value
                )

                : 'ทั้งหมด'


        el.printPeriodText.textContent =
            `ช่วงวันที่: ${from} ถึง ${to}`
    }
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

async function loadProfile(
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

        throw error
    }


    if (
        !data?.branch_id
    ) {

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
            .from(
                'branches'
            )
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


    if (
        el.branchText
    ) {

        el.branchText.textContent =
            `สาขา: ${data.name}`
    }


    if (
        el.userName
    ) {

        el.userName.textContent =
            state.profile.full_name
            ||
            state.session
                .user
                .email
                ?.split('@')[0]
            ||
            'ผู้ใช้งาน'
    }


    updateReportHeader()
}


/* ========================================
   LOAD SALES
======================================== */

async function loadSales() {

    if (
        el.dateFrom.value
        &&
        el.dateTo.value
        &&
        el.dateFrom.value >
        el.dateTo.value
    ) {

        message(
            'วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด'
        )

        return
    }


    el.loadingState
        ?.classList
        .remove(
            'hidden'
        )


    el.emptyState
        ?.classList
        .add(
            'hidden'
        )


    el.tableWrap
        ?.classList
        .add(
            'hidden'
        )


    message('')


    updateReportHeader()


    try {

        let query =
            supabase
                .from(
                    'sales'
                )
                .select(
                    `
                    id,
                    invoice_no,
                    branch_id,
                    cashier_id,
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


        if (
            el.dateFrom.value
        ) {

            const from =
                new Date(
                    `${el.dateFrom.value}T00:00:00`
                )


            query =
                query.gte(
                    'created_at',
                    from.toISOString()
                )
        }


        if (
            el.dateTo.value
        ) {

            const to =
                new Date(
                    `${el.dateTo.value}T23:59:59.999`
                )


            query =
                query.lte(
                    'created_at',
                    to.toISOString()
                )
        }


        query =
            query.order(
                'created_at',
                {
                    ascending:
                        true
                }
            )


        const {
            data,
            error
        } =
            await query


        if (error) {

            throw error
        }


        state.sales =
            data || []


        await loadSaleItems()


        applyFilters()


    } catch (error) {

        console.error(
            'Sales report error:',
            error
        )


        state.sales =
            []


        state.saleItems =
            []


        state.filteredSales =
            []


        renderAll()


        message(
            error.message
            ||
            'โหลดรายงานยอดขายไม่สำเร็จ'
        )


    } finally {

        el.loadingState
            ?.classList
            .add(
                'hidden'
            )
    }
}


/* ========================================
   LOAD SALE ITEMS
======================================== */

async function loadSaleItems() {

    const completedSaleIds =
        state.sales
            .filter(
                sale =>
                    sale.status
                    !==
                    'cancelled'
            )
            .map(
                sale =>
                    sale.id
            )


    if (
        !completedSaleIds.length
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
                total_price
                `
            )
            .in(
                'sale_id',
                completedSaleIds
            )


    if (error) {

        throw error
    }


    state.saleItems =
        data || []
}


/* ========================================
   FILTER
======================================== */

function applyFilters() {

    const payment =
        el.paymentFilter.value


    state.filteredSales =
        state.sales.filter(
            sale => {

                return (
                    !payment
                    ||
                    sale.payment_method
                    ===
                    payment
                )
            }
        )


    renderAll()
}


/* ========================================
   RENDER ALL
======================================== */

function renderAll() {

    renderSummary()

    renderDailyChart()

    renderTopProducts()

    renderDailyTable()

    updateReportHeader()
}


/* ========================================
   SUMMARY
======================================== */

function getSummaryData() {

    const completed =
        state.filteredSales.filter(
            sale =>
                sale.status
                !==
                'cancelled'
        )


    const voided =
        state.filteredSales.filter(
            sale =>
                sale.status
                ===
                'cancelled'
        )


    const sales =
        completed.reduce(
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
        completed
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
        completed
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


    const discount =
        completed.reduce(
            (
                sum,
                sale
            ) =>

                sum +
                Number(
                    sale.discount || 0
                ),

            0
        )


    const voidAmount =
        voided.reduce(
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


    return {

        completed,
        voided,
        sales,
        cash,
        qr,
        discount,
        voidAmount
    }
}


function renderSummary() {

    const summary =
        getSummaryData()


    el.summarySales.textContent =
        money(
            summary.sales
        )


    el.summaryBills.textContent =
        summary.completed
            .length
            .toLocaleString(
                'th-TH'
            )


    el.summaryCash.textContent =
        money(
            summary.cash
        )


    el.summaryQr.textContent =
        money(
            summary.qr
        )


    el.summaryDiscount.textContent =
        money(
            summary.discount
        )


    el.summaryVoidBills.textContent =
        summary.voided
            .length
            .toLocaleString(
                'th-TH'
            )


    el.summaryVoidAmount.textContent =
        money(
            summary.voidAmount
        )
}


/* ========================================
   DAILY DATA
======================================== */

function buildDailyData() {

    const map =
        new Map()


    for (
        const sale
        of
        state.filteredSales
    ) {

        const key =
            dateKey(
                sale.created_at
            )


        if (
            !map.has(
                key
            )
        ) {

            map.set(
                key,
                {
                    date:
                        key,

                    bills:
                        0,

                    sales:
                        0,

                    cash:
                        0,

                    qr:
                        0,

                    discount:
                        0,

                    voidBills:
                        0,

                    voidAmount:
                        0
                }
            )
        }


        const row =
            map.get(
                key
            )


        if (
            sale.status ===
            'cancelled'
        ) {

            row.voidBills +=
                1


            row.voidAmount +=
                Number(
                    sale.total || 0
                )


            continue
        }


        row.bills +=
            1


        row.sales +=
            Number(
                sale.total || 0
            )


        row.discount +=
            Number(
                sale.discount || 0
            )


        if (
            sale.payment_method ===
            'cash'
        ) {

            row.cash +=
                Number(
                    sale.total || 0
                )
        }


        if (
            sale.payment_method ===
            'qr'
        ) {

            row.qr +=
                Number(
                    sale.total || 0
                )
        }
    }


    return [
        ...map.values()
    ]
        .sort(
            (
                a,
                b
            ) =>

                a.date.localeCompare(
                    b.date
                )
        )
}


/* ========================================
   DAILY CHART
======================================== */

function renderDailyChart() {

    const data =
        buildDailyData()


    if (
        !data.length
    ) {

        el.dailySalesChart.innerHTML =
            `
            <div class="state">
                ยังไม่มีข้อมูลยอดขาย
            </div>
            `


        return
    }


    const max =
        Math.max(
            ...data.map(
                row =>
                    row.sales
            ),
            1
        )


    el.dailySalesChart.innerHTML =
        data
            .map(
                row => {

                    const height =
                        row.sales > 0

                            ? Math.max(
                                (
                                    row.sales /
                                    max
                                )
                                *
                                100,
                                4
                            )

                            : 2


                    return `

                        <div
                            class="chart-column"
                        >

                            <div
                                class="chart-value"
                            >

                                ${
                                    Math.round(
                                        row.sales
                                    )
                                        .toLocaleString(
                                            'th-TH'
                                        )
                                }

                            </div>


                            <div
                                class="chart-bar-wrap"
                            >

                                <div
                                    class="chart-bar"

                                    style="
                                        height:
                                        ${height}%;
                                    "

                                    title="${
                                        money(
                                            row.sales
                                        )
                                    }"
                                >
                                </div>

                            </div>


                            <div
                                class="chart-label"
                            >

                                ${
                                    formatDate(
                                        row.date
                                    )
                                }

                            </div>

                        </div>

                    `
                }
            )
            .join('')
}


/* ========================================
   PRODUCT DATA
======================================== */

function buildProductData() {

    const validSaleIds =
        new Set(

            state.filteredSales
                .filter(
                    sale =>
                        sale.status
                        !==
                        'cancelled'
                )
                .map(
                    sale =>
                        sale.id
                )
        )


    const map =
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
            map.get(
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


        map.set(
            key,
            old
        )
    }


    return [
        ...map.values()
    ]
        .sort(
            (
                a,
                b
            ) =>

                b.quantity -
                a.quantity
        )
}


/* ========================================
   TOP PRODUCTS
======================================== */

function renderTopProducts() {

    const top =
        buildProductData()
            .slice(
                0,
                5
            )


    if (
        !top.length
    ) {

        el.topProducts.innerHTML =
            `
            <div class="state">
                ยังไม่มีข้อมูลสินค้า
            </div>
            `


        return
    }


    el.topProducts.innerHTML =
        top
            .map(
                (
                    product,
                    index
                ) => `

                    <div class="top-product">

                        <div class="top-rank">

                            ${
                                index + 1
                            }

                        </div>


                        <div class="top-info">

                            <strong>

                                ${
                                    esc(
                                        product.name
                                    )
                                }

                            </strong>


                            <small>

                                ยอดขาย

                                ${
                                    money(
                                        product.total
                                    )
                                }

                            </small>

                        </div>


                        <div class="top-qty">

                            ${
                                product
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
   DAILY TABLE
======================================== */

function renderDailyTable() {

    const data =
        buildDailyData()


    el.resultCount.textContent =
        `${data.length.toLocaleString(
            'th-TH'
        )} วัน`


    if (
        !data.length
    ) {

        el.emptyState
            .classList
            .remove(
                'hidden'
            )


        el.tableWrap
            .classList
            .add(
                'hidden'
            )


        el.dailyTableBody.innerHTML =
            ''


        return
    }


    el.emptyState
        .classList
        .add(
            'hidden'
        )


    el.tableWrap
        .classList
        .remove(
            'hidden'
        )


    el.dailyTableBody.innerHTML =
        data
            .map(
                row => `

                    <tr>

                        <td>

                            ${
                                formatDate(
                                    row.date
                                )
                            }

                        </td>


                        <td class="text-right">

                            ${
                                row.bills
                                    .toLocaleString(
                                        'th-TH'
                                    )
                            }

                        </td>


                        <td class="text-right">

                            ${
                                money(
                                    row.sales
                                )
                            }

                        </td>


                        <td class="text-right">

                            ${
                                money(
                                    row.cash
                                )
                            }

                        </td>


                        <td class="text-right">

                            ${
                                money(
                                    row.qr
                                )
                            }

                        </td>


                        <td class="text-right">

                            ${
                                money(
                                    row.discount
                                )
                            }

                        </td>


                        <td class="text-right">

                            ${
                                row.voidBills
                                    .toLocaleString(
                                        'th-TH'
                                    )
                            }

                            บิล


                            ${
                                row.voidBills > 0

                                    ? ` / ${
                                        money(
                                            row.voidAmount
                                        )
                                    }`

                                    : ''
                            }

                        </td>

                    </tr>

                `
            )
            .join('')
}


/* ========================================
   FILTER BUTTONS
======================================== */

function setToday() {

    const today =
        getLocalDateValue(
            new Date()
        )


    el.dateFrom.value =
        today


    el.dateTo.value =
        today


    loadSales()
}


function setMonth() {

    const now =
        new Date()


    const first =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        )


    el.dateFrom.value =
        getLocalDateValue(
            first
        )


    el.dateTo.value =
        getLocalDateValue(
            now
        )


    loadSales()
}


function clearFilters() {

    el.dateFrom.value =
        ''


    el.dateTo.value =
        ''


    el.paymentFilter.value =
        ''


    loadSales()
}


/* ========================================
   FILE NAME
======================================== */

function sanitizeFileName(
    value
) {

    return String(
        value || ''
    )
        .replace(
            /[\\/:*?"<>|]/g,
            '-'
        )
        .trim()
}


function getReportFileName(
    extension
) {

    const branchName =
        sanitizeFileName(
            state.branch?.name
            ||
            'JOKJUNG'
        )


    const from =
        el.dateFrom.value
        ||
        'ทั้งหมด'


    const to =
        el.dateTo.value
        ||
        'ทั้งหมด'


    return (
        `รายงานยอดขาย_${branchName}_${from}_ถึง_${to}.${extension}`
    )
}


/* ========================================
   PRINT
======================================== */

function printReport() {

    updateReportHeader()

    window.print()
}


/* ========================================
   PDF OPTIONS
======================================== */

function getPdfOptions() {

    return {

        margin:
            [
                7,
                7,
                7,
                7
            ],

        filename:
            getReportFileName(
                'pdf'
            ),

        image: {

            type:
                'jpeg',

            quality:
                0.98
        },

        html2canvas: {

            scale:
                2,

            useCORS:
                true,

            backgroundColor:
                '#ffffff',

            logging:
                false
        },

        jsPDF: {

            unit:
                'mm',

            format:
                'a4',

            orientation:
                'landscape'
        },

        pagebreak: {

            mode:
                [
                    'css',
                    'legacy'
                ]
        }
    }
}


/* ========================================
   CREATE PDF BLOB
======================================== */

async function createPdfBlob() {

    if (
        !window.html2pdf
    ) {

        throw new Error(
            'ไม่พบระบบสร้าง PDF'
        )
    }


    if (
        !el.reportExportArea
    ) {

        throw new Error(
            'ไม่พบพื้นที่รายงาน'
        )
    }


    updateReportHeader()


    return await window
        .html2pdf()
        .set(
            getPdfOptions()
        )
        .from(
            el.reportExportArea
        )
        .outputPdf(
            'blob'
        )
}


/* ========================================
   EXPORT PDF
======================================== */

async function exportPdf() {

    if (
        !window.html2pdf
    ) {

        alert(
            'ไม่พบระบบสร้าง PDF'
        )

        return
    }


    try {

        el.exportPdfBtn.disabled =
            true


        el.exportPdfBtn.textContent =
            'กำลังสร้าง PDF...'


        updateReportHeader()


        await window
            .html2pdf()
            .set(
                getPdfOptions()
            )
            .from(
                el.reportExportArea
            )
            .save()


    } catch (error) {

        console.error(
            'Export PDF error:',
            error
        )


        alert(
            error.message
            ||
            'สร้าง PDF ไม่สำเร็จ'
        )


    } finally {

        el.exportPdfBtn.disabled =
            false


        el.exportPdfBtn.textContent =
            '📄 PDF'
    }
}


/* ========================================
   EXPORT EXCEL
======================================== */

function exportExcel() {

    if (
        !window.XLSX
    ) {

        alert(
            'ไม่พบระบบสร้าง Excel'
        )

        return
    }


    try {

        el.exportExcelBtn.disabled =
            true


        el.exportExcelBtn.textContent =
            'กำลังสร้าง Excel...'


        const summary =
            getSummaryData()


        /* ===============================
           SUMMARY SHEET
        =============================== */

        const summaryData = [

            [
                'รายงานยอดขาย JOKJUNG POS'
            ],

            [
                'สาขา',
                state.branch?.name
                ||
                '-'
            ],

            [
                'วันที่เริ่ม',
                el.dateFrom.value
                ||
                'ทั้งหมด'
            ],

            [
                'วันที่สิ้นสุด',
                el.dateTo.value
                ||
                'ทั้งหมด'
            ],

            [
                'วิธีชำระ',
                el.paymentFilter.value
                    === 'cash'

                    ? 'เงินสด'

                    : el.paymentFilter.value
                        === 'qr'

                        ? 'QR'

                        : 'ทั้งหมด'
            ],

            [],

            [
                'รายการ',
                'ค่า'
            ],

            [
                'ยอดขายรวม',
                summary.sales
            ],

            [
                'จำนวนบิล',
                summary.completed.length
            ],

            [
                'เงินสด',
                summary.cash
            ],

            [
                'QR',
                summary.qr
            ],

            [
                'ส่วนลดรวม',
                summary.discount
            ],

            [
                'จำนวนบิล VOID',
                summary.voided.length
            ],

            [
                'ยอดบิล VOID',
                summary.voidAmount
            ]
        ]


        /* ===============================
           DAILY SHEET
        =============================== */

        const dailyData =
            buildDailyData()
                .map(
                    row => ({

                        วันที่:
                            formatDate(
                                row.date
                            ),

                        จำนวนบิล:
                            row.bills,

                        ยอดขาย:
                            row.sales,

                        เงินสด:
                            row.cash,

                        QR:
                            row.qr,

                        ส่วนลด:
                            row.discount,

                        จำนวนบิลVOID:
                            row.voidBills,

                        ยอดVOID:
                            row.voidAmount
                    })
                )


        /* ===============================
           PRODUCT SHEET
        =============================== */

        const productData =
            buildProductData()
                .map(
                    (
                        product,
                        index
                    ) => ({

                        อันดับ:
                            index + 1,

                        สินค้า:
                            product.name,

                        จำนวนขาย:
                            product.quantity,

                        ยอดขาย:
                            product.total
                    })
                )


        /* ===============================
           SALES SHEET
        =============================== */

        const saleData =
            state.filteredSales
                .map(
                    sale => ({

                        วันที่เวลา:
                            new Date(
                                sale.created_at
                            )
                                .toLocaleString(
                                    'th-TH'
                                ),

                        เลขที่บิล:
                            sale.invoice_no
                            ||
                            '-',

                        วิธีชำระ:
                            sale.payment_method
                            ===
                            'cash'

                                ? 'เงินสด'

                                : sale.payment_method
                                ===
                                'qr'

                                    ? 'QR'

                                    : sale.payment_method
                                    ||
                                    '-',

                        ยอดก่อนลด:
                            Number(
                                sale.subtotal || 0
                            ),

                        ส่วนลด:
                            Number(
                                sale.discount || 0
                            ),

                        ยอดสุทธิ:
                            Number(
                                sale.total || 0
                            ),

                        สถานะ:
                            sale.status
                            ===
                            'cancelled'

                                ? 'VOID'

                                : 'สำเร็จ'
                    })
                )


        /* ===============================
           WORKBOOK
        =============================== */

        const workbook =
            XLSX.utils
                .book_new()


        const summarySheet =
            XLSX.utils
                .aoa_to_sheet(
                    summaryData
                )


        const dailySheet =
            XLSX.utils
                .json_to_sheet(
                    dailyData
                )


        const productSheet =
            XLSX.utils
                .json_to_sheet(
                    productData
                )


        const saleSheet =
            XLSX.utils
                .json_to_sheet(
                    saleData
                )


        /* COLUMN WIDTH */

        summarySheet['!cols'] = [

            {
                wch:
                    25
            },

            {
                wch:
                    24
            }
        ]


        dailySheet['!cols'] = [

            {
                wch:
                    18
            },

            {
                wch:
                    12
            },

            {
                wch:
                    16
            },

            {
                wch:
                    16
            },

            {
                wch:
                    16
            },

            {
                wch:
                    16
            },

            {
                wch:
                    16
            },

            {
                wch:
                    16
            }
        ]


        productSheet['!cols'] = [

            {
                wch:
                    10
            },

            {
                wch:
                    30
            },

            {
                wch:
                    15
            },

            {
                wch:
                    18
            }
        ]


        saleSheet['!cols'] = [

            {
                wch:
                    22
            },

            {
                wch:
                    26
            },

            {
                wch:
                    15
            },

            {
                wch:
                    16
            },

            {
                wch:
                    16
            },

            {
                wch:
                    16
            },

            {
                wch:
                    14
            }
        ]


        XLSX.utils
            .book_append_sheet(
                workbook,
                summarySheet,
                'สรุป'
            )


        XLSX.utils
            .book_append_sheet(
                workbook,
                dailySheet,
                'รายวัน'
            )


        XLSX.utils
            .book_append_sheet(
                workbook,
                productSheet,
                'สินค้า'
            )


        XLSX.utils
            .book_append_sheet(
                workbook,
                saleSheet,
                'รายการบิล'
            )


        XLSX.writeFile(
            workbook,
            getReportFileName(
                'xlsx'
            )
        )


    } catch (error) {

        console.error(
            'Export Excel error:',
            error
        )


        alert(
            error.message
            ||
            'สร้าง Excel ไม่สำเร็จ'
        )


    } finally {

        el.exportExcelBtn.disabled =
            false


        el.exportExcelBtn.textContent =
            '📊 Excel'
    }
}


/* ========================================
   DOWNLOAD BLOB
======================================== */

function downloadBlob(
    blob,
    fileName
) {

    const url =
        URL.createObjectURL(
            blob
        )


    const link =
        document.createElement(
            'a'
        )


    link.href =
        url


    link.download =
        fileName


    document.body
        .appendChild(
            link
        )


    link.click()


    link.remove()


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            )

        },
        1000
    )
}


/* ========================================
   SHARE PDF
======================================== */

async function sharePdf() {

    try {

        el.sharePdfBtn.disabled =
            true


        el.sharePdfBtn.textContent =
            'กำลังสร้าง PDF...'


        const blob =
            await createPdfBlob()


        const fileName =
            getReportFileName(
                'pdf'
            )


        const file =
            new File(
                [
                    blob
                ],
                fileName,
                {
                    type:
                        'application/pdf'
                }
            )


        /*
         * MOBILE / SUPPORTED BROWSER
         */
        if (
            navigator.share
            &&
            navigator.canShare
            &&
            navigator.canShare(
                {
                    files:
                        [
                            file
                        ]
                }
            )
        ) {

            await navigator.share(
                {

                    title:
                        'รายงานยอดขาย JOKJUNG POS',

                    text:
                        `รายงานยอดขาย ${
                            state.branch?.name
                            ||
                            ''
                        }`,

                    files:
                        [
                            file
                        ]
                }
            )


            return
        }


        /*
         * ไม่รองรับ Share
         * ดาวน์โหลดแทน
         */

        downloadBlob(
            blob,
            fileName
        )


        alert(
            'อุปกรณ์นี้ไม่รองรับการแชร์ไฟล์โดยตรง ระบบดาวน์โหลด PDF ให้แทน'
        )


    } catch (error) {

        if (
            error.name ===
            'AbortError'
        ) {

            return
        }


        console.error(
            'Share PDF error:',
            error
        )


        alert(
            error.message
            ||
            'แชร์ PDF ไม่สำเร็จ'
        )


    } finally {

        el.sharePdfBtn.disabled =
            false


        el.sharePdfBtn.textContent =
            '📤 แชร์ PDF'
    }
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
         * เปิดหน้าแรก
         * = เดือนปัจจุบัน
         */

        const now =
            new Date()


        const first =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            )


        el.dateFrom.value =
            getLocalDateValue(
                first
            )


        el.dateTo.value =
            getLocalDateValue(
                now
            )


        updateReportHeader()


        await loadSales()


    } catch (error) {

        console.error(
            'Sales report init error:',
            error
        )


        el.loadingState
            ?.classList
            .add(
                'hidden'
            )


        message(
            error.message
            ||
            'โหลดรายงานยอดขายไม่สำเร็จ'
        )
    }
}


/* ========================================
   EVENTS
======================================== */

el.backBtn
    ?.addEventListener(
        'click',
        () => {

            location.href =
                './dashboard.html'
        }
    )


el.logoutBtn
    ?.addEventListener(
        'click',
        logout
    )


el.todayBtn
    ?.addEventListener(
        'click',
        setToday
    )


el.monthBtn
    ?.addEventListener(
        'click',
        setMonth
    )


el.clearFilterBtn
    ?.addEventListener(
        'click',
        clearFilters
    )


el.refreshBtn
    ?.addEventListener(
        'click',
        loadSales
    )


el.dateFrom
    ?.addEventListener(
        'change',
        loadSales
    )


el.dateTo
    ?.addEventListener(
        'change',
        loadSales
    )


el.paymentFilter
    ?.addEventListener(
        'change',
        applyFilters
    )


/* PRINT */

el.printReportBtn
    ?.addEventListener(
        'click',
        printReport
    )


/* PDF */

el.exportPdfBtn
    ?.addEventListener(
        'click',
        exportPdf
    )


/* EXCEL */

el.exportExcelBtn
    ?.addEventListener(
        'click',
        exportExcel
    )


/* SHARE */

el.sharePdfBtn
    ?.addEventListener(
        'click',
        sharePdf
    )


/* ========================================
   AUTH
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