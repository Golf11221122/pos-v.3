import { supabase } from './supabase.js'

const state = {
    session: null,
    profile: null,
    branch: null,

    sales: [],
    filteredSales: [],

    selectedSale: null,
    selectedItems: [],

    profiles: new Map()
}

const $ = id => document.getElementById(id)

const el = {
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),
    branchText: $('branchText'),
    userName: $('userName'),

    summaryTotal: $('summaryTotal'),
    summaryBills: $('summaryBills'),
    summaryCash: $('summaryCash'),
    summaryQr: $('summaryQr'),

    searchInput: $('searchInput'),
    dateFrom: $('dateFrom'),
    dateTo: $('dateTo'),
    paymentFilter: $('paymentFilter'),

    todayBtn: $('todayBtn'),
    clearFilterBtn: $('clearFilterBtn'),
    refreshBtn: $('refreshBtn'),

    resultCount: $('resultCount'),
    loadingState: $('loadingState'),
    emptyState: $('emptyState'),
    salesTableWrap: $('salesTableWrap'),
    salesTableBody: $('salesTableBody'),

    detailModal: $('detailModal'),
    closeDetailBtn: $('closeDetailBtn'),
    closeDetailBottomBtn: $('closeDetailBottomBtn'),

    detailInvoice: $('detailInvoice'),
    detailDate: $('detailDate'),
    detailCashier: $('detailCashier'),
    detailPayment: $('detailPayment'),
    detailStatus: $('detailStatus'),
    detailItems: $('detailItems'),

    detailSubtotal: $('detailSubtotal'),
    detailDiscount: $('detailDiscount'),
    detailTotal: $('detailTotal'),
    detailReceived: $('detailReceived'),
    detailChange: $('detailChange'),

    detailNoteWrap: $('detailNoteWrap'),
    detailNote: $('detailNote'),

    printReceiptBtn: $('printReceiptBtn'),

    receiptBranch: $('receiptBranch'),
    receiptInvoice: $('receiptInvoice'),
    receiptDate: $('receiptDate'),
    receiptCashier: $('receiptCashier'),
    receiptItems: $('receiptItems'),
    receiptSubtotal: $('receiptSubtotal'),
    receiptDiscount: $('receiptDiscount'),
    receiptTotal: $('receiptTotal'),
    receiptReceived: $('receiptReceived'),
    receiptChange: $('receiptChange'),
    receiptPayment: $('receiptPayment')
}


/* ================================
   HELPERS
================================ */

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}


function money(value) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2
    }).format(Number(value || 0))
}


function formatDateTime(value) {
    if (!value) {
        return '-'
    }

    return new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'short',
        timeStyle: 'medium'
    }).format(new Date(value))
}


function paymentLabel(method) {
    if (method === 'cash') {
        return 'เงินสด'
    }

    if (method === 'qr') {
        return 'QR'
    }

    return method || '-'
}


function statusLabel(status) {
    if (status === 'completed') {
        return 'สำเร็จ'
    }

    if (status === 'cancelled') {
        return 'ยกเลิก'
    }

    return status || '-'
}


function getCashierName(cashierId) {
    if (!cashierId) {
        return '-'
    }

    return (
        state.profiles.get(cashierId)?.full_name ||
        '-'
    )
}


/* ================================
   SESSION
================================ */

async function requireSession() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession()

    if (error) {
        throw error
    }

    if (!session) {
        location.replace('./index.html')
        return null
    }

    state.session = session

    return session
}


/* ================================
   PROFILE
================================ */

