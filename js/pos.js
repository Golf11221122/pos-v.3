import { supabase } from './supabase.js'
import { PROMPTPAY_PHONE } from './config.js'

const state = {
    session: null,
    profile: null,
    branch: null,
    categories: [],
    products: [],

    // จำนวนสินค้าที่สามารถขายได้จาก BOM
    availability: new Map(),

    selectedCategory: '',
    cart: new Map(),
    paymentMethod: 'cash',
    lastSale: null
}

const $ = id =>
    document.getElementById(id)

const el = {
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),

    branchText: $('branchText'),
    userName: $('userName'),

    searchInput: $('searchInput'),
    refreshBtn: $('refreshBtn'),

    categoryTabs: $('categoryTabs'),

    loading: $('loading'),
    empty: $('empty'),
    productGrid: $('productGrid'),

    cartCount: $('cartCount'),
    clearCartBtn: $('clearCartBtn'),

    emptyCart: $('emptyCart'),
    cartItems: $('cartItems'),

    subtotalText: $('subtotalText'),
    discountInput: $('discountInput'),
    totalText: $('totalText'),

    checkoutBtn: $('checkoutBtn'),
    pageMessage: $('pageMessage'),

    // PAYMENT
    paymentModal: $('paymentModal'),

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

    // PROMPTPAY
    promptpayQr:
        $('promptpayQr'),

    qrAmountText:
        $('qrAmountText'),

    // SUCCESS
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

    // RECEIPT
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
    [
        ...state.cart.values()
    ]


const subtotal = () =>
    items().reduce(
        (
            sum,
            item
        ) =>
            sum +
            Number(item.price) *
            item.quantity,
        0
    )


const discount = () =>
    Math.max(
        Number(
            el.discountInput.value ||
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
        )
        }${value}`
    )
}


function crc16(payload) {
    let crc =
        0xFFFF

    for (
        let i = 0;
        i < payload.length;
        i++
    ) {
        crc ^=
            payload
                .charCodeAt(i)
            <<
            8

        for (
            let j = 0;
            j < 8;
            j++
        ) {
            if (
                (
                    crc &
                    0x8000
                )
                !==
                0
            ) {
                crc =
                    (
                        crc << 1
                    )
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
        `0066${cleaned.substring(1)
        }`
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
            numericAmount
                .toFixed(2)
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
            <p
                style="
                    color:#d93025;
                    text-align:center;
                    padding:15px;
                "
            >
                ${esc(
                error.message
            )}
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
            throw (
                categoriesResult.error
            )
        }

        if (
            productsResult.error
        ) {
            throw (
                productsResult.error
            )
        }

        state.categories =
            categoriesResult.data ||
            []

        state.products =
            productsResult.data ||
            []

        renderCategories()

        /*
         * โหลดจำนวนสินค้าที่สามารถขายได้
         * หลังโหลดสินค้าเรียบร้อย
         */
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
                            row.available_qty ||
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


    /*
     * Staff ใช้ POS เป็นหน้าหลัก
     * ไม่ให้ย้อนเข้า Dashboard
     */
    if (
        state.profile.role === 'staff'
        &&
        el.backBtn
    ) {
        el.backBtn.style.display =
            'none'
    }
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
                    )
                    }"
                    >
                        ${esc(
                        category.name
                    )
                    }
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
                        availableQty <= 0

                    const stockText =
                        soldOut
                            ? `
                                <div
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
                            : `
                                <div
                                    style="
                                        margin-top:6px;
                                        font-size:12px;
                                        color:#188038;
                                        font-weight:700;
                                    "
                                >
                                    ขายได้อีก
                                    ${availableQty
                                .toLocaleString(
                                    'th-TH'
                                )
                            }
                                    จาน
                                </div>
                            `

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
                                data-add="${esc(
                            product.id
                        )
                        }"

                                ${soldOut
                            ? 'disabled'
                            : ''
                        }

                                style="${soldOut
                            ? 'opacity:.55;cursor:not-allowed;'
                            : ''
                        }"
                            >

                                <div
                                    class="
                                        product-image
                                    "
                                >

                                    ${product.image_url
                            ? `
                                                <img
                                                    src="${esc(
                                product.image_url
                            )
                            }"

                                                    alt="${esc(
                                product.name
                            )
                            }"

                                                    onerror="
                                                        this.parentElement.innerHTML='🍽️'
                                                    "
                                                >
                                            `
                            :
                            '🍽️'
                        }

                                </div>


                                <div
                                    class="
                                        product-info
                                    "
                                >

                                    <h3>
                                        ${esc(
                            product.name
                        )
                        }
                                    </h3>


                                    ${stockText}


                                    <div>

                                        <strong>
                                            ${money(
                            product.price
                        )
                        }
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
   ADD PRODUCT TO CART
