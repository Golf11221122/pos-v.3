import { supabase } from './supabase.js'
import { applyRoleGuard } from './role-guard.js'


const state = {
    session: null,
    profile: null,
    branch: null,

    sales: [],
    filteredSales: [],

    selectedSale: null,
    selectedItems: [],
    selectedRefunds: [],

    profiles: new Map()
}


const $ = id =>
    document.getElementById(id)


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

    // DETAIL
    detailModal: $('detailModal'),

    closeDetailBtn:
        $('closeDetailBtn'),

    closeDetailBottomBtn:
        $('closeDetailBottomBtn'),

    detailInvoice:
        $('detailInvoice'),

    detailDate:
        $('detailDate'),

    detailCashier:
        $('detailCashier'),

    detailPayment:
        $('detailPayment'),

    detailStatus:
        $('detailStatus'),

    detailItems:
        $('detailItems'),

    detailSubtotal:
        $('detailSubtotal'),

    detailDiscount:
        $('detailDiscount'),

    detailTotal:
        $('detailTotal'),

    detailReceived:
        $('detailReceived'),

    detailChange:
        $('detailChange'),

    detailNoteWrap:
        $('detailNoteWrap'),

    detailNote:
        $('detailNote'),

    printReceiptBtn:
        $('printReceiptBtn'),

    // VOID INFORMATION
    detailVoidWrap:
        $('detailVoidWrap'),

    detailVoidReason:
        $('detailVoidReason'),

    detailVoidedBy:
        $('detailVoidedBy'),

    detailVoidedAt:
        $('detailVoidedAt'),

    voidSaleBtn:
        $('voidSaleBtn'),

    // VOID MODAL
    voidModal:
        $('voidModal'),

    voidInvoiceText:
        $('voidInvoiceText'),

    voidReasonInput:
        $('voidReasonInput'),

    voidPinInput:
        $('voidPinInput'),

    voidMessage:
        $('voidMessage'),

    closeVoidBtn:
        $('closeVoidBtn'),

    cancelVoidBtn:
        $('cancelVoidBtn'),

    confirmVoidBtn:
        $('confirmVoidBtn'),


    // REFUND V2.4
    detailRefundWrap: $('detailRefundWrap'),
    detailRefundedTotal: $('detailRefundedTotal'),
    detailRefundRemaining: $('detailRefundRemaining'),
    refundHistory: $('refundHistory'),
    refundSaleBtn: $('refundSaleBtn'),
    refundModal: $('refundModal'),
    refundInvoiceText: $('refundInvoiceText'),
    refundBillTotal: $('refundBillTotal'),
    refundRemainingText: $('refundRemainingText'),
    refundAmountInput: $('refundAmountInput'),
    refundMethodInput: $('refundMethodInput'),
    refundReferenceInput: $('refundReferenceInput'),
    refundReasonInput: $('refundReasonInput'),
    refundMessage: $('refundMessage'),
    closeRefundBtn: $('closeRefundBtn'),
    cancelRefundBtn: $('cancelRefundBtn'),
    confirmRefundBtn: $('confirmRefundBtn'),

    // RECEIPT
    receiptBranch:
        $('receiptBranch'),

    receiptInvoice:
        $('receiptInvoice'),

    receiptDate:
        $('receiptDate'),

    receiptCashier:
        $('receiptCashier'),

    receiptItems:
        $('receiptItems'),

    receiptSubtotal:
        $('receiptSubtotal'),

    receiptDiscount:
        $('receiptDiscount'),

    receiptTotal:
        $('receiptTotal'),

    receiptReceived:
        $('receiptReceived'),

    receiptChange:
        $('receiptChange'),

    receiptPayment:
        $('receiptPayment'),

    // VOID / REFUND RECEIPT DETAIL V2.4.1
    receiptDocumentStatusWrap: $('receiptDocumentStatusWrap'),
    receiptDocumentStatus: $('receiptDocumentStatus'),
    receiptVoidWrap: $('receiptVoidWrap'),
    receiptVoidReason: $('receiptVoidReason'),
    receiptVoidedBy: $('receiptVoidedBy'),
    receiptVoidedAt: $('receiptVoidedAt'),
    receiptRefundWrap: $('receiptRefundWrap'),
    receiptOriginalTotal: $('receiptOriginalTotal'),
    receiptRefundedTotal: $('receiptRefundedTotal'),
    receiptRefundRemaining: $('receiptRefundRemaining'),
    receiptRefundHistory: $('receiptRefundHistory')
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


function formatDateTime(value) {
    if (!value) {
        return '-'
    }

    return new Intl.DateTimeFormat(
        'th-TH',
        {
            dateStyle: 'short',
            timeStyle: 'medium'
        }
    ).format(
        new Date(value)
    )
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
        return 'VOID / ยกเลิก'
    }

    return status || '-'
}


