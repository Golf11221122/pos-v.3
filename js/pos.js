import { supabase } from './supabase.js'
import { PROMPTPAY_PHONE } from './config.js'

/* ========================================
   STATE
======================================== */

const state = {
    session: null,
    profile: null,
    branch: null,

    categories: [],
    products: [],

    // จำนวนสินค้าที่สามารถขายได้จาก BOM
    availability: new Map(),

    selectedCategory: '',

    // ตะกร้าสินค้า
    cart: new Map(),

    // วิธีชำระเงิน
    paymentMethod: 'cash',

    // บิลล่าสุด
    lastSale: null,

    // กะขายปัจจุบัน
    currentShift: null,

    // ระบบออเดอร์ร้านอาหาร
    tables: [],
    currentOrder: null,
    orderType: 'dine_in',
    selectedTableId: null,
    guestCount: 1
}


/* ========================================
   ELEMENT HELPERS
======================================== */

const $ = id =>
    document.getElementById(id)


const el = {

    /* HEADER */

    backBtn:
        $('backBtn'),

    logoutBtn:
        $('logoutBtn'),

    branchText:
        $('branchText'),

    userName:
        $('userName'),


    /* CATALOG */

    searchInput:
        $('searchInput'),

    refreshBtn:
        $('refreshBtn'),

    categoryTabs:
        $('categoryTabs'),

    loading:
        $('loading'),

    empty:
        $('empty'),

    productGrid:
        $('productGrid'),


    /* CART */

    cartCount:
        $('cartCount'),

    clearCartBtn:
        $('clearCartBtn'),

    emptyCart:
        $('emptyCart'),

    cartItems:
        $('cartItems'),

    subtotalText:
        $('subtotalText'),

    discountInput:
        $('discountInput'),

    totalText:
        $('totalText'),

    checkoutBtn:
        $('checkoutBtn'),

    pageMessage:
        $('pageMessage'),


    /* ========================================
       MOBILE CART
    ======================================== */

    mobileCartBar:
        $('mobileCartBar'),

    mobileCartCount:
        $('mobileCartCount'),

    mobileCartTotal:
        $('mobileCartTotal'),

    mobileCartClose:
        $('mobileCartClose'),

    cartPanel:
        $('cartPanel'),

    cartBackdrop:
        $('cartBackdrop'),


    /* START ORDER */

    orderStartModal:
        $('orderStartModal'),

    closeOrderStartBtn:
        $('closeOrderStartBtn'),

    tableSelectSection:
        $('tableSelectSection'),

    tableGrid:
        $('tableGrid'),

    guestMinusBtn:
        $('guestMinusBtn'),

    guestPlusBtn:
        $('guestPlusBtn'),

    guestCountText:
        $('guestCountText'),

    orderStartMessage:
        $('orderStartMessage'),

    startOrderBtn:
        $('startOrderBtn'),


    /* PAYMENT */

    /* PAYMENT */

    paymentModal:
        $('paymentModal'),

    closePaymentBtn:
        $('closePaymentBtn'),

    cancelPaymentBtn:
        $('cancelPaymentBtn'),

    paymentTotalText:
        $('paymentTotalText'),

    cashSection:
        $('cashSection'),

    qrSection:
        $('qrSection'),

    receivedInput:
        $('receivedInput'),

    quickCash:
        $('quickCash'),

    changeText:
        $('changeText'),

    saleNote:
        $('saleNote'),

    paymentMessage:
        $('paymentMessage'),

    confirmPaymentBtn:
        $('confirmPaymentBtn'),


    /* PROMPTPAY */

    promptpayQr:
        $('promptpayQr'),

    qrAmountText:
        $('qrAmountText'),


    /* SUCCESS */

    successModal:
        $('successModal'),

    invoiceText:
        $('invoiceText'),

    successTotal:
        $('successTotal'),

    successChange:
        $('successChange'),

    newSaleBtn:
        $('newSaleBtn'),


    /* RECEIPT */

    printReceiptBtn:
        $('printReceiptBtn'),

    receiptPrint:
        $('receiptPrint'),

    receiptBranch:
        $('receiptBranch'),

    receiptInvoice:
        $('receiptInvoice'),

    receiptDate:
        $('receiptDate'),

    receiptCashier:
        $('receiptCashier'),

    receiptOrderType:
        $('receiptOrderType'),

    receiptTable:
        $('receiptTable'),

    receiptGuestCount:
        $('receiptGuestCount'),

    receiptOrderId:
        $('receiptOrderId'),

    receiptOrderNote:
        $('receiptOrderNote'),

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
        $('receiptPayment')
}


/* ========================================
   HELPERS
======================================== */

const esc = value =>
    String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')


const money = value =>
    new Intl.NumberFormat(
        'th-TH',
        {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }
    ).format(
        Number(value || 0)
    )


const items = () =>
    [...state.cart.values()]


const subtotal = () =>
    items().reduce(
        (sum, item) =>
            sum +
            (
                Number(item.price) *
                Number(item.quantity)
            ),
        0
    )


const discount = () =>
    Math.max(
        Number(
            el.discountInput?.value ||
            0
        ),
        0
    )


const total = () =>
    Math.max(
        subtotal() -
        discount(),
        0
    )


function msg(
    target,
    text = ''
) {

    if (!target) {
        return
    }

    target.textContent =
        text
}


/* ========================================
   PROMPTPAY QR
======================================== */

function formatTLV(
    id,
    value
) {

    return (
        `${id}${String(
            value.length
        ).padStart(
            2,
            '0'
        )}${value}`
    )
}


function crc16(
    payload
) {

    let crc =
        0xFFFF


    for (
        let i = 0;
        i < payload.length;
        i++
    ) {

        crc ^=
            payload.charCodeAt(i)
            <<
            8


        for (
            let j = 0;
            j < 8;
            j++
        ) {

            if (
                (crc & 0x8000)
                !==
                0
            ) {

                crc =
                    (crc << 1)
                    ^
                    0x1021

            } else {

                crc <<=
                    1
            }


            crc &=
                0xFFFF
        }
    }


    return crc
        .toString(16)
        .toUpperCase()
        .padStart(
            4,
            '0'
        )
}


function normalizePromptPayPhone(
    phone
) {

    const cleaned =
        String(
            phone || ''
        )
            .replace(
                /\D/g,
                ''
            )


    if (
        !/^0\d{9}$/.test(
            cleaned
        )
    ) {

        throw new Error(
            'เบอร์ PromptPay ต้องเป็นเบอร์ไทย 10 หลัก'
        )
    }


    return (
        `0066${cleaned.substring(1)}`
    )
}


function generatePromptPayPayload(
    phone,
    amount
) {

    const numericAmount =
        Number(amount)


    if (
        !Number.isFinite(
            numericAmount
        )
        ||
        numericAmount <= 0
    ) {

        throw new Error(
            'ยอดเงินสำหรับ QR ไม่ถูกต้อง'
        )
    }


    const target =
        normalizePromptPayPhone(
            phone
        )


    const merchantAccount =
        formatTLV(
            '00',
            'A000000677010111'
        )
        +
        formatTLV(
            '01',
            target
        )


    let payload =
        ''


    payload +=
        formatTLV(
            '00',
            '01'
        )


    payload +=
        formatTLV(
            '01',
            '12'
        )


    payload +=
        formatTLV(
            '29',
            merchantAccount
        )


    payload +=
        formatTLV(
            '53',
            '764'
        )


    payload +=
        formatTLV(
            '54',
            numericAmount.toFixed(2)
        )


    payload +=
        formatTLV(
            '58',
            'TH'
        )


    payload +=
        formatTLV(
            '59',
            'PROMPTPAY'
        )


    payload +=
        formatTLV(
            '60',
            'BANGKOK'
        )


    payload +=
        '6304'


    return (
        payload +
        crc16(payload)
    )
}