======================================== */

function add(id) {
    const product =
        state.products.find(
            item =>
                item.id === id
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
        availableQty <= 0
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
        old?.quantity ||
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

    /*
     * ถ้ากดเพิ่ม
     * ต้องตรวจจำนวนที่ขายได้จาก BOM ก่อน
     */
    if (
        change > 0
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
        item.quantity <= 0
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

    el.cartCount.textContent =
        `${count} รายการ`

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
                    )
                    }
                            </strong>

                            <small>
                                ${money(
                        item.price
                    )
                    }
                                ×
                                ${item.quantity
                    }
                            </small>


                            <div
                                class="qty"
                            >

                                <button
                                    data-act="dec"
                                    data-id="${item.id
                    }"
                                >
                                    −
                                </button>


                                <b>
                                    ${item.quantity
                    }
                                </b>


                                <button
                                    data-act="inc"
                                    data-id="${item.id
                    }"
                                >
                                    ＋
                                </button>


                                <button
                                    class="remove"
                                    data-act="remove"
                                    data-id="${item.id
                    }"
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
                    )
                    }
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

    msg(
        el.pageMessage,

        discount() >
            subtotal()

            ? 'ส่วนลดมากกว่ายอดสินค้า'

            : ''
    )
}


/* ========================================
   PAYMENT
======================================== */

function openPayment() {
    if (
        !items().length
        ||
        discount() >
        subtotal()
    ) {
        return
    }

    state.paymentMethod =
        'cash'

    el.paymentModal
        .classList
        .remove(
            'hidden'
        )

    el.paymentTotalText
        .textContent =
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
                        button
                            .dataset
                            .method
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
                    value >= amount
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
                        data-cash="${value
                    }"
                    >
                        ${value
                        .toLocaleString(
                            'th-TH'
                        )
                    }
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
        el.receiptItems
    ) {
        el.receiptItems.innerHTML =
            sale.items
                .map(
                    item =>
                        `
                        <div
                            class="
                                receipt-item
                            "
                        >

                            <div
                                class="
                                    receipt-item-name
                                "
                            >
                                ${esc(
                            item.name
                        )
                        }
                            </div>


                            <div
                                class="
                                    receipt-item-line
                                "
                            >

                                <span>
                                    ${item.quantity
                        }
                                    ×
                                    ${money(
                            item.price
                        )
                        }
                                </span>


                                <strong>
                                    ${money(
                            Number(
                                item.price
                            )
                            *
                            item.quantity
                        )
                        }
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
        el.receiptSubtotal
            .textContent =
            money(
                sale.subtotal
            )
    }

    if (
        el.receiptDiscount
    ) {
        el.receiptDiscount
            .textContent =
            money(
                sale.discount
            )
    }

    if (
        el.receiptTotal
    ) {
        el.receiptTotal
            .textContent =
            money(
                sale.total
            )
    }

    if (
        el.receiptReceived
    ) {
        el.receiptReceived
            .textContent =
            money(
                sale.received_amount
            )
    }

    if (
        el.receiptChange
    ) {
        el.receiptChange
            .textContent =
            money(
                sale.change_amount
            )
    }

    if (
        el.receiptPayment
    ) {
        el.receiptPayment
            .textContent =
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
    const received =
        state.paymentMethod
            ===
            'cash'

            ? Number(
                el.receivedInput
                    .value
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
     * เก็บ snapshot ก่อนส่ง RPC
     * เพื่อใช้ทำใบเสร็จหลังบันทึกสำเร็จ
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

        created_at:
            new Date()
    }

    el.confirmPaymentBtn
        .disabled =
        true

    el.confirmPaymentBtn
        .textContent =
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
                        state.profile
                            .branch_id,

                    p_discount:
                        saleSnapshot
                            .discount,

                    p_payment_method:
                        saleSnapshot
                            .payment_method,

                    p_received_amount:
                        saleSnapshot
                            .received_amount,

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
                    saleSnapshot
                        .subtotal
                ),

            discount:
                Number(
                    data.discount
                    ??
                    saleSnapshot
                        .discount
                ),

            total:
                Number(
                    data.total
                    ??
                    saleSnapshot
                        .total
                ),

            received_amount:
                Number(
                    data.received_amount
                    ??
                    saleSnapshot
                        .received_amount
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
                saleSnapshot
                    .payment_method
        }

        renderReceipt()

        closePayment()

        el.invoiceText.textContent =
            state.lastSale
                .invoice_no

        el.successTotal.textContent =
            money(
                state.lastSale
                    .total
            )

        el.successChange.textContent =
            money(
                state.lastSale
                    .change_amount
            )

        el.successModal
            .classList
            .remove(
                'hidden'
            )

        /*
         * create_pos_sale()
         * ตัดวัตถุดิบเรียบร้อยแล้ว
         *
         * โหลดจำนวนสินค้าที่ขายได้ใหม่
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
         * สินค้ายังไม่มีสูตร BOM
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
        el.confirmPaymentBtn
            .disabled =
            false

        el.confirmPaymentBtn
            .textContent =
            'ยืนยันการชำระเงิน'
    }
}


/* ========================================
   NEW SALE
======================================== */

function newSale() {
    state.cart.clear()

    state.lastSale =
        null

    el.discountInput.value =
        '0'

    el.successModal
        .classList
        .add(
            'hidden'
        )

    msg(
        el.pageMessage,
        ''
    )

    renderCart()
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

        // POS อนุญาต Admin / Manager / Staff
        const session = await requireSession()

        if (!session) {
            return
        }

        await loadProfile(session.user.id)

        await loadBranch()

        renderUser()

        await loadCatalog()

        renderCart()

    } catch (error) {

        console.error(
            'POS init error:',
            error
        )

        msg(
            el.pageMessage,
            error.message ||
            'โหลดข้อมูล POS ไม่สำเร็จ'
        )

        if (el.loading) {
            el.loading.classList.add('hidden')
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


/* SEARCH */

el.searchInput.oninput =
    renderProducts


/* REFRESH */

el.refreshBtn.onclick =
    async () => {
        try {
            msg(
                el.pageMessage,
                ''
            )

            await loadCatalog()

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


/* CATEGORY */

el.categoryTabs.onclick =
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


/* PRODUCT */

el.productGrid.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-add]'
            )

        if (!button) {
            return
        }

        /*
         * disabled button จะไม่ควรเข้ามาตรงนี้
         * แต่เช็กซ้ำไว้เพื่อความปลอดภัย
         */
        if (
            button.disabled
        ) {
            return
        }

        add(
            button.dataset.add
        )
    }


/* CART */

el.cartItems.onclick =
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


/* DISCOUNT */

el.discountInput.oninput =
    renderCart


/* CLEAR CART */

el.clearCartBtn.onclick =
    () => {
        if (
            !state.cart.size
        ) {
            return
        }

        if (
            confirm(
                'ล้างตะกร้าหรือไม่?'
            )
        ) {
            state.cart.clear()

            el.discountInput.value =
                '0'

            msg(
                el.pageMessage,
                ''
            )

            renderCart()
        }
    }


/* CHECKOUT */

el.checkoutBtn.onclick =
    openPayment


/* PAYMENT METHODS */

document
    .querySelectorAll(
        '.method'
    )
    .forEach(
        button => {

            button.onclick =
                () => {

                    state.paymentMethod =
                        button
                            .dataset
                            .method

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

                    el.cashSection
                        .classList
                        .toggle(
                            'hidden',
                            state.paymentMethod
                            !==
                            'cash'
                        )

                    el.qrSection
                        .classList
                        .toggle(
                            'hidden',
                            state.paymentMethod
                            !==
                            'qr'
                        )

                    if (
                        state.paymentMethod
                        ===
                        'qr'
                    ) {
                        renderPromptPayQr()
                    }

                    msg(
                        el.paymentMessage,
                        ''
                    )
                }
        }
    )


/* CASH INPUT */

el.receivedInput.oninput =
    updateChange


/* QUICK CASH */

el.quickCash.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-cash]'
            )

        if (!button) {
            return
        }

        el.receivedInput.value =
            button
                .dataset
                .cash

        updateChange()
    }


/* CLOSE PAYMENT */

el.closePaymentBtn.onclick =
    closePayment


el.cancelPaymentBtn.onclick =
    closePayment


/* CONFIRM */

el.confirmPaymentBtn.onclick =
    confirmPayment


/* PRINT */

if (
    el.printReceiptBtn
) {
    el.printReceiptBtn.onclick =
        printReceipt
}


/* NEW SALE */

el.newSaleBtn.onclick =
    newSale


/* ========================================
   AUTH CHANGE
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