function getProfileName(profileId) {
    if (!profileId) {
        return '-'
    }

    return (
        state.profiles
            .get(profileId)
            ?.full_name
        ||
        '-'
    )
}


function getCashierName(cashierId) {
    return getProfileName(
        cashierId
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

    target.textContent =
        text

    target.style.color =
        type === 'success'
            ? '#188038'
            : '#d93025'
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

    if (!data?.branch_id) {
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
            'ไม่พบสาขา'
        )
    }

    state.branch =
        data
}


/* ========================================
   USER
======================================== */

function renderUser() {
    el.userName.textContent =
        state.profile.full_name
        ||
        state.session.user.email
            .split('@')[0]

    el.branchText.textContent =
        `สาขา: ${state.branch.name}`
}


/* ========================================
   LOAD SALES
======================================== */

async function loadSales() {
    el.loadingState
        .classList
        .remove('hidden')

    el.emptyState
        .classList
        .add('hidden')

    el.salesTableWrap
        .classList
        .add('hidden')

    try {
        const {
            data,
            error
        } =
            await supabase
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

                    void_reason,
                    voided_by,
                    voided_at,

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

        state.sales =
            data || []

        await loadProfiles()

        applyFilters()

    } catch (error) {
        console.error(
            'Load sales error:',
            error
        )

        el.emptyState.textContent =
            error.message ||
            'โหลดรายการขายไม่สำเร็จ'

        el.emptyState
            .classList
            .remove('hidden')

    } finally {
        el.loadingState
            .classList
            .add('hidden')
    }
}


/* ========================================
   LOAD PROFILES
======================================== */

async function loadProfiles() {
    const ids =
        [
            ...new Set(
                state.sales
                    .flatMap(
                        sale => [
                            sale.cashier_id,
                            sale.voided_by
                        ]
                    )
                    .filter(Boolean)
            )
        ]

    state.profiles.clear()

    if (!ids.length) {
        return
    }

    const {
        data,
        error
    } =
        await supabase
            .from('profiles')
            .select(
                'id,full_name'
            )
            .in(
                'id',
                ids
            )

    if (error) {
        console.warn(
            'Load profiles error:',
            error
        )

        return
    }

    for (
        const profile
        of
        data || []
    ) {
        state.profiles.set(
            profile.id,
            profile
        )
    }
}


/* ========================================
   FILTER
======================================== */

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
        state.sales.filter(
            sale => {

                const invoiceMatch =
                    !keyword
                    ||
                    String(
                        sale.invoice_no ||
                        ''
                    )
                        .toLowerCase()
                        .includes(
                            keyword
                        )


                const paymentMatch =
                    !payment
                    ||
                    sale.payment_method
                    ===
                    payment


                const created =
                    new Date(
                        sale.created_at
                    )


                let dateMatch =
                    true


                if (from) {
                    const start =
                        new Date(
                            `${from}T00:00:00`
                        )

                    if (
                        created <
                        start
                    ) {
                        dateMatch =
                            false
                    }
                }


                if (to) {
                    const end =
                        new Date(
                            `${to}T23:59:59.999`
                        )

                    if (
                        created >
                        end
                    ) {
                        dateMatch =
                            false
                    }
                }


                return (
                    invoiceMatch
                    &&
                    paymentMatch
                    &&
                    dateMatch
                )
            }
        )


    renderSales()

    renderSummary()
}


/* ========================================
   SALES TABLE
======================================== */

function renderSales() {
    const list =
        state.filteredSales


    el.resultCount.textContent =
        `${list.length.toLocaleString(
            'th-TH'
        )} รายการ`


    if (!list.length) {
        el.emptyState.textContent =
            'ไม่พบรายการขาย'

        el.emptyState
            .classList
            .remove('hidden')

        el.salesTableWrap
            .classList
            .add('hidden')

        return
    }


    el.emptyState
        .classList
        .add('hidden')

    el.salesTableWrap
        .classList
        .remove('hidden')


    el.salesTableBody.innerHTML =
        list.map(
            sale => {

                const cashier =
                    getCashierName(
                        sale.cashier_id
                    )


                const paymentClass =
                    sale.payment_method
                        ===
                        'qr'
                        ? 'badge-qr'
                        : 'badge-cash'


                const cancelled =
                    sale.status
                    ===
                    'cancelled'


                const statusClass =
                    cancelled
                        ? 'badge-cancelled'
                        : 'badge-completed'


                return `
                    <tr
                        ${cancelled
                        ? 'style="opacity:.65;"'
                        : ''
                    }
                    >

                        <td>
                            ${formatDateTime(
                        sale.created_at
                    )
                    }
                        </td>


                        <td class="invoice-number">

                            ${esc(
                        sale.invoice_no
                    )
                    }

                        </td>


                        <td>
                            ${esc(
                        cashier
                    )
                    }
                        </td>


                        <td>

                            <span
                                class="
                                    badge
                                    ${paymentClass}
                                "
                            >
                                ${paymentLabel(
                        sale.payment_method
                    )
                    }
                            </span>

                        </td>


                        <td class="sale-total">
                            ${money(
                        sale.total
                    )
                    }
                        </td>


                        <td>

                            <span
                                class="
                                    badge
                                    ${statusClass}
                                "
                            >
                                ${statusLabel(
                        sale.status
                    )
                    }
                            </span>

                        </td>


                        <td>

                            <button
                                type="button"
                                class="view-btn"
                                data-sale-id="${esc(
                        sale.id
                    )
                    }"
                            >
                                ดูรายละเอียด
                            </button>

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
     * VOID / cancelled
     * ไม่ถูกนับเป็นยอดขาย
     */
    const completed =
        state.filteredSales.filter(
            sale =>
                sale.status !==
                'cancelled'
        )


    const totalSales =
        completed.reduce(
            (
                sum,
                sale
            ) =>
                sum
                +
                Number(
                    sale.total ||
                    0
                ),
            0
        )


    const cashSales =
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
                    sum
                    +
                    Number(
                        sale.total ||
                        0
                    ),
                0
            )


    const qrSales =
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
                    sum
                    +
                    Number(
                        sale.total ||
                        0
                    ),
                0
            )


    el.summaryTotal.textContent =
        money(
            totalSales
        )

    el.summaryBills.textContent =
        completed.length
            .toLocaleString(
                'th-TH'
            )

    el.summaryCash.textContent =
        money(
            cashSales
        )

    el.summaryQr.textContent =
        money(
            qrSales
        )
}


/* ========================================
   OPEN SALE DETAIL
======================================== */

async function openSaleDetail(
    saleId
) {
    const sale =
        state.sales.find(
            item =>
                item.id ===
                saleId
        )

    if (!sale) {
        return
    }


    state.selectedSale =
        sale

    state.selectedItems =
        []


    el.detailModal
        .classList
        .remove('hidden')


    el.detailInvoice.textContent =
        sale.invoice_no ||
        '-'


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
        money(
            sale.subtotal
        )


    el.detailDiscount.textContent =
        money(
            sale.discount
        )


    el.detailTotal.textContent =
        money(
            sale.total
        )


    el.detailReceived.textContent =
        money(
            sale.received_amount
        )


    el.detailChange.textContent =
        money(
            sale.change_amount
        )


    /*
     * หมายเหตุบิล
     */
    if (sale.note) {
        el.detailNote.textContent =
            sale.note

        el.detailNoteWrap
            .classList
            .remove('hidden')

    } else {
        el.detailNote.textContent =
            ''

        el.detailNoteWrap
            .classList
            .add('hidden')
    }


    /*
     * สถานะ VOID
     */
    const isVoided =
        sale.status ===
        'cancelled'


    if (isVoided) {
        el.detailVoidWrap
            .classList
            .remove('hidden')


        el.detailVoidReason.textContent =
            sale.void_reason ||
            '-'


        el.detailVoidedBy.textContent =
            getProfileName(
                sale.voided_by
            )


        el.detailVoidedAt.textContent =
            formatDateTime(
                sale.voided_at
            )


        el.voidSaleBtn
            .classList
            .add('hidden')

    } else {
        el.detailVoidWrap
            .classList
            .add('hidden')


        el.detailVoidReason.textContent =
            '-'


        el.detailVoidedBy.textContent =
            '-'


        el.detailVoidedAt.textContent =
            '-'


        el.voidSaleBtn
            .classList
            .remove('hidden')
    }


    /*
     * โหลดรายการสินค้า
     */
    el.detailItems.innerHTML =
        `
        <div class="state">
            กำลังโหลดรายการสินค้า...
        </div>
        `


    const {
        data,
        error
    } =
        await supabase
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

        el.detailItems.innerHTML =
            `
            <div class="state">
                โหลดรายการสินค้าไม่สำเร็จ
            </div>
            `

        return
    }


    state.selectedItems =
        data || []


    renderSaleItems()

    await loadSaleRefunds()

    buildReceipt()

    if (el.printReceiptBtn) {
        const totalRefund =
            refundedTotal()

        if (sale.status === 'cancelled') {
            el.printReceiptBtn.textContent =
                totalRefund > 0.009
                    ? 'พิมพ์เอกสาร VOID / REFUND'
                    : 'พิมพ์เอกสาร VOID'
        } else {
            el.printReceiptBtn.textContent =
                'พิมพ์ใบเสร็จ'
        }
    }
}


/* ========================================
   DETAIL ITEMS
======================================== */

function renderSaleItems() {
    const list =
        state.selectedItems


    if (!list.length) {
        el.detailItems.innerHTML =
            `
            <div class="state">
                ไม่พบรายการสินค้า
            </div>
            `

        return
    }


    el.detailItems.innerHTML =
        list.map(
            item => `

                <div class="detail-item">

                    <div>

                        <strong>
                            ${esc(
                item.product_name ||
                'สินค้า'
            )
                }
                        </strong>

                        <small>

                            ${Number(
                    item.quantity
                )
                    .toLocaleString(
                        'th-TH'
                    )
                }

                            ×

                            ${money(
                    item.unit_price
                )
                }

                        </small>

                    </div>


                    <strong>
                        ${money(
                    item.total_price
                )
                }
                    </strong>

                </div>

            `
        ).join('')
}



/* ========================================
   REFUND CONTROL V2.4
======================================== */

const activeRefunds = () =>
    (state.selectedRefunds || [])
        .filter(row => !row.reversed_at)

const refundedTotal = () =>
    activeRefunds()
        .reduce((sum,row) => sum + Number(row.amount || 0), 0)

const refundRemaining = () =>
    Math.max(
        Number(state.selectedSale?.total || 0) - refundedTotal(),
        0
    )

function canRefundSale() {
    const role = String(state.profile?.role || '').trim().toLowerCase()
    return ['admin','manager'].includes(role)
}

async function loadSaleRefunds() {
    state.selectedRefunds = []

    if (!state.selectedSale || state.selectedSale.status !== 'cancelled') {
        el.detailRefundWrap?.classList.add('hidden')
        return
    }

    const { data, error } = await supabase.rpc(
        'get_sale_refunds_v24',
        { p_sale_id: state.selectedSale.id }
    )

    if (error) {
        console.error('Load refunds error:', error)
        if (el.refundHistory) {
            el.refundHistory.innerHTML =
                `<div class="state">โหลดประวัติคืนเงินไม่สำเร็จ: ${esc(error.message || '')}</div>`
        }
        return
    }

    state.selectedRefunds = data || []
    renderRefundInfo()
}

function renderRefundInfo() {
    if (!state.selectedSale || state.selectedSale.status !== 'cancelled') {
        el.detailRefundWrap?.classList.add('hidden')
        return
    }

    el.detailRefundWrap?.classList.remove('hidden')

    const total = refundedTotal()
    const remaining = refundRemaining()

    if (el.detailRefundedTotal) el.detailRefundedTotal.textContent = money(total)
    if (el.detailRefundRemaining) el.detailRefundRemaining.textContent = money(remaining)

    if (el.refundSaleBtn) {
        const allowed = canRefundSale() && remaining > 0.009
        el.refundSaleBtn.classList.toggle('hidden', !allowed)
        el.refundSaleBtn.disabled = !allowed
    }

    if (!el.refundHistory) return

    const rows = state.selectedRefunds || []
    el.refundHistory.innerHTML = rows.length
        ? rows.map(row => `
            <div class="refund-history-row ${row.reversed_at ? 'is-reversed' : ''}">
                <div>
                    <strong>${money(row.amount)}</strong>
                    <small>${esc(row.refund_method || '-')} • ${formatDateTime(row.refunded_at)}</small>
                    <small>${esc(row.reason || '-')}</small>
                    ${row.reference_no ? `<small>Ref: ${esc(row.reference_no)}</small>` : ''}
                    ${row.reversed_at ? `<small>ย้อนรายการ: ${esc(row.reversal_reason || '-')}</small>` : ''}
                </div>
                <span>${esc(row.refunded_by_name || '-')}</span>
            </div>
        `).join('')
        : '<div class="state">ยังไม่มีการคืนเงินจริง</div>'
}

function openRefundModal() {
    const sale = state.selectedSale
    if (!sale || sale.status !== 'cancelled') {
        alert('ต้อง VOID บิลก่อนบันทึกการคืนเงิน')
        return
    }

    if (!canRefundSale()) {
        alert('การคืนเงินอนุญาตเฉพาะ Manager / Admin')
        return
    }

    const remaining = refundRemaining()
    if (remaining <= 0.009) {
        alert('บิลนี้คืนเงินครบแล้ว')
        return
    }

    el.refundInvoiceText.textContent = sale.invoice_no || '-'
    el.refundBillTotal.textContent = money(sale.total)
    el.refundRemainingText.textContent = money(remaining)
    el.refundAmountInput.value = remaining.toFixed(2)
    el.refundAmountInput.max = remaining.toFixed(2)
    el.refundMethodInput.value =
        ['cash','qr'].includes(sale.payment_method)
            ? sale.payment_method
            : 'other'
    el.refundReferenceInput.value = ''
    el.refundReasonInput.value = ''
    message(el.refundMessage,'')
    el.refundModal.classList.remove('hidden')
}

function closeRefundModal() {
    el.refundModal.classList.add('hidden')
    message(el.refundMessage,'')
}

async function confirmRefund() {
    const sale = state.selectedSale
    if (!sale) return

    const amount = Number(el.refundAmountInput.value || 0)
    const method = el.refundMethodInput.value
    const reason = el.refundReasonInput.value.trim()
    const ref = el.refundReferenceInput.value.trim()

    if (!(amount > 0)) {
        message(el.refundMessage,'กรุณากรอกจำนวนเงินคืน')
        return
    }

    if (amount > refundRemaining() + 0.009) {
        message(el.refundMessage,'จำนวนเงินคืนเกินยอดที่คืนได้')
        return
    }

    if (!reason) {
        message(el.refundMessage,'กรุณาระบุเหตุผลการคืนเงิน')
        return
    }

    if (!confirm(`ยืนยันคืนเงิน ${money(amount)} สำหรับบิล ${sale.invoice_no} หรือไม่?`)) {
        return
    }

    el.confirmRefundBtn.disabled = true
    el.confirmRefundBtn.textContent = 'กำลังบันทึก...'

    try {
        const { data, error } = await supabase.rpc(
            'record_sale_refund_v24',
            {
                p_sale_id: sale.id,
                p_amount: amount,
                p_refund_method: method,
                p_reason: reason,
                p_reference_no: ref || null
            }
        )

        if (error) throw error

        closeRefundModal()
        await loadSaleRefunds()

        alert(
            `บันทึกคืนเงิน ${money(data?.amount || amount)} สำเร็จ\n` +
            `คืนสะสม ${money(data?.refunded_total || refundedTotal())}\n` +
            `คงเหลือที่คืนได้ ${money(data?.remaining_refundable || refundRemaining())}`
        )

    } catch (error) {
        console.error('Refund error:', error)
        let text = error.message || 'บันทึกคืนเงินไม่สำเร็จ'

        if (text.includes('SALE_MUST_BE_VOIDED_FIRST'))
            text = 'ต้อง VOID บิลก่อนจึงจะคืนเงินได้'
        else if (text.includes('REFUND_PERMISSION_DENIED'))
            text = 'เฉพาะ Manager / Admin เท่านั้นที่คืนเงินได้'
        else if (text.includes('REFUND_EXCEEDS_REMAINING'))
            text = 'จำนวนเงินคืนเกินยอดคงเหลือ'
        else if (text.includes('SALE_ALREADY_FULLY_REFUNDED'))
            text = 'บิลนี้คืนเงินครบแล้ว'
        else if (text.includes('REFUND_REASON_REQUIRED'))
            text = 'กรุณาระบุเหตุผลการคืนเงิน'

        message(el.refundMessage,text)
    } finally {
        el.confirmRefundBtn.disabled = false
        el.confirmRefundBtn.textContent = 'ยืนยันคืนเงิน'
    }
}


/* ========================================
   VOID MODAL
======================================== */

function openVoidModal() {
    const sale =
        state.selectedSale


    if (!sale) {
        return
    }


    if (
        sale.status ===
        'cancelled'
    ) {
        alert(
            'บิลนี้ถูก VOID แล้ว'
        )

        return
    }


    el.voidInvoiceText.textContent =
        sale.invoice_no ||
        '-'


    el.voidReasonInput.value =
        ''

    el.voidPinInput.value =
        ''


    message(
        el.voidMessage,
        ''
    )


    el.voidModal
        .classList
        .remove('hidden')


    setTimeout(
        () => {
            el.voidReasonInput
                .focus()
        },
        100
    )
}


function closeVoidModal() {
    el.voidModal
        .classList
        .add('hidden')


    el.voidReasonInput.value =
        ''

    el.voidPinInput.value =
        ''


    message(
        el.voidMessage,
        ''
    )
}


/* ========================================
   CONFIRM VOID
======================================== */

async function confirmVoidSale() {
    const sale =
        state.selectedSale


    if (!sale) {
        message(
            el.voidMessage,
            'ไม่พบข้อมูลบิล'
        )

        return
    }


    if (
        sale.status ===
        'cancelled'
    ) {
        message(
            el.voidMessage,
            'บิลนี้ถูก VOID แล้ว'
        )

        return
    }


    const reason =
        el.voidReasonInput.value
            .trim()


    const managerPin =
        el.voidPinInput.value
            .trim()


    if (!reason) {
        message(
            el.voidMessage,
            'กรุณาระบุเหตุผลในการ VOID'
        )

        el.voidReasonInput
            .focus()

        return
    }


    if (!managerPin) {
        message(
            el.voidMessage,
            'กรุณากรอก PIN ผู้อนุมัติ'
        )

        el.voidPinInput
            .focus()

        return
    }


    if (
        !/^\d{6}$/.test(
            managerPin
        )
    ) {
        message(
            el.voidMessage,
            'PIN ผู้อนุมัติต้องเป็นตัวเลข 6 หลัก'
        )

        el.voidPinInput
            .focus()

        return
    }


    const confirmed =
        confirm(
            `ยืนยัน VOID บิล ${sale.invoice_no} หรือไม่?\n\nระบบจะตรวจสอบ PIN ผู้อนุมัติ และคืนวัตถุดิบของบิลนี้กลับเข้าสต็อก`
        )


    if (!confirmed) {
        return
    }


    const saleId =
        sale.id


    el.confirmVoidBtn.disabled =
        true


    el.confirmVoidBtn.textContent =
        'กำลังตรวจสอบ...'


    message(
        el.voidMessage,
        ''
    )


    try {
        const {
            data,
            error
        } =
            await supabase.rpc(
                'void_sale',
                {
                    p_sale_id:
                        saleId,

                    p_reason:
                        reason,

                    p_manager_pin:
                        managerPin
                }
            )


        if (error) {
            throw error
        }


        console.log(
            'VOID sale:',
            data
        )

        /*
         * Restore the V3.3 extra stock layer (Modifier/Extra +
         * DINE-IN/TAKEAWAY). Existing void_sale continues to restore
         * the BASE/BOM layer. This RPC is idempotent.
         */
        const { error: extraRestoreError } =
            await supabase.rpc(
                'jokjung_restore_sale_rule_stock',
                { p_sale_id: saleId }
            )

        if (extraRestoreError) {
            console.error(
                'Restore extra sale stock error:',
                extraRestoreError
            )
            alert(
                `VOID บิลสำเร็จ แต่คืน Stock ตัวเลือก/DINE-IN/TAKEAWAY ไม่สำเร็จ\n${extraRestoreError.message || ''}`
            )
        }


        closeVoidModal()


        /*
         * โหลดรายการขายใหม่
         * เพื่อให้ Summary อัปเดต
         */
        await loadSales()


        /*
         * เปิดรายละเอียดบิลเดิมใหม่
         */
        await openSaleDetail(
            saleId
        )


        alert(
            `VOID บิล ${data?.invoice_no ||
            sale.invoice_no
            } สำเร็จ\nคืนวัตถุดิบเข้าสต็อกแล้ว`
        )


    } catch (error) {
        console.error(
            'VOID sale error:',
            error
        )


        let text =
            error.message ||
            'VOID บิลไม่สำเร็จ'


        if (
            text.includes(
                'VOID_REASON_REQUIRED'
            )
        ) {
            text =
                'กรุณาระบุเหตุผลในการ VOID'
        }


        if (
            text.includes(
                'MANAGER_PIN_REQUIRED'
            )
        ) {
            text =
                'กรุณากรอก PIN ผู้อนุมัติ'
        }


        if (
            text.includes(
                'INVALID_MANAGER_PIN_FORMAT'
            )
        ) {
            text =
                'รูปแบบ PIN ผู้อนุมัติไม่ถูกต้อง'
        }


        if (
            text.includes(
                'INVALID_MANAGER_PIN'
            )
            ||
            text.includes(
                'MANAGER_PIN_INVALID'
            )
        ) {
            text =
                'PIN ผู้อนุมัติไม่ถูกต้อง'
        }


        if (
            text.includes(
                'MANAGER_NOT_FOUND'
            )
        ) {
            text =
                'ไม่พบผู้จัดการหรือผู้ดูแลที่มีสิทธิ์อนุมัติ'
        }


        if (
            text.includes(
                'SALE_ALREADY_VOIDED'
            )
        ) {
            text =
                'บิลนี้ถูก VOID ไปแล้ว'
        }


        if (
            text.includes(
                'SALE_NOT_FOUND'
            )
        ) {
            text =
                'ไม่พบบิลที่ต้องการ VOID'
        }


        if (
            text.includes(
                'SALE_NOT_COMPLETED'
            )
        ) {
            text =
                'บิลนี้ไม่อยู่ในสถานะที่สามารถ VOID ได้'
        }


        if (
            text.includes(
                'SALE_STOCK_MOVEMENT_NOT_FOUND'
            )
        ) {
            text =
                'ไม่พบประวัติการตัดวัตถุดิบของบิลนี้ จึงยังไม่สามารถคืนสต็อกได้'
        }


        if (
            text.includes(
                'BRANCH_NOT_ALLOWED'
            )
        ) {
            text =
                'บัญชีนี้ไม่มีสิทธิ์ VOID บิลของสาขานี้'
        }


        message(
            el.voidMessage,
            text
        )


    } finally {
        el.confirmVoidBtn.disabled =
            false


        el.confirmVoidBtn.textContent =
            'ยืนยัน VOID'
    }
}


/* ========================================
   RECEIPT
======================================== */

function buildReceipt() {
    const sale =
        state.selectedSale


    if (!sale) {
        return
    }


    el.receiptBranch.textContent =
        state.branch?.name ||
        '-'


    el.receiptInvoice.textContent =
        sale.invoice_no ||
        '-'


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
            .map(
                item => `

                    <div class="receipt-item">

                        <div
                            class="
                                receipt-item-name
                            "
                        >
                            ${esc(
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

                                ${Number(
                        item.quantity
                    )
                        .toLocaleString(
                            'th-TH'
                        )
                    }

                                ×

                                ${money(
                        item.unit_price
                    )
                    }

                            </span>


                            <strong>
                                ${money(
                        item.total_price
                    )
                    }
                            </strong>

                        </div>

                    </div>

                `
            )
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


    /*
     * VOID / REFUND RECEIPT DETAIL V2.4.1
     * เอกสารพิมพ์จากบิลที่ VOID ต้องแสดง audit trail
     * และรายการคืนเงินจริงทุกครั้ง
     */
    const isVoided =
        sale.status === 'cancelled'

    const refunds =
        state.selectedRefunds || []

    const active =
        refunds.filter(
            row => !row.reversed_at
        )

    const totalRefunded =
        active.reduce(
            (sum, row) =>
                sum +
                Number(row.amount || 0),
            0
        )

    const remaining =
        Math.max(
            Number(sale.total || 0) -
            totalRefunded,
            0
        )


    if (el.receiptDocumentStatusWrap) {
        el.receiptDocumentStatusWrap
            .classList
            .toggle(
                'hidden',
                !isVoided
            )
    }


    if (el.receiptDocumentStatus) {
        el.receiptDocumentStatus.textContent =
            isVoided
                ? (
                    totalRefunded > 0.009
                        ? (
                            remaining <= 0.009
                                ? 'เอกสาร VOID / REFUND COMPLETE'
                                : 'เอกสาร VOID / PARTIAL REFUND'
                        )
                        : 'เอกสาร VOID'
                )
                : 'ใบเสร็จรับเงิน'
    }


    if (el.receiptVoidWrap) {
        el.receiptVoidWrap
            .classList
            .toggle(
                'hidden',
                !isVoided
            )
    }


    if (isVoided) {
        if (el.receiptVoidReason) {
            el.receiptVoidReason.textContent =
                sale.void_reason || '-'
        }

        if (el.receiptVoidedBy) {
            el.receiptVoidedBy.textContent =
                getProfileName(
                    sale.voided_by
                )
        }

        if (el.receiptVoidedAt) {
            el.receiptVoidedAt.textContent =
                formatDateTime(
                    sale.voided_at
                )
        }
    }


    if (el.receiptRefundWrap) {
        el.receiptRefundWrap
            .classList
            .toggle(
                'hidden',
                !isVoided
            )
    }


    if (isVoided) {
        if (el.receiptOriginalTotal) {
            el.receiptOriginalTotal.textContent =
                money(
                    sale.total
                )
        }

        if (el.receiptRefundedTotal) {
            el.receiptRefundedTotal.textContent =
                money(
                    totalRefunded
                )
        }

        if (el.receiptRefundRemaining) {
            el.receiptRefundRemaining.textContent =
                money(
                    remaining
                )
        }

        if (el.receiptRefundHistory) {
            el.receiptRefundHistory.innerHTML =
                refunds.length
                    ? refunds.map(
                        (row, index) => `
                            <div class="receipt-refund-entry ${row.reversed_at ? 'is-reversed' : ''}">
                                <div class="receipt-refund-no">
                                    คืนเงิน #${index + 1}
                                    ${row.reversed_at ? ' (REVERSED)' : ''}
                                </div>

                                <div class="receipt-row">
                                    <span>จำนวน</span>
                                    <strong>${money(row.amount)}</strong>
                                </div>

                                <div class="receipt-row">
                                    <span>วิธีคืน</span>
                                    <strong>${esc(paymentLabel(row.refund_method))}</strong>
                                </div>

                                ${
                                    row.reference_no
                                        ? `
                                            <div class="receipt-row">
                                                <span>Ref.</span>
                                                <strong>${esc(row.reference_no)}</strong>
                                            </div>
                                        `
                                        : ''
                                }

                                <div class="receipt-row receipt-wrap-row">
                                    <span>เหตุผล</span>
                                    <strong>${esc(row.reason || '-')}</strong>
                                </div>

                                <div class="receipt-row receipt-wrap-row">
                                    <span>ผู้คืนเงิน</span>
                                    <strong>${esc(row.refunded_by_name || '-')}</strong>
                                </div>

                                <div class="receipt-row receipt-wrap-row">
                                    <span>เวลาคืน</span>
                                    <strong>${esc(formatDateTime(row.refunded_at))}</strong>
                                </div>

                                ${
                                    row.reversed_at
                                        ? `
                                            <div class="receipt-row receipt-wrap-row">
                                                <span>เหตุผลย้อนรายการ</span>
                                                <strong>${esc(row.reversal_reason || '-')}</strong>
                                            </div>
                                        `
                                        : ''
                                }
                            </div>
                        `
                    ).join('')
                    : `
                        <div class="receipt-refund-empty">
                            ยังไม่มีการคืนเงินจริง
                        </div>
                    `
        }
    }
}


/* ========================================
   PRINT
======================================== */

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


/* ========================================
   CLOSE DETAIL
======================================== */

function closeDetail() {
    el.detailModal
        .classList
        .add('hidden')


    state.selectedSale =
        null


    state.selectedItems =
        []
}


/* ========================================
   TODAY
======================================== */

function getLocalDateInputValue(
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


/* ========================================
   CLEAR FILTER
======================================== */

function clearFilters() {
    el.searchInput.value =
        ''

    el.dateFrom.value =
        ''

    el.dateTo.value =
        ''

    el.paymentFilter.value =
        ''


    applyFilters()
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

        /*
         * ROLE GUARD
         *
         * Admin   = เข้าได้
         * Manager = เข้าได้
         * Staff   = เข้าได้
         */
        const guard =
            await applyRoleGuard()


        if (!guard) {
            return
        }


        /*
         * ตรวจ Session
         */
        const session =
            await requireSession()


        if (!session) {
            return
        }


        /*
         * โหลด Profile
         */
        await loadProfile(
            session.user.id
        )


        /*
         * โหลดสาขา
         */
        await loadBranch()


        /*
         * แสดงชื่อผู้ใช้ / สาขา
         */
        renderUser()


        /*
         * โหลดประวัติการขาย
         */
        await loadSales()


    } catch (error) {

        console.error(
            'Sales history init error:',
            error
        )


        if (el.loadingState) {

            el.loadingState
                .classList
                .add('hidden')
        }


        if (el.emptyState) {

            el.emptyState
                .classList
                .remove('hidden')


            el.emptyState.textContent =
                error.message
                ||
                'โหลดประวัติการขายไม่สำเร็จ'
        }
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


/* DETAIL */

el.closeDetailBtn.onclick =
    closeDetail


el.closeDetailBottomBtn.onclick =
    closeDetail


el.printReceiptBtn.onclick =
    printReceipt


/* OPEN VOID */

el.voidSaleBtn.onclick =
    openVoidModal


/* VOID MODAL */

el.closeVoidBtn.onclick =
    closeVoidModal


el.cancelVoidBtn.onclick =
    closeVoidModal


el.confirmVoidBtn.onclick =
    confirmVoidSale

/* REFUND V2.4 */
el.refundSaleBtn.onclick =
    openRefundModal

el.closeRefundBtn.onclick =
    closeRefundModal

el.cancelRefundBtn.onclick =
    closeRefundModal

el.confirmRefundBtn.onclick =
    confirmRefund


/*
 * คลิกพื้นหลัง Detail
 */
el.detailModal.onclick =
    event => {

        if (
            event.target ===
            el.detailModal
        ) {
            closeDetail()
        }
    }


/*
 * คลิกพื้นหลัง VOID
 */
el.voidModal.onclick =
    event => {

        if (
            event.target ===
            el.voidModal
        ) {
            closeVoidModal()
        }
    }


/*
 * คลิกพื้นหลัง Refund
 */
el.refundModal.onclick =
    event => {
        if (event.target === el.refundModal) {
            closeRefundModal()
        }
    }

/*
 * ESC
 */
document.addEventListener(
    'keydown',
    event => {

        if (
            event.key !==
            'Escape'
        ) {
            return
        }


        if (
            !el.refundModal
                .classList
                .contains('hidden')
        ) {
            closeRefundModal()
            return
        }

        /*
         * ถ้า VOID modal เปิดอยู่
         * ให้ปิด VOID ก่อน
         */
        if (
            !el.voidModal
                .classList
                .contains('hidden')
        ) {
            closeVoidModal()

            return
        }


        /*
         * ถ้า Detail เปิดอยู่
         */
        if (
            !el.detailModal
                .classList
                .contains('hidden')
        ) {
            closeDetail()
        }
    }
)


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