function renderPromptPayQr() {

    if (
        !el.promptpayQr
        ||
        !el.qrAmountText
    ) {

        console.warn(
            'ไม่พบ promptpayQr หรือ qrAmountText ใน pos.html'
        )

        return
    }


    const amount =
        total()


    el.promptpayQr.innerHTML =
        ''


    el.qrAmountText.textContent =
        money(amount)


    try {

        if (
            !window.QRCode
        ) {

            throw new Error(
                'ไม่พบ QRCode library'
            )
        }


        const payload =
            generatePromptPayPayload(
                PROMPTPAY_PHONE,
                amount
            )


        new window.QRCode(
            el.promptpayQr,
            {
                text:
                    payload,

                width:
                    220,

                height:
                    220,

                correctLevel:
                    window
                        .QRCode
                        .CorrectLevel
                        .M
            }
        )

    } catch (error) {

        console.error(
            'PromptPay QR error:',
            error
        )


        el.promptpayQr.innerHTML =
            `
            <p style="
                color:#d93025;
                text-align:center;
                padding:15px;
            ">
                ${esc(error.message)}
            </p>
            `
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
    id
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
                'id,full_name,role,branch_id'
            )
            .eq(
                'id',
                id
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
            'ไม่พบสาขา'
        )
    }


    state.branch =
        data
}


/* ========================================
   CURRENT SHIFT
======================================== */

async function loadCurrentShift() {

    const {
        data,
        error
    } =
        await supabase.rpc(
            'get_current_shift'
        )


    if (error) {

        console.error(
            'Load current shift error:',
            error
        )


        state.currentShift =
            null


        updateShiftSaleState()


        throw error
    }


    const shift =
        Array.isArray(data)

            ? (
                data[0]
                ||
                null
            )

            : (
                data
                ||
                null
            )


    /*
     * ป้องกันกรณี RPC
     * ส่งกะของสาขาอื่นกลับมา
     */
    if (
        shift?.branch_id
        &&
        state.profile?.branch_id
        &&
        shift.branch_id
        !==
        state.profile.branch_id
    ) {

        console.warn(
            'Current shift belongs to another branch:',
            shift
        )


        state.currentShift =
            null

    } else {

        state.currentShift =
            shift
    }


    updateShiftSaleState()


    return state.currentShift
}


/* ========================================
   CHECK OPEN SHIFT
======================================== */

function hasOpenShift() {

    const shift =
        state.currentShift


    if (!shift) {
        return false
    }


    if (
        shift.status !== undefined
        &&
        shift.status !== null
    ) {

        const status =
            String(
                shift.status
            )
                .trim()
                .toLowerCase()


        if (
            ![
                'open',
                'opened',
                'active'
            ].includes(
                status
            )
        ) {

            return false
        }
    }


    if (
        shift.closed_at
        ||
        shift.close_at
        ||
        shift.ended_at
    ) {

        return false
    }


    return true
}


/* ========================================
   UPDATE POS SALE STATE
======================================== */

function updateShiftSaleState() {

    const canSell =
        hasOpenShift()


    const hasItems =
        items().length >
        0


    if (
        el.checkoutBtn
    ) {

        el.checkoutBtn.disabled =
            !canSell
            ||
            !hasItems
    }


    if (
        !canSell
        &&
        el.pageMessage
    ) {

        msg(
            el.pageMessage,
            'ยังไม่ได้เปิดกะ กรุณาเปิดกะก่อนเริ่มขาย'
        )

    } else if (
        canSell
        &&
        el.pageMessage?.textContent?.includes(
            'ยังไม่ได้เปิดกะ'
        )
    ) {

        msg(
            el.pageMessage,
            ''
        )
    }
}


/* ========================================
   REQUIRE OPEN SHIFT
======================================== */

async function requireOpenShift() {

    try {

        await loadCurrentShift()

    } catch (error) {

        console.error(
            'Shift check error:',
            error
        )


        msg(
            el.pageMessage,
            'ตรวจสอบกะไม่สำเร็จ กรุณาลองใหม่'
        )


        return false
    }


    if (
        !hasOpenShift()
    ) {

        msg(
            el.pageMessage,
            'ยังไม่ได้เปิดกะ หรือกะถูกปิดแล้ว กรุณาเปิดกะก่อนขาย'
        )


        return false
    }


    return true
}

/* ========================================
   MOBILE CART
======================================== */

function openMobileCart() {

    if (
        window.innerWidth >
        760
    ) {
        return
    }


    el.cartPanel
        ?.classList
        .add(
            'mobile-open'
        )


    el.cartBackdrop
        ?.classList
        .add(
            'show'
        )


    document.body.style.overflow =
        'hidden'
}


function closeMobileCart() {

    el.cartPanel
        ?.classList
        .remove(
            'mobile-open'
        )


    el.cartBackdrop
        ?.classList
        .remove(
            'show'
        )


    document.body.style.overflow =
        ''
}


/* ========================================
   ORDER SYSTEM
======================================== */

function resetOrderDraft() {

    state.orderType =
        'dine_in'

    state.selectedTableId =
        null

    state.guestCount =
        1


    renderOrderType()

    renderGuestCount()

    renderTables()
}


function orderTypeText() {

    return state.orderType ===
        'dine_in'

        ? 'ทานที่ร้าน'

        : 'กลับบ้าน'
}


function getSelectedTable() {

    return state.tables.find(
        table =>
            table.id ===
            state.selectedTableId
    ) || null
}


function renderOrderContext() {

    if (
        !el.branchText
        ||
        !state.branch
    ) {
        return
    }


    if (
        !state.currentOrder
    ) {

        el.branchText.textContent =
            `สาขา: ${state.branch.name}`

        return
    }


    if (
        state.currentOrder.order_type ===
        'dine_in'
    ) {

        const tableName =
            state.currentOrder.table_name
            ||
            'โต๊ะ'


        el.branchText.textContent =
            `${state.branch.name} • ${tableName} • ${state.currentOrder.guest_count} คน`

    } else {

        el.branchText.textContent =
            `${state.branch.name} • กลับบ้าน • ${state.currentOrder.guest_count} คน`
    }
}


function renderOrderType() {

    document
        .querySelectorAll(
            '.order-type-btn'
        )
        .forEach(
            button => {

                button
                    .classList
                    .toggle(
                        'active',
                        button.dataset.orderType ===
                        state.orderType
                    )
            }
        )


    if (
        el.tableSelectSection
    ) {

        el.tableSelectSection
            .classList
            .toggle(
                'hidden',
                state.orderType !==
                'dine_in'
            )
    }
}


function renderGuestCount() {

    if (
        el.guestCountText
    ) {

        el.guestCountText.textContent =
            `${state.guestCount.toLocaleString('th-TH')} คน`
    }


    if (
        el.guestMinusBtn
    ) {

        el.guestMinusBtn.disabled =
            state.guestCount <= 1
    }
}


function tableStatusText(
    status
) {

    const value =
        String(
            status ||
            'available'
        )
            .trim()
            .toLowerCase()


    const map = {
        available: 'ว่าง',
        occupied: 'มีลูกค้า',
        reserved: 'จอง',
        disabled: 'ปิดใช้งาน'
    }


    return map[value]
        ||
        value
}


function renderTables() {

    if (
        !el.tableGrid
    ) {
        return
    }


    if (
        !state.tables.length
    ) {

        el.tableGrid.innerHTML =
            `
            <div class="state">
                ยังไม่มีโต๊ะในสาขานี้
            </div>
            `

        return
    }


    el.tableGrid.innerHTML =
        state.tables
            .map(
                table => {

                    const status =
                        String(
                            table.status ||
                            'available'
                        )
                            .trim()
                            .toLowerCase()


                    const available =
                        status ===
                        'available'


                    const selected =
                        table.id ===
                        state.selectedTableId


                    return `
                        <button
                            type="button"
                            class="table-select-btn ${selected ? 'active' : ''}"
                            data-table-id="${esc(table.id)}"
                            ${available ? '' : 'disabled'}
                        >
                            <strong>
                                ${esc(
                        table.table_name
                        ||
                        `โต๊ะ ${table.table_no}`
                    )}
                            </strong>

                            <small>
                                ${tableStatusText(status)}
                                • ${Number(table.capacity || 0).toLocaleString('th-TH')} ที่
                            </small>
                        </button>
                    `
                }
            )
            .join('')
}


async function loadRestaurantTables() {

    const {
        data,
        error
    } =
        await supabase
            .from(
                'restaurant_tables'
            )
            .select(`
                id,
                branch_id,
                table_no,
                table_name,
                capacity,
                status,
                qr_token,
                is_active
            `)
            .eq(
                'branch_id',
                state.profile.branch_id
            )
            .eq(
                'is_active',
                true
            )
            .order(
                'table_no',
                {
                    ascending: true
                }
            )


    if (error) {
        throw error
    }


    state.tables =
        data || []


    if (
        state.selectedTableId
    ) {

        const stillAvailable =
            state.tables.some(
                table =>
                    table.id ===
                    state.selectedTableId
                    &&
                    String(table.status).toLowerCase() ===
                    'available'
            )


        if (
            !stillAvailable
        ) {

            state.selectedTableId =
                null
        }
    }


    renderTables()


    return state.tables
}


async function openOrderStartModal() {

    if (
        !el.orderStartModal
    ) {
        return
    }


    closeMobileCart()


    msg(
        el.orderStartMessage,
        ''
    )


    try {

        await loadRestaurantTables()

    } catch (error) {

        console.error(
            'Load restaurant tables error:',
            error
        )


        msg(
            el.orderStartMessage,
            error.message ||
            'โหลดข้อมูลโต๊ะไม่สำเร็จ'
        )
    }


    renderOrderType()

    renderGuestCount()

    renderTables()


    if (
        el.closeOrderStartBtn
    ) {

        el.closeOrderStartBtn.disabled =
            !state.currentOrder
    }


    el.orderStartModal
        .classList
        .remove(
            'hidden'
        )
}


function closeOrderStartModal() {

    if (
        !state.currentOrder
    ) {

        msg(
            el.orderStartMessage,
            'กรุณาเริ่มออเดอร์ก่อนเลือกสินค้า'
        )

        return
    }


    el.orderStartModal
        ?.classList
        .add(
            'hidden'
        )
}


async function startRestaurantOrder() {

    if (
        state.currentOrder
    ) {

        el.orderStartModal
            ?.classList
            .add(
                'hidden'
            )

        return
    }


    const shiftReady =
        await requireOpenShift()


    if (
        !shiftReady
    ) {

        msg(
            el.orderStartMessage,
            'กรุณาเปิดกะก่อนเริ่มออเดอร์'
        )

        return
    }


    if (
        state.orderType ===
        'dine_in'
        &&
        !state.selectedTableId
    ) {

        msg(
            el.orderStartMessage,
            'กรุณาเลือกโต๊ะ'
        )

        return
    }


    if (
        state.guestCount < 1
    ) {

        msg(
            el.orderStartMessage,
            'จำนวนลูกค้าไม่ถูกต้อง'
        )

        return
    }


    if (
        el.startOrderBtn
    ) {

        el.startOrderBtn.disabled =
            true

        el.startOrderBtn.textContent =
            'กำลังเริ่มออเดอร์...'
    }


    try {

        const selectedTable =
            getSelectedTable()


        const {
            data,
            error
        } =
            await supabase.rpc(
                'create_restaurant_order',
                {
                    p_branch_id:
                        state.profile.branch_id,

                    p_shift_id:
                        state.currentShift?.id
                        ||
                        null,

                    p_order_type:
                        state.orderType,

                    p_table_id:
                        state.orderType ===
                            'dine_in'

                            ? state.selectedTableId

                            : null,

                    p_guest_count:
                        state.guestCount,

                    p_order_source:
                        'pos',

                    p_note:
                        null
                }
            )


        if (error) {
            throw error
        }


        const order =
            Array.isArray(data)

                ? data[0]

                : data


        if (
            !order?.id
        ) {

            throw new Error(
                'สร้างออเดอร์ไม่สำเร็จ'
            )
        }


        state.currentOrder = {
            ...order,
            table_name:
                selectedTable?.table_name
                ||
                (
                    selectedTable
                        ? `โต๊ะ ${selectedTable.table_no}`
                        : null
                )
        }


        if (
            state.orderType ===
            'dine_in'
            &&
            state.selectedTableId
        ) {

            const table =
                state.tables.find(
                    item =>
                        item.id ===
                        state.selectedTableId
                )


            if (table) {
                table.status =
                    'occupied'
            }
        }


        renderTables()

        renderOrderContext()


        el.orderStartModal
            .classList
            .add(
                'hidden'
            )


        msg(
            el.pageMessage,
            state.currentOrder.order_type === 'dine_in'
                ? `${state.currentOrder.table_name} • ${state.currentOrder.guest_count} คน`
                : `กลับบ้าน • ${state.currentOrder.guest_count} คน`
        )


        setTimeout(
            () => {

                if (
                    el.pageMessage?.textContent ===
                    (
                        state.currentOrder?.order_type === 'dine_in'
                            ? `${state.currentOrder?.table_name} • ${state.currentOrder?.guest_count} คน`
                            : `กลับบ้าน • ${state.currentOrder?.guest_count} คน`
                    )
                ) {

                    msg(
                        el.pageMessage,
                        ''
                    )
                }
            },
            1800
        )


    } catch (error) {

        console.error(
            'Create restaurant order error:',
            error
        )


        let errorMessage =
            error.message ||
            'เริ่มออเดอร์ไม่สำเร็จ'


        if (
            errorMessage.includes(
                'TABLE_REQUIRED'
            )
        ) {

            errorMessage =
                'กรุณาเลือกโต๊ะ'
        }


        if (
            errorMessage.includes(
                'INVALID_TABLE'
            )
        ) {

            errorMessage =
                'โต๊ะนี้ไม่สามารถใช้งานได้ กรุณาเลือกโต๊ะใหม่'

            await loadRestaurantTables()
        }


        if (
            errorMessage.includes(
                'INVALID_GUEST_COUNT'
            )
        ) {

            errorMessage =
                'จำนวนลูกค้าไม่ถูกต้อง'
        }


        msg(
            el.orderStartMessage,
            errorMessage
        )


    } finally {

        if (
            el.startOrderBtn
        ) {

            el.startOrderBtn.disabled =
                false

            el.startOrderBtn.textContent =
                'เริ่มออเดอร์'
        }
    }
}


async function completeCurrentOrder() {

    if (
        !state.currentOrder?.id
    ) {
        return
    }


    try {

        const {
            error
        } =
            await supabase.rpc(
                'complete_restaurant_order',
                {
                    p_order_id:
                        state.currentOrder.id
                }
            )


        if (error) {
            throw error
        }


        if (
            state.currentOrder.table_id
        ) {

            const table =
                state.tables.find(
                    item =>
                        item.id ===
                        state.currentOrder.table_id
                )


            if (table) {
                table.status =
                    'available'
            }
        }


    } catch (error) {

        console.error(
            'Complete restaurant order error:',
            error
        )

        /*
         * การขายถูกบันทึกไปแล้ว จึงไม่ throw ซ้ำ
         * เพื่อป้องกันการสร้างบิลซ้ำ
         */
    }
}


/* ========================================
   CATALOG
======================================== */

async function loadCatalog() {

    el.loading
        .classList
        .remove(
            'hidden'
        )


    el.empty
        .classList
        .add(
            'hidden'
        )


    el.productGrid
        .classList
        .add(
            'hidden'
        )


    try {

        const [
            categoriesResult,
            productsResult
        ] =
            await Promise.all([
                supabase
                    .from(
                        'categories'
                    )
                    .select(
                        'id,name,display_order'
                    )
                    .eq(
                        'branch_id',
                        state.profile.branch_id
                    )
                    .eq(
                        'is_active',
                        true
                    )
                    .order(
                        'display_order'
                    ),

                supabase
                    .from(
                        'products'
                    )
                    .select(`
                        id,
                        category_id,
                        name,
                        sku,
                        barcode,
                        price,
                        cost,
                        image_url,
                        display_order
                    `)
                    .eq(
                        'branch_id',
                        state.profile.branch_id
                    )
                    .eq(
                        'is_active',
                        true
                    )
                    .order(
                        'display_order'
                    )
                    .order(
                        'name'
                    )
            ])


        if (
            categoriesResult.error
        ) {

            throw categoriesResult.error
        }


        if (
            productsResult.error
        ) {

            throw productsResult.error
        }


        state.categories =
            categoriesResult.data
            ||
            []


        state.products =
            productsResult.data
            ||
            []


        renderCategories()


        await loadAvailability()


        renderProducts()


    } finally {

        el.loading
            .classList
            .add(
                'hidden'
            )
    }
}


/* ========================================
   AVAILABILITY / BOM
======================================== */

async function loadAvailability() {

    const {
        data,
        error
    } =
        await supabase.rpc(
            'get_pos_product_availability',
            {
                p_branch_id:
                    state.profile.branch_id
            }
        )


    if (error) {

        console.error(
            'Load availability error:',
            error
        )


        throw error
    }


    state.availability
        .clear()


    for (
        const row
        of
        data || []
    ) {

        state.availability.set(
            row.product_id,
            {
                available_qty:
                    Math.max(
                        Number(
                            row.available_qty
                            ||
                            0
                        ),
                        0
                    ),

                limiting_ingredient_id:
                    row.limiting_ingredient_id
                    ||
                    null,

                limiting_ingredient_name:
                    row.limiting_ingredient_name
                    ||
                    null
            }
        )
    }
}


function getAvailability(
    productId
) {

    return (
        state.availability
            .get(
                productId
            )
        ||
        {
            available_qty:
                0,

            limiting_ingredient_id:
                null,

            limiting_ingredient_name:
                null
        }
    )
}


/* ========================================
   USER
======================================== */

function renderUser() {

    el.userName.textContent =
        state.profile.full_name
        ||
        state.session
            .user
            .email
            .split('@')[0]


    el.branchText.textContent =
        `สาขา: ${state.branch.name}`
}


/* ========================================
   CATEGORIES
======================================== */

function renderCategories() {

    el.categoryTabs.innerHTML =
        `
        <button
            class="tab ${!state.selectedCategory
            ? 'active'
            : ''
        }"
            data-cat=""
            type="button"
        >
            ทั้งหมด
        </button>
        `
        +
        state.categories
            .map(
                category =>
                    `
                    <button
                        class="tab ${state.selectedCategory
                        ===
                        category.id
                        ? 'active'
                        : ''
                    }"
                        data-cat="${esc(
                        category.id
                    )}"
                        type="button"
                    >
                        ${esc(
                        category.name
                    )}
                    </button>
                    `
            )
            .join('')
}


/* ========================================
   FILTER PRODUCTS
======================================== */

function filtered() {

    const keyword =
        el.searchInput
            .value
            .trim()
            .toLowerCase()


    return state.products
        .filter(
            product => {

                const categoryMatch =
                    !state.selectedCategory
                    ||
                    product.category_id
                    ===
                    state.selectedCategory


                const searchText =
                    [
                        product.name,
                        product.sku,
                        product.barcode
                    ]
                        .filter(
                            Boolean
                        )
                        .join(' ')
                        .toLowerCase()


                const searchMatch =
                    !keyword
                    ||
                    searchText.includes(
                        keyword
                    )


                return (
                    categoryMatch
                    &&
                    searchMatch
                )
            }
        )
}


/* ========================================
   PRODUCTS
======================================== */

function renderProducts() {

    const list =
        filtered()


    if (
        !list.length
    ) {

        el.empty
            .classList
            .remove(
                'hidden'
            )


        el.productGrid
            .classList
            .add(
                'hidden'
            )


        return
    }


    el.empty
        .classList
        .add(
            'hidden'
        )


    el.productGrid
        .classList
        .remove(
            'hidden'
        )


    el.productGrid.innerHTML =
        list
            .map(
                product => {

                    const availability =
                        getAvailability(
                            product.id
                        )


                    const availableQty =
                        Math.floor(
                            availability
                                .available_qty
                        )


                    const soldOut =
                        availableQty <=
                        0


                    /*
                     * บนมือถือ:
                     * แสดงเฉพาะ
                     * - หมด
                     * - ใกล้หมด <= 10
                     */
                    let stockText =
                        ''


                    if (
                        soldOut
                    ) {

                        stockText =
                            `
        <div
            class="stock-status stock-out"
            style="
                margin-top:6px;
                font-size:13px;
                font-weight:700;
                color:#d93025;
            "
        >
            สินค้าหมด
        </div>
        `

                    } else {

                        stockText =
                            `
        <div
            class="stock-status stock-available"
            style="
                margin-top:6px;
                font-size:12px;
                font-weight:700;
                color:#188038;
            "
        >
            ขายได้อีก
            ${availableQty.toLocaleString(
                                'th-TH'
                            )}
            จาน
        </div>
        `
                    }


                    return `
                        <article
                            class="
                                product-card
                                ${soldOut
                            ? 'sold-out'
                            : ''
                        }
                            "
                        >

                            <button
                                type="button"
                                data-add="${esc(
                            product.id
                        )}"
                                ${soldOut
                            ? 'disabled'
                            : ''
                        }
                            >

                                <div
                                    class="product-image"
                                >

                                    ${product.image_url

                            ? `
                                                <img
                                                    src="${esc(
                                product.image_url
                            )}"
                                                    alt="${esc(
                                product.name
                            )}"
                                                    onerror="
                                                        this.parentElement.innerHTML='🍽️'
                                                    "
                                                >
                                            `

                            : '🍽️'
                        }

                                </div>


                                <div
                                    class="product-info"
                                >

                                    <h3>
                                        ${esc(
                            product.name
                        )}
                                    </h3>


                                    ${stockText}


                                    <div>

                                        <strong>
                                            ${money(
                            product.price
                        )}
                                        </strong>


                                        ${soldOut

                            ? `
                                                    <span
                                                        style="
                                                            color:#d93025;
                                                            font-weight:700;
                                                        "
                                                    >
                                                        หมด
                                                    </span>
                                                `

                            : `
                                                    <span
                                                        class="plus"
                                                    >
                                                        ＋
                                                    </span>
                                                `
                        }

                                    </div>

                                </div>

                            </button>

                        </article>
                    `
                }
            )
            .join('')
}


/* ========================================
   ADD PRODUCT
======================================== */

function add(
    id
) {

    if (
        !state.currentOrder
    ) {

        msg(
            el.pageMessage,
            'กรุณาเริ่มออเดอร์ก่อนเลือกสินค้า'
        )

        openOrderStartModal()

        return
    }


    const product =
        state.products.find(
            item =>
                item.id ===
                id
        )


    if (!product) {
        return
    }


    const availability =
        getAvailability(
            id
        )


    const availableQty =
        Math.floor(
            availability
                .available_qty
        )


    if (
        availableQty <=
        0
    ) {

        msg(
            el.pageMessage,
            'สินค้านี้หมด เนื่องจากวัตถุดิบไม่เพียงพอ'
        )


        return
    }


    const old =
        state.cart.get(
            id
        )


    const currentQty =
        old?.quantity
        ||
        0


    if (
        currentQty >=
        availableQty
    ) {

        msg(
            el.pageMessage,
            `เพิ่มไม่ได้ สามารถขาย ${product.name} ได้สูงสุด ${availableQty} จาน`
        )


        return
    }


    if (old) {

        old.quantity++

    } else {

        state.cart.set(
            id,
            {
                ...product,
                quantity: 1
            }
        )
    }


    msg(
        el.pageMessage,
        ''
    )


    renderCart()
}


/* ========================================
   CHANGE CART QTY
======================================== */

function qty(
    id,
    change
) {

    const item =
        state.cart.get(
            id
        )


    if (!item) {
        return
    }


    if (
        change >
        0
    ) {

        const availability =
            getAvailability(
                id
            )


        const availableQty =
            Math.floor(
                availability
                    .available_qty
            )


        if (
            item.quantity >=
            availableQty
        ) {

            msg(
                el.pageMessage,
                `เพิ่มไม่ได้ สามารถขาย ${item.name} ได้สูงสุด ${availableQty} จาน`
            )


            return
        }
    }


    item.quantity +=
        change


    if (
        item.quantity <=
        0
    ) {

        state.cart.delete(
            id
        )
    }


    msg(
        el.pageMessage,
        ''
    )


    renderCart()
}


/* ========================================
   CART
======================================== */

function renderCart() {

    const list =
        items()


    const count =
        list.reduce(
            (
                sum,
                item
            ) =>
                sum +
                item.quantity,
            0
        )


    /*
     * Desktop count
     */
    if (
        el.cartCount
    ) {

        el.cartCount.textContent =
            `${count.toLocaleString(
                'th-TH'
            )} รายการ`
    }


    /*
     * Mobile count
     */
    if (
        el.mobileCartCount
    ) {

        el.mobileCartCount.textContent =
            `${count.toLocaleString(
                'th-TH'
            )} รายการ`
    }


    /*
     * Mobile total
     */
    if (
        el.mobileCartTotal
    ) {

        el.mobileCartTotal.textContent =
            money(
                total()
            )
    }


    el.emptyCart
        .classList
        .toggle(
            'hidden',
            Boolean(
                list.length
            )
        )


    el.cartItems
        .classList
        .toggle(
            'hidden',
            !list.length
        )


    el.cartItems.innerHTML =
        list
            .map(
                item =>
                    `
                    <div
                        class="cart-item"
                    >

                        <div>

                            <strong>
                                ${esc(
                        item.name
                    )}
                            </strong>


                            <small>
                                ${money(
                        item.price
                    )}
                                ×
                                ${item.quantity}
                            </small>


                            <div
                                class="qty"
                            >

                                <button
                                    type="button"
                                    data-act="dec"
                                    data-id="${esc(
                        item.id
                    )}"
                                >
                                    −
                                </button>


                                <b>
                                    ${item.quantity}
                                </b>


                                <button
                                    type="button"
                                    data-act="inc"
                                    data-id="${esc(
                        item.id
                    )}"
                                >
                                    ＋
                                </button>


                                <button
                                    type="button"
                                    class="remove"
                                    data-act="remove"
                                    data-id="${esc(
                        item.id
                    )}"
                                >
                                    ลบ
                                </button>

                            </div>

                        </div>


                        <strong>
                            ${money(
                        Number(
                            item.price
                        )
                        *
                        item.quantity
                    )}
                        </strong>

                    </div>
                    `
            )
            .join('')


    el.subtotalText.textContent =
        money(
            subtotal()
        )


    el.totalText.textContent =
        money(
            total()
        )


    el.checkoutBtn.disabled =
        !list.length
        ||
        !hasOpenShift()


    if (
        !hasOpenShift()
    ) {

        msg(
            el.pageMessage,
            'ยังไม่ได้เปิดกะ กรุณาเปิดกะก่อนเริ่มขาย'
        )

    } else {

        msg(
            el.pageMessage,

            discount() >
                subtotal()

                ? 'ส่วนลดมากกว่ายอดสินค้า'

                : ''
        )
    }
}


/* ========================================
   PAYMENT
======================================== */

async function openPayment() {

    if (
        !items().length
        ||
        discount() >
        subtotal()
    ) {

        return
    }


    /*
     * เช็กกะล่าสุดก่อนชำระ
     */
    const shiftReady =
        await requireOpenShift()


    if (
        !shiftReady
    ) {

        return
    }


    /*
     * ถ้าเปิดจากมือถือ
     * ปิด Bottom Sheet ก่อน
     */
    closeMobileCart()


    state.paymentMethod =
        'cash'


    el.paymentModal
        .classList
        .remove(
            'hidden'
        )


    el.paymentTotalText.textContent =
        money(
            total()
        )


    el.receivedInput.value =
        ''


    el.saleNote.value =
        ''


    document
        .querySelectorAll(
            '.method'
        )
        .forEach(
            button => {

                button
                    .classList
                    .toggle(
                        'active',
                        button.dataset.method
                        ===
                        'cash'
                    )
            }
        )


    el.cashSection
        .classList
        .remove(
            'hidden'
        )


    el.qrSection
        .classList
        .add(
            'hidden'
        )


    renderQuickCash()


    updateChange()


    msg(
        el.paymentMessage,
        ''
    )
}


function closePayment() {

    el.paymentModal
        .classList
        .add(
            'hidden'
        )
}


/* ========================================
   QUICK CASH
======================================== */

function renderQuickCash() {

    const amount =
        total()


    const values =
        [
            amount,

            Math.ceil(
                amount / 20
            )
            *
            20,

            Math.ceil(
                amount / 100
            )
            *
            100,

            500,

            1000
        ]
            .filter(
                (
                    value,
                    index,
                    array
                ) =>
                    value >=
                    amount
                    &&
                    array.indexOf(
                        value
                    )
                    ===
                    index
            )
            .slice(
                0,
                4
            )


    el.quickCash.innerHTML =
        values
            .map(
                value =>
                    `
                    <button
                        type="button"
                        data-cash="${value}"
                    >
                        ${value.toLocaleString(
                        'th-TH'
                    )}
                    </button>
                    `
            )
            .join('')
}


/* ========================================
   CHANGE
======================================== */

function updateChange() {

    const received =
        Number(
            el.receivedInput
                .value
            ||
            0
        )


    el.changeText.textContent =
        money(
            Math.max(
                received -
                total(),
                0
            )
        )
}


/* ========================================
   RECEIPT QUEUE DISPLAY
======================================== */

function setupReceiptQueueDisplay(
    sale
) {

    if (
        !el.receiptPrint
    ) {
        return
    }


    /*
     * หา / สร้างกล่องเลขคิวเพียง 1 กล่อง
     * ป้องกันการซ้ำเวลาที่ renderReceipt()
     * ถูกเรียกทั้งตอนขายสำเร็จและตอนกดพิมพ์
     */
    let queueBox =
        el.receiptPrint
            .querySelector(
                '.receipt-queue-box'
            )


    const originalQueueElement =
        document.getElementById(
            'receiptOrderId'
        )


    if (
        !queueBox
    ) {

        /*
         * ใช้แถวเลขคิวเดิมใน HTML เป็นกล่องหลัก
         */
        const originalRow =
            originalQueueElement
                ?.closest(
                    'div'
                )


        if (
            !originalRow
        ) {
            return
        }


        queueBox =
            originalRow


        queueBox.className =
            'receipt-queue-box'


        queueBox.innerHTML =
            `
            <div class="receipt-queue-label">
                เลขคิว / QUEUE NO.
            </div>

            <div
                id="receiptOrderId"
                class="receipt-queue-number"
            >
                -
            </div>
            `


        /*
         * ย้ายขึ้นไปไว้ใต้ชื่อร้าน
         * ก่อนเส้นคั่นแรก
         */
        const firstHr =
            el.receiptPrint
                .querySelector(
                    'hr'
                )


        if (
            firstHr
        ) {

            el.receiptPrint
                .insertBefore(
                    queueBox,
                    firstHr
                )
        }
    }


    /*
     * อัปเดต reference ทุกครั้ง
     * เพราะ innerHTML อาจสร้าง element ใหม่
     */
    el.receiptOrderId =
        queueBox
            .querySelector(
                '#receiptOrderId'
            )


    /*
     * เลขคิวแสดงเฉพาะ "กลับบ้าน"
     */
    if (
        sale.order_type !==
        'takeaway'
    ) {

        queueBox.style.display =
            'none'


        return
    }


    const queueNo =
        Number(
            sale.queue_no
            ||
            0
        )


    if (
        queueNo <=
        0
    ) {

        queueBox.style.display =
            'none'


        return
    }


    queueBox.style.display =
        ''


    if (
        el.receiptOrderId
    ) {

        el.receiptOrderId.textContent =
            String(
                queueNo
            ).padStart(
                3,
                '0'
            )
    }


    /*
     * CSS กล่องเลขคิว
     * ขนาดเล็กลงประมาณ 20%
     */
    if (
        !document.getElementById(
            'receiptQueuePrintStyle'
        )
    ) {

        const style =
            document.createElement(
                'style'
            )


        style.id =
            'receiptQueuePrintStyle'


        style.textContent =
            `
            .receipt-queue-box {
                margin: 7px 0 8px;
                padding: 5px 7px 6px;
                border: 2px solid #d93025;
                border-radius: 8px;
                text-align: center;
                color: #d93025;
                background: #fff;
            }

            .receipt-queue-label {
                font-size: 13px;
                line-height: 1.15;
                font-weight: 800;
                letter-spacing: .2px;
            }

            .receipt-queue-number {
                margin-top: 1px;
                font-size: 38px;
                line-height: .95;
                font-weight: 900;
                letter-spacing: 3px;
            }

            @media print {

                .receipt-queue-box {
                    display: block !important;
                    margin: 7px 0 8px !important;
                    padding: 5px 7px 6px !important;
                    border: 2px solid #000 !important;
                    border-radius: 7px !important;
                    text-align: center !important;
                    color: #000 !important;
                    background: #fff !important;
                    break-inside: avoid !important;
                }

                .receipt-queue-label {
                    font-size: 13px !important;
                    line-height: 1.15 !important;
                    font-weight: 800 !important;
                }

                .receipt-queue-number {
                    margin-top: 1px !important;
                    font-size: 38px !important;
                    line-height: .95 !important;
                    font-weight: 900 !important;
                    letter-spacing: 3px !important;
                }
            }
            `


        document.head.appendChild(
            style
        )
    }
}


/* ========================================
   RECEIPT
======================================== */

function renderReceipt() {

    const sale =
        state.lastSale


    if (!sale) {
        return
    }


    if (
        el.receiptBranch
    ) {

        el.receiptBranch.textContent =
            state.branch?.name
            ||
            '-'
    }


    if (
        el.receiptInvoice
    ) {

        el.receiptInvoice.textContent =
            sale.invoice_no
            ||
            '-'
    }


    if (
        el.receiptDate
    ) {

        el.receiptDate.textContent =
            new Intl.DateTimeFormat(
                'th-TH',
                {
                    dateStyle:
                        'short',

                    timeStyle:
                        'medium'
                }
            ).format(
                sale.created_at
            )
    }


    if (
        el.receiptCashier
    ) {

        el.receiptCashier.textContent =
            state.profile
                ?.full_name
            ||
            state.session
                ?.user
                ?.email
                ?.split('@')[0]
            ||
            '-'
    }


    if (
        el.receiptOrderType
    ) {

        el.receiptOrderType.textContent =
            sale.order_type ===
                'dine_in'

                ? 'ทานที่ร้าน'

                : sale.order_type ===
                    'takeaway'

                    ? 'กลับบ้าน'

                    : '-'
    }


    if (
        el.receiptTable
    ) {

        el.receiptTable.textContent =
            sale.order_type ===
                'dine_in'

                ? (
                    sale.table_name
                    ||
                    '-'
                )

                : '-'
    }


    if (
        el.receiptGuestCount
    ) {

        el.receiptGuestCount.textContent =
            `${Number(
                sale.guest_count
                ||
                1
            ).toLocaleString(
                'th-TH'
            )} คน`
    }


    /*
     * แสดงเลขคิวเด่นเฉพาะออเดอร์กลับบ้าน
     */
    setupReceiptQueueDisplay(
        sale
    )


    if (
        el.receiptOrderNote
    ) {

        const note =
            sale.order_note
            ||
            ''

        el.receiptOrderNote.textContent =
            note
            ||
            '-'

        const noteRow =
            el.receiptOrderNote
                .closest(
                    '.receipt-order-note-row'
                )

        if (
            noteRow
        ) {

            noteRow.style.display =
                note
                    ? ''
                    : 'none'
        }
    }


    if (
        el.receiptItems
    ) {

        el.receiptItems.innerHTML =
            sale.items
                .map(
                    item =>
                        `
                        <div
                            class="receipt-item"
                        >

                            <div
                                class="receipt-item-name"
                            >
                                ${esc(
                            item.name
                        )}
                            </div>


                            <div
                                class="receipt-item-line"
                            >

                                <span>
                                    ${item.quantity}
                                    ×
                                    ${money(
                            item.price
                        )}
                                </span>


                                <strong>
                                    ${money(
                            Number(
                                item.price
                            )
                            *
                            item.quantity
                        )}
                                </strong>

                            </div>

                        </div>
                        `
                )
                .join('')
    }


    if (
        el.receiptSubtotal
    ) {

        el.receiptSubtotal.textContent =
            money(
                sale.subtotal
            )
    }


    if (
        el.receiptDiscount
    ) {

        el.receiptDiscount.textContent =
            money(
                sale.discount
            )
    }


    if (
        el.receiptTotal
    ) {

        el.receiptTotal.textContent =
            money(
                sale.total
            )
    }


    if (
        el.receiptReceived
    ) {

        el.receiptReceived.textContent =
            money(
                sale.received_amount
            )
    }


    if (
        el.receiptChange
    ) {

        el.receiptChange.textContent =
            money(
                sale.change_amount
            )
    }


    if (
        el.receiptPayment
    ) {

        el.receiptPayment.textContent =
            sale.payment_method
                ===
                'cash'

                ? 'เงินสด'

                : 'QR'
    }
}


function printReceipt() {

    if (
        !state.lastSale
    ) {

        alert(
            'ยังไม่มีข้อมูลใบเสร็จ'
        )


        return
    }


    renderReceipt()


    window.print()
}


/* ========================================
   CONFIRM PAYMENT
======================================== */