async function loadProfile(userId) {
    const {
        data,
        error
    } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            branch_id
        `)
        .eq('id', userId)
        .maybeSingle()

    if (error) {
        throw error
    }

    if (!data?.branch_id) {
        throw new Error(
            'บัญชียังไม่ได้กำหนดสาขา'
        )
    }

    state.profile = data
}


/* ================================
   BRANCH
================================ */

async function loadBranch() {
    const {
        data,
        error
    } = await supabase
        .from('branches')
        .select('id,name')
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
            'ไม่พบสาขา'
        )
    }

    state.branch = data
}


/* ================================
   USER
================================ */

function renderUser() {
    el.userName.textContent =
        state.profile.full_name ||
        state.session.user.email.split('@')[0]

    el.branchText.textContent =
        `สาขา: ${state.branch.name}`
}


/* ================================
   LOAD SALES
================================ */

async function loadSales() {
    el.loadingState.classList.remove('hidden')
    el.emptyState.classList.add('hidden')
    el.salesTableWrap.classList.add('hidden')

    try {
        const {
            data,
            error
        } = await supabase
            .from('sales')
            .select(`
                id,
                invoice_no,
                cashier_id,
                branch_id,
                subtotal,
                discount,
                total,
                payment_method,
                received_amount,
                change_amount,
                status,
                note,
                created_at
            `)
            .eq(
                'branch_id',
                state.profile.branch_id
            )
            .order(
                'created_at',
                {
                    ascending: false
                }
            )
            .limit(500)

        if (error) {
            throw error
        }

        state.sales = data || []

        await loadCashierProfiles()

        applyFilters()

    } catch (error) {
        console.error(
            'Load sales error:',
            error
        )

        el.emptyState.textContent =
            error.message ||
            'โหลดรายการขายไม่สำเร็จ'

        el.emptyState.classList.remove(
            'hidden'
        )

    } finally {
        el.loadingState.classList.add(
            'hidden'
        )
    }
}


/* ================================
   LOAD CASHIERS
================================ */

async function loadCashierProfiles() {
    const cashierIds = [
        ...new Set(
            state.sales
                .map(sale => sale.cashier_id)
                .filter(Boolean)
        )
    ]

    state.profiles.clear()

    if (!cashierIds.length) {
        return
    }

    const {
        data,
        error
    } = await supabase
        .from('profiles')
        .select('id,full_name')
        .in('id', cashierIds)

    if (error) {
        console.warn(
            'Load cashier profiles error:',
            error
        )

        return
    }

    for (const profile of data || []) {
        state.profiles.set(
            profile.id,
            profile
        )
    }
}


/* ================================
   FILTER
================================ */

function applyFilters() {
    const keyword =
        el.searchInput.value
            .trim()
            .toLowerCase()

    const payment =
        el.paymentFilter.value

    const from =
        el.dateFrom.value

    const to =
        el.dateTo.value

    state.filteredSales =
        state.sales.filter(sale => {

            const invoiceMatch =
                !keyword ||
                String(
                    sale.invoice_no || ''
                )
                    .toLowerCase()
                    .includes(keyword)


            const paymentMatch =
                !payment ||
                sale.payment_method === payment


            const created =
                new Date(sale.created_at)


            let dateMatch = true


            if (from) {
                const start =
                    new Date(
                        `${from}T00:00:00`
                    )

                if (created < start) {
                    dateMatch = false
                }
            }


            if (to) {
                const end =
                    new Date(
                        `${to}T23:59:59.999`
                    )

                if (created > end) {
                    dateMatch = false
                }
            }


            return (
                invoiceMatch &&
                paymentMatch &&
                dateMatch
            )
        })


    renderSales()
    renderSummary()
}


/* ================================
   SALES TABLE
================================ */

function renderSales() {
    const list =
        state.filteredSales

    el.resultCount.textContent =
        `${list.length.toLocaleString('th-TH')} รายการ`


    if (!list.length) {
        el.emptyState.textContent =
            'ไม่พบรายการขาย'

        el.emptyState.classList.remove(
            'hidden'
        )

        el.salesTableWrap.classList.add(
            'hidden'
        )

        return
    }


    el.emptyState.classList.add(
        'hidden'
    )

    el.salesTableWrap.classList.remove(
        'hidden'
    )


    el.salesTableBody.innerHTML =
        list.map(sale => {

            const cashier =
                getCashierName(
                    sale.cashier_id
                )

            const paymentClass =
                sale.payment_method === 'qr'
                    ? 'badge-qr'
                    : 'badge-cash'

            const statusClass =
                sale.status === 'cancelled'
                    ? 'badge-cancelled'
                    : 'badge-completed'


            return `
                <tr>

                    <td>
                        ${
                            formatDateTime(
                                sale.created_at
                            )
                        }
                    </td>

                    <td class="invoice-number">
                        ${
                            esc(
                                sale.invoice_no
                            )
                        }
                    </td>

                    <td>
                        ${esc(cashier)}
                    </td>

                    <td>

                        <span
                            class="
                                badge
                                ${paymentClass}
                            "
                        >
                            ${
                                paymentLabel(
                                    sale.payment_method
                                )
                            }
                        </span>

                    </td>

                    <td class="sale-total">
                        ${money(sale.total)}
                    </td>

                    <td>

                        <span
                            class="
                                badge
                                ${statusClass}
                            "
                        >
                            ${
                                statusLabel(
                                    sale.status
                                )
                            }
                        </span>

                    </td>

                    <td>

                        <button
                            type="button"
                            class="view-btn"
                            data-sale-id="${
                                esc(sale.id)
                            }"
                        >
                            ดูรายละเอียด
                        </button>

                    </td>

                </tr>
            `

        }).join('')
}


/* ================================
   SUMMARY
================================ */

function renderSummary() {
    const completed =
        state.filteredSales.filter(
            sale =>
                sale.status !==
                'cancelled'
        )


    const totalSales =
        completed.reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.total || 0
                ),
            0
        )


    const cashSales =
        completed
            .filter(
                sale =>
                    sale.payment_method ===
                    'cash'
            )
            .reduce(
                (sum, sale) =>
                    sum +
                    Number(
                        sale.total || 0
                    ),
                0
            )


    const qrSales =
        completed
            .filter(
                sale =>
                    sale.payment_method ===
                    'qr'
            )
            .reduce(
                (sum, sale) =>
                    sum +
                    Number(
                        sale.total || 0
                    ),
                0
            )


    el.summaryTotal.textContent =
        money(totalSales)

    el.summaryBills.textContent =
        completed.length.toLocaleString(
            'th-TH'
        )

    el.summaryCash.textContent =
        money(cashSales)

    el.summaryQr.textContent =
        money(qrSales)
}


/* ================================
   OPEN SALE DETAIL
================================ */

async function openSaleDetail(saleId) {
    const sale =
        state.sales.find(
            item =>
                item.id === saleId
        )

    if (!sale) {
        return
    }

    state.selectedSale = sale
    state.selectedItems = []

    el.detailModal.classList.remove(
        'hidden'
    )

    el.detailInvoice.textContent =
        sale.invoice_no || '-'

    el.detailDate.textContent =
        formatDateTime(
            sale.created_at
        )

    el.detailCashier.textContent =
        getCashierName(
            sale.cashier_id
        )

    el.detailPayment.textContent =
        paymentLabel(
            sale.payment_method
        )

    el.detailStatus.textContent =
        statusLabel(
            sale.status
        )

    el.detailSubtotal.textContent =
        money(sale.subtotal)

    el.detailDiscount.textContent =
        money(sale.discount)

    el.detailTotal.textContent =
        money(sale.total)

    el.detailReceived.textContent =
        money(
            sale.received_amount
        )

    el.detailChange.textContent =
        money(
            sale.change_amount
        )


    if (sale.note) {
        el.detailNote.textContent =
            sale.note

        el.detailNoteWrap.classList.remove(
            'hidden'
        )
    } else {
        el.detailNote.textContent = ''

        el.detailNoteWrap.classList.add(
            'hidden'
        )
    }


    el.detailItems.innerHTML = `
        <div class="state">
            กำลังโหลดรายการสินค้า...
        </div>
    `


    const {
        data,
        error
    } = await supabase
        .from('sale_items')
        .select(`
            id,
            sale_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            unit_cost,
            total_price
        `)
        .eq(
            'sale_id',
            saleId
        )


    if (error) {
        console.error(
            'Load sale items error:',
            error
        )

        el.detailItems.innerHTML = `
            <div class="state">
                โหลดรายการสินค้าไม่สำเร็จ
            </div>
        `

        return
    }


    state.selectedItems =
        data || []


    renderSaleItems()
    buildReceipt()
}


/* ================================
   DETAIL ITEMS
================================ */

function renderSaleItems() {
    const list =
        state.selectedItems


    if (!list.length) {
        el.detailItems.innerHTML = `
            <div class="state">
                ไม่พบรายการสินค้า
            </div>
        `

        return
    }


    el.detailItems.innerHTML =
        list.map(item => `

            <div class="detail-item">

                <div>

                    <strong>
                        ${
                            esc(
                                item.product_name ||
                                'สินค้า'
                            )
                        }
                    </strong>

                    <small>

                        ${
                            Number(
                                item.quantity
                            ).toLocaleString(
                                'th-TH'
                            )
                        }

                        ×

                        ${
                            money(
                                item.unit_price
                            )
                        }

                    </small>

                </div>

                <strong>
                    ${
                        money(
                            item.total_price
                        )
                    }
                </strong>

            </div>

        `).join('')
}


/* ================================
   RECEIPT
================================ */

function buildReceipt() {
    const sale =
        state.selectedSale

    if (!sale) {
        return
    }


    el.receiptBranch.textContent =
        state.branch?.name || '-'


    el.receiptInvoice.textContent =
        sale.invoice_no || '-'


    el.receiptDate.textContent =
        formatDateTime(
            sale.created_at
        )


    el.receiptCashier.textContent =
        getCashierName(
            sale.cashier_id
        )


    el.receiptItems.innerHTML =
        state.selectedItems
            .map(item => `

                <div class="receipt-item">

                    <div
                        class="
                            receipt-item-name
                        "
                    >
                        ${
                            esc(
                                item.product_name ||
                                'สินค้า'
                            )
                        }
                    </div>

                    <div
                        class="
                            receipt-item-line
                        "
                    >

                        <span>

                            ${
                                Number(
                                    item.quantity
                                ).toLocaleString(
                                    'th-TH'
                                )
                            }

                            ×

                            ${
                                money(
                                    item.unit_price
                                )
                            }

                        </span>

                        <strong>
                            ${
                                money(
                                    item.total_price
                                )
                            }
                        </strong>

                    </div>

                </div>

            `)
            .join('')


    el.receiptSubtotal.textContent =
        money(
            sale.subtotal
        )

    el.receiptDiscount.textContent =
        money(
            sale.discount
        )

    el.receiptTotal.textContent =
        money(
            sale.total
        )

    el.receiptReceived.textContent =
        money(
            sale.received_amount
        )

    el.receiptChange.textContent =
        money(
            sale.change_amount
        )

    el.receiptPayment.textContent =
        paymentLabel(
            sale.payment_method
        )
}


/* ================================
   PRINT
================================ */

function printReceipt() {
    if (!state.selectedSale) {
        alert(
            'กรุณาเลือกบิลก่อน'
        )

        return
    }

    buildReceipt()

    window.print()
}


/* ================================
   CLOSE DETAIL
================================ */

function closeDetail() {
    el.detailModal.classList.add(
        'hidden'
    )

    state.selectedSale = null
    state.selectedItems = []
}


/* ================================
   TODAY
================================ */

function getLocalDateInputValue(date) {
    const year =
        date.getFullYear()

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, '0')

    const day =
        String(
            date.getDate()
        ).padStart(2, '0')

    return `${year}-${month}-${day}`
}


function setTodayFilter() {
    const today =
        getLocalDateInputValue(
            new Date()
        )

    el.dateFrom.value =
        today

    el.dateTo.value =
        today

    applyFilters()
}


/* ================================
   CLEAR FILTER
================================ */

function clearFilters() {
    el.searchInput.value = ''
    el.dateFrom.value = ''
    el.dateTo.value = ''
    el.paymentFilter.value = ''

    applyFilters()
}


/* ================================
   LOGOUT
================================ */

async function logout() {
    await supabase.auth.signOut()

    location.replace(
        './index.html'
    )
}


/* ================================
   INIT
================================ */

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

        renderUser()

        await loadSales()

    } catch (error) {
        console.error(
            'Sales history init error:',
            error
        )

        el.loadingState.classList.add(
            'hidden'
        )

        el.emptyState.classList.remove(
            'hidden'
        )

        el.emptyState.textContent =
            error.message ||
            'โหลดข้อมูลไม่สำเร็จ'
    }
}


/* ================================
   EVENTS
================================ */

el.backBtn.onclick = () => {
    location.href =
        './dashboard.html'
}


el.logoutBtn.onclick =
    logout


el.searchInput.oninput =
    applyFilters


el.dateFrom.onchange =
    applyFilters


el.dateTo.onchange =
    applyFilters


el.paymentFilter.onchange =
    applyFilters


el.todayBtn.onclick =
    setTodayFilter


el.clearFilterBtn.onclick =
    clearFilters


el.refreshBtn.onclick =
    loadSales


el.salesTableBody.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-sale-id]'
            )

        if (!button) {
            return
        }

        openSaleDetail(
            button.dataset.saleId
        )
    }


el.closeDetailBtn.onclick =
    closeDetail


el.closeDetailBottomBtn.onclick =
    closeDetail


el.printReceiptBtn.onclick =
    printReceipt


el.detailModal.onclick =
    event => {

        if (
            event.target ===
            el.detailModal
        ) {
            closeDetail()
        }
    }


document.addEventListener(
    'keydown',
    event => {

        if (
            event.key === 'Escape' &&
            !el.detailModal.classList.contains(
                'hidden'
            )
        ) {
            closeDetail()
        }
    }
)


supabase.auth.onAuthStateChange(
    (event, session) => {

        if (
            event === 'SIGNED_OUT' ||
            !session
        ) {
            location.replace(
                './index.html'
            )
        }
    }
)


init()