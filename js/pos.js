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
    currentShift: null
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
            class="tab ${
                !state.selectedCategory
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
                        class="tab ${
                            state.selectedCategory
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
                                ${
                                    soldOut
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
                                ${
                                    soldOut
                                        ? 'disabled'
                                        : ''
                                }
                            >

                                <div
                                    class="product-image"
                                >

                                    ${
                                        product.image_url

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


                                        ${
                                            soldOut

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