async function confirmPayment() {

    /*
     * เช็กกะอีกครั้งก่อนสร้างบิล
     */
    const shiftReady =
        await requireOpenShift()


    if (
        !shiftReady
    ) {

        msg(
            el.paymentMessage,
            'กะขายไม่ได้เปิดอยู่ กรุณาเปิดกะก่อนบันทึกการขาย'
        )


        return
    }


    const received =
        state.paymentMethod
            ===
            'cash'

            ? Number(
                el.receivedInput.value
                ||
                0
            )

            : total()


    if (
        state.paymentMethod
        ===
        'cash'
        &&
        received <
        total()
    ) {

        msg(
            el.paymentMessage,
            'จำนวนเงินที่รับมายังไม่ครบ'
        )


        return
    }


    /*
     * เก็บ snapshot
     * สำหรับใบเสร็จ
     */
    const saleSnapshot = {

        items:
            items()
                .map(
                    item => ({
                        id:
                            item.id,

                        name:
                            item.name,

                        price:
                            Number(
                                item.price
                            ),

                        quantity:
                            item.quantity
                    })
                ),

        subtotal:
            subtotal(),

        discount:
            discount(),

        total:
            total(),

        received_amount:
            received,

        payment_method:
            state.paymentMethod,

        /*
         * เก็บข้อมูลออเดอร์ไว้ในใบเสร็จ
         * ก่อน completeCurrentOrder()
         */
        order_id:
            state.currentOrder?.id
            ||
            null,

        queue_no:
            Number(
                state.currentOrder?.queue_no
                ||
                0
            ),

        order_type:
            state.currentOrder?.order_type
            ||
            state.orderType
            ||
            null,

        table_id:
            state.currentOrder?.table_id
            ||
            null,

        table_name:
            state.currentOrder?.table_name
            ||
            null,

        guest_count:
            Number(
                state.currentOrder?.guest_count
                ||
                state.guestCount
                ||
                1
            ),

        order_source:
            state.currentOrder?.order_source
            ||
            'pos',

        order_note:
            el.saleNote
                ?.value
                ?.trim()
            ||
            null,

        created_at:
            new Date()
    }


    el.confirmPaymentBtn.disabled =
        true


    el.confirmPaymentBtn.textContent =
        'กำลังบันทึก...'


    try {

        const {
            data,
            error
        } =
            await supabase.rpc(
                'create_pos_sale',
                {
                    p_branch_id:
                        state.profile.branch_id,

                    p_discount:
                        saleSnapshot.discount,

                    p_payment_method:
                        saleSnapshot.payment_method,

                    p_received_amount:
                        saleSnapshot.received_amount,

                    p_note:
                        el.saleNote
                            .value
                            .trim()
                        ||
                        null,

                    p_items:
                        saleSnapshot
                            .items
                            .map(
                                item => ({
                                    product_id:
                                        item.id,

                                    quantity:
                                        item.quantity
                                })
                            )
                }
            )


        if (error) {

            throw error
        }


        state.lastSale = {

            ...saleSnapshot,


            invoice_no:
                data.invoice_no,


            subtotal:
                Number(
                    data.subtotal
                    ??
                    saleSnapshot.subtotal
                ),


            discount:
                Number(
                    data.discount
                    ??
                    saleSnapshot.discount
                ),


            total:
                Number(
                    data.total
                    ??
                    saleSnapshot.total
                ),


            received_amount:
                Number(
                    data.received_amount
                    ??
                    saleSnapshot.received_amount
                ),


            change_amount:
                Number(
                    data.change_amount
                    ??
                    Math.max(
                        received -
                        saleSnapshot.total,
                        0
                    )
                ),


            payment_method:
                data.payment_method
                ??
                saleSnapshot.payment_method
        }


        renderReceipt()


        closePayment()


        el.invoiceText.textContent =
            state.lastSale.invoice_no


        el.successTotal.textContent =
            money(
                state.lastSale.total
            )


        el.successChange.textContent =
            money(
                state.lastSale.change_amount
            )


        el.successModal
            .classList
            .remove(
                'hidden'
            )


        /*
         * ปิดออเดอร์และคืนสถานะโต๊ะ
         * หลังบันทึกการขายสำเร็จ
         */
        await completeCurrentOrder()

        /*
* ล้างตะกร้าหลังชำระเงินสำเร็จ
*/
        state.cart.clear()

        el.discountInput.value = '0'

        renderCart()


        /*
         * โหลดจำนวนที่ขายได้ใหม่
         * หลังตัดวัตถุดิบ
         */
        await loadAvailability()


        renderProducts()


    } catch (error) {

        console.error(
            'Create sale error:',
            error
        )


        let errorMessage =
            error.message
            ||
            'บันทึกการขายไม่สำเร็จ'


        /*
         * ไม่มีกะเปิด
         */
        if (
            errorMessage.includes(
                'SHIFT_NOT_OPEN'
            )
            ||
            errorMessage.includes(
                'NO_OPEN_SHIFT'
            )
        ) {

            errorMessage =
                'ยังไม่ได้เปิดกะ หรือกะถูกปิดแล้ว กรุณาเปิดกะก่อนขาย'


            state.currentShift =
                null


            updateShiftSaleState()
        }


        /*
         * ไม่มี BOM
         */
        if (
            errorMessage.includes(
                'PRODUCT_RECIPE_NOT_FOUND'
            )
        ) {

            errorMessage =
                'สินค้าบางรายการยังไม่ได้กำหนดสูตรวัตถุดิบ'
        }


        /*
         * วัตถุดิบไม่พอ
         */
        if (
            errorMessage.includes(
                'INSUFFICIENT_INGREDIENT_STOCK'
            )
        ) {

            const detail =
                errorMessage
                    .split(
                        'INSUFFICIENT_INGREDIENT_STOCK:'
                    )[1]
                    ?.trim()


            errorMessage =
                detail

                    ? `วัตถุดิบไม่เพียงพอ: ${detail}`

                    : 'วัตถุดิบไม่เพียงพอสำหรับการขาย'
        }


        /*
         * เงินสดไม่พอ
         */
        if (
            errorMessage.includes(
                'INSUFFICIENT_CASH'
            )
        ) {

            errorMessage =
                'จำนวนเงินที่รับไม่เพียงพอ'
        }


        /*
         * Product / Quantity ผิด
         */
        if (
            errorMessage.includes(
                'INVALID_PRODUCT_OR_QUANTITY'
            )
        ) {

            errorMessage =
                'พบสินค้าหรือจำนวนสินค้าไม่ถูกต้อง'
        }


        msg(
            el.paymentMessage,
            errorMessage
        )


    } finally {

        el.confirmPaymentBtn.disabled =
            false


        el.confirmPaymentBtn.textContent =
            'ยืนยันการชำระเงิน'
    }
}


/* ========================================
   NEW SALE
======================================== */

async function newSale() {

    state.cart.clear()


    state.lastSale =
        null


    state.currentOrder =
        null


    el.discountInput.value =
        '0'


    el.successModal
        .classList
        .add(
            'hidden'
        )


    resetOrderDraft()


    renderOrderContext()


    msg(
        el.pageMessage,
        ''
    )


    renderCart()


    await openOrderStartModal()
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
         * ตรวจ Session
         */
        const session =
            await requireSession()


        if (
            !session
        ) {

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
         * แสดงข้อมูลผู้ใช้
         */
        renderUser()


        /*
         * โหลดกะปัจจุบัน
         */
        try {

            await loadCurrentShift()

        } catch (shiftError) {

            console.error(
                'Initial shift load error:',
                shiftError
            )


            state.currentShift =
                null
        }


        /*
         * โหลดสินค้า
         */
        await loadCatalog()


        /*
         * แสดงตะกร้า
         */
        renderCart()


        /*
         * ตรวจสถานะกะ
         */
        updateShiftSaleState()


        /*
         * โหลดโต๊ะและเปิดหน้าต่างเริ่มออเดอร์
         */
        resetOrderDraft()

        await loadRestaurantTables()

        await openOrderStartModal()


    } catch (error) {

        console.error(
            'POS init error:',
            error
        )


        msg(
            el.pageMessage,
            error.message
            ||
            'โหลดข้อมูล POS ไม่สำเร็จ'
        )


        if (
            el.loading
        ) {

            el.loading
                .classList
                .add(
                    'hidden'
                )
        }
    }
}


/* ========================================
   EVENTS
======================================== */


/* ========================================
   BACK
======================================== */

el.backBtn
    ?.addEventListener(
        'click',
        () => {

            location.href =
                './dashboard.html'
        }
    )


/* ========================================
   LOGOUT
======================================== */

el.logoutBtn
    ?.addEventListener(
        'click',
        logout
    )


/* ========================================
   SEARCH
======================================== */

el.searchInput
    ?.addEventListener(
        'input',
        renderProducts
    )


/* ========================================
   REFRESH
======================================== */

el.refreshBtn
    ?.addEventListener(
        'click',
        async () => {

            try {

                msg(
                    el.pageMessage,
                    ''
                )


                /*
                 * ตรวจสถานะกะใหม่
                 */
                await loadCurrentShift()


                /*
                 * โหลดสินค้าใหม่
                 */
                await loadCatalog()


                /*
                 * อัปเดตตะกร้า
                 */
                renderCart()


                /*
                 * อัปเดตสถานะปุ่มขาย
                 */
                updateShiftSaleState()


            } catch (error) {

                console.error(
                    'Refresh error:',
                    error
                )


                msg(
                    el.pageMessage,
                    error.message
                    ||
                    'รีเฟรชข้อมูลไม่สำเร็จ'
                )
            }
        }
    )


/* ========================================
   CATEGORY
======================================== */

el.categoryTabs
    ?.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-cat]'
                )


            if (!button) {

                return
            }


            state.selectedCategory =
                button.dataset.cat


            renderCategories()


            renderProducts()
        }
    )


/* ========================================
   PRODUCT
======================================== */

el.productGrid
    ?.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-add]'
                )


            if (!button) {

                return
            }


            if (
                button.disabled
            ) {

                return
            }


            add(
                button.dataset.add
            )
        }
    )


/* ========================================
   CART ITEMS
======================================== */

el.cartItems
    ?.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-act]'
                )


            if (!button) {

                return
            }


            const id =
                button.dataset.id


            const action =
                button.dataset.act


            if (
                action ===
                'inc'
            ) {

                qty(
                    id,
                    1
                )


                return
            }


            if (
                action ===
                'dec'
            ) {

                qty(
                    id,
                    -1
                )


                return
            }


            if (
                action ===
                'remove'
            ) {

                state.cart.delete(
                    id
                )


                msg(
                    el.pageMessage,
                    ''
                )


                renderCart()
            }
        }
    )


/* ========================================
   DISCOUNT
======================================== */

el.discountInput
    ?.addEventListener(
        'input',
        renderCart
    )


/* ========================================
   CLEAR CART
======================================== */

el.clearCartBtn
    ?.addEventListener(
        'click',
        () => {

            if (
                !state.cart.size
            ) {

                return
            }


            const confirmed =
                confirm(
                    'ล้างตะกร้าหรือไม่?'
                )


            if (
                !confirmed
            ) {

                return
            }


            state.cart.clear()


            el.discountInput.value =
                '0'


            msg(
                el.pageMessage,
                ''
            )


            renderCart()
        }
    )


/* ========================================
   MOBILE CART BAR
======================================== */

el.mobileCartBar
    ?.addEventListener(
        'click',
        () => {

            openMobileCart()
        }
    )


/* ========================================
   CLOSE MOBILE CART
======================================== */

el.mobileCartClose
    ?.addEventListener(
        'click',
        () => {

            closeMobileCart()
        }
    )


/* ========================================
   CART BACKDROP
======================================== */

el.cartBackdrop
    ?.addEventListener(
        'click',
        () => {

            closeMobileCart()
        }
    )


/* ========================================
   WINDOW RESIZE
======================================== */

window.addEventListener(
    'resize',
    () => {

        if (
            window.innerWidth >
            760
        ) {

            closeMobileCart()
        }
    }
)


/* ========================================
   START ORDER EVENTS
======================================== */

document
    .querySelectorAll(
        '.order-type-btn'
    )
    .forEach(
        button => {

            button
                .addEventListener(
                    'click',
                    () => {

                        state.orderType =
                            button.dataset.orderType ===
                                'takeaway'

                                ? 'takeaway'

                                : 'dine_in'


                        if (
                            state.orderType ===
                            'takeaway'
                        ) {

                            state.selectedTableId =
                                null
                        }


                        msg(
                            el.orderStartMessage,
                            ''
                        )


                        renderOrderType()

                        renderTables()
                    }
                )
        }
    )


el.tableGrid
    ?.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-table-id]'
                )


            if (
                !button
                ||
                button.disabled
            ) {
                return
            }


            state.selectedTableId =
                button.dataset.tableId


            msg(
                el.orderStartMessage,
                ''
            )


            renderTables()
        }
    )


el.guestMinusBtn
    ?.addEventListener(
        'click',
        () => {

            state.guestCount =
                Math.max(
                    state.guestCount - 1,
                    1
                )


            renderGuestCount()
        }
    )


el.guestPlusBtn
    ?.addEventListener(
        'click',
        () => {

            state.guestCount =
                Math.min(
                    state.guestCount + 1,
                    99
                )


            renderGuestCount()
        }
    )


el.startOrderBtn
    ?.addEventListener(
        'click',
        startRestaurantOrder
    )


el.closeOrderStartBtn
    ?.addEventListener(
        'click',
        closeOrderStartModal
    )


/* ========================================
   CHECKOUT
======================================== */

el.checkoutBtn
    ?.addEventListener(
        'click',
        openPayment
    )


/* ========================================
   PAYMENT METHODS
======================================== */

document
    .querySelectorAll(
        '.method'
    )
    .forEach(
        button => {

            button
                .addEventListener(
                    'click',
                    () => {

                        /*
                         * เปลี่ยนวิธีชำระ
                         */
                        state.paymentMethod =
                            button.dataset.method


                        /*
                         * เปลี่ยนปุ่ม active
                         */
                        document
                            .querySelectorAll(
                                '.method'
                            )
                            .forEach(
                                item => {

                                    item
                                        .classList
                                        .toggle(
                                            'active',
                                            item ===
                                            button
                                        )
                                }
                            )


                        /*
                         * แสดง/ซ่อนเงินสด
                         */
                        el.cashSection
                            .classList
                            .toggle(
                                'hidden',
                                state.paymentMethod
                                !==
                                'cash'
                            )


                        /*
                         * แสดง/ซ่อน QR
                         */
                        el.qrSection
                            .classList
                            .toggle(
                                'hidden',
                                state.paymentMethod
                                !==
                                'qr'
                            )


                        /*
                         * สร้าง QR
                         */
                        if (
                            state.paymentMethod ===
                            'qr'
                        ) {

                            renderPromptPayQr()
                        }


                        msg(
                            el.paymentMessage,
                            ''
                        )
                    }
                )
        }
    )


/* ========================================
   CASH INPUT
======================================== */

el.receivedInput
    ?.addEventListener(
        'input',
        updateChange
    )


/* ========================================
   QUICK CASH
======================================== */

el.quickCash
    ?.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-cash]'
                )


            if (!button) {

                return
            }


            el.receivedInput.value =
                button.dataset.cash


            updateChange()
        }
    )


/* ========================================
   CLOSE PAYMENT
======================================== */

el.closePaymentBtn
    ?.addEventListener(
        'click',
        closePayment
    )


el.cancelPaymentBtn
    ?.addEventListener(
        'click',
        closePayment
    )


/* ========================================
   CONFIRM PAYMENT
======================================== */

el.confirmPaymentBtn
    ?.addEventListener(
        'click',
        confirmPayment
    )


/* ========================================
   PRINT
======================================== */

el.printReceiptBtn
    ?.addEventListener(
        'click',
        printReceipt
    )


/* ========================================
   NEW SALE
======================================== */

el.newSaleBtn
    ?.addEventListener(
        'click',
        newSale
    )


/* ========================================
   ESC KEY
======================================== */

document
    .addEventListener(
        'keydown',
        event => {

            if (
                event.key !==
                'Escape'
            ) {

                return
            }


            /*
             * ปิด Mobile Cart ก่อน
             */
            if (
                el.cartPanel
                    ?.classList
                    .contains(
                        'mobile-open'
                    )
            ) {

                closeMobileCart()


                return
            }


            /*
             * ปิด Start Order Modal เฉพาะเมื่อมีออเดอร์แล้ว
             */
            if (
                el.orderStartModal
                &&
                !el.orderStartModal
                    .classList
                    .contains(
                        'hidden'
                    )
            ) {

                closeOrderStartModal()


                return
            }


            /*
             * ปิด Payment Modal
             */
            if (
                el.paymentModal
                &&
                !el.paymentModal
                    .classList
                    .contains(
                        'hidden'
                    )
            ) {

                closePayment()


                return
            }
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
