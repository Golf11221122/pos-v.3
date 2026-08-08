import { supabase } from './supabase.js'
import { PROMPTPAY_PHONE } from './config.js'

// ========================================
// STATE
// ========================================

const state = {
    session: null,
    profile: null,
    branch: null,
    categories: [],
    products: [],
    selectedCategory: '',
    cart: new Map(),
    paymentMethod: 'cash',

    // เก็บข้อมูลบิลล่าสุดสำหรับพิมพ์ใบเสร็จ
    lastSale: null
}


// ========================================
// ELEMENTS
// ========================================

const $ = id => document.getElementById(id)

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

    // Payment
    paymentModal: $('paymentModal'),
    closePaymentBtn: $('closePaymentBtn'),
    cancelPaymentBtn: $('cancelPaymentBtn'),

    paymentTotalText: $('paymentTotalText'),

    cashSection: $('cashSection'),
    qrSection: $('qrSection'),

    receivedInput: $('receivedInput'),
    quickCash: $('quickCash'),

    changeText: $('changeText'),
    saleNote: $('saleNote'),

    paymentMessage: $('paymentMessage'),
    confirmPaymentBtn: $('confirmPaymentBtn'),

    // Success
    successModal: $('successModal'),

    invoiceText: $('invoiceText'),
    successTotal: $('successTotal'),
    successChange: $('successChange'),

    newSaleBtn: $('newSaleBtn'),

    // Receipt
    printReceiptBtn: $('printReceiptBtn'),

    receiptPrint: $('receiptPrint'),

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


// ========================================
// HELPERS
// ========================================

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
    ).format(Number(value || 0))


const items = () => [
    ...state.cart.values()
]


const subtotal = () =>
    items().reduce(
        (sum, item) =>
            sum +
            Number(item.price) *
            item.quantity,
        0
    )


const discount = () =>
    Math.max(
        Number(
            el.discountInput.value || 0
        ),
        0
    )


const total = () =>
    Math.max(
        subtotal() - discount(),
        0
    )


function msg(target, text = '') {

    if (!target) return

    target.textContent = text
}


// ========================================
// SESSION
// ========================================

async function requireSession() {

    const {
        data: { session },
        error
    } = await supabase.auth.getSession()


    if (error) {
        throw error
    }


    if (!session) {

        location.replace(
            './index.html'
        )

        return null
    }


    state.session = session

    return session
}


// ========================================
// PROFILE
// ========================================

async function loadProfile(id) {

    const {
        data,
        error
    } = await supabase
        .from('profiles')
        .select(
            'id,full_name,role,branch_id'
        )
        .eq('id', id)
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


// ========================================
// BRANCH
// ========================================

async function loadBranch() {

    const {
        data,
        error
    } = await supabase
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


    state.branch = data
}


// ========================================
// LOAD PRODUCTS
// ========================================

async function loadCatalog() {

    el.loading.classList.remove(
        'hidden'
    )

    el.empty.classList.add(
        'hidden'
    )

    el.productGrid.classList.add(
        'hidden'
    )


    const [
        categoriesResult,
        productsResult
    ] = await Promise.all([

        supabase
            .from('categories')
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
            .from('products')
            .select(
                `
                id,
                category_id,
                name,
                sku,
                barcode,
                price,
                cost,
                image_url,
                display_order
                `
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
            )
            .order(
                'name'
            )
    ])


    el.loading.classList.add(
        'hidden'
    )


    if (categoriesResult.error) {
        throw categoriesResult.error
    }


    if (productsResult.error) {
        throw productsResult.error
    }


    state.categories =
        categoriesResult.data || []


    state.products =
        productsResult.data || []


    renderCategories()

    renderProducts()
}


// ========================================
// USER
// ========================================

function renderUser() {

    el.userName.textContent =
        state.profile.full_name ||
        state.session.user.email
            .split('@')[0]


    el.branchText.textContent =
        `สาขา: ${state.branch.name}`
}


// ========================================
// CATEGORY
// ========================================

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
        >
            ทั้งหมด
        </button>
        `

        +

        state.categories
            .map(category => `

                <button
                    class="tab ${
                        state.selectedCategory
                        === category.id
                            ? 'active'
                            : ''
                    }"
                    data-cat="${
                        esc(category.id)
                    }"
                >
                    ${
                        esc(category.name)
                    }
                </button>

            `)
            .join('')
}


// ========================================
// FILTER PRODUCTS
// ========================================

function filtered() {

    const keyword =
        el.searchInput.value
            .trim()
            .toLowerCase()


    return state.products.filter(
        product => {

            const categoryMatch =
                !state.selectedCategory ||
                product.category_id ===
                    state.selectedCategory


            const searchText = [

                product.name,
                product.sku,
                product.barcode

            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()


            const searchMatch =
                !keyword ||
                searchText.includes(
                    keyword
                )


            return (
                categoryMatch &&
                searchMatch
            )
        }
    )
}


// ========================================
// PRODUCTS
// ========================================

function renderProducts() {

    const list = filtered()


    if (!list.length) {

        el.empty.classList.remove(
            'hidden'
        )

        el.productGrid.classList.add(
            'hidden'
        )

        return
    }


    el.empty.classList.add(
        'hidden'
    )

    el.productGrid.classList.remove(
        'hidden'
    )


    el.productGrid.innerHTML =
        list
            .map(product => `

                <article
                    class="product-card"
                >

                    <button
                        data-add="${
                            esc(product.id)
                        }"
                    >

                        <div
                            class="product-image"
                        >

                            ${
                                product.image_url

                                ? `
                                    <img
                                        src="${
                                            esc(
                                                product.image_url
                                            )
                                        }"
                                        alt="${
                                            esc(
                                                product.name
                                            )
                                        }"
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
                                ${
                                    esc(
                                        product.name
                                    )
                                }
                            </h3>


                            <div>

                                <strong>
                                    ${
                                        money(
                                            product.price
                                        )
                                    }
                                </strong>

                                <span
                                    class="plus"
                                >
                                    ＋
                                </span>

                            </div>

                        </div>

                    </button>

                </article>

            `)
            .join('')
}


// ========================================
// ADD PRODUCT
// ========================================

function add(id) {

    const product =
        state.products.find(
            item =>
                item.id === id
        )


    if (!product) {
        return
    }


    const old =
        state.cart.get(id)


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


    renderCart()
}


// ========================================
// QUANTITY
// ========================================

function qty(id, change) {

    const item =
        state.cart.get(id)


    if (!item) {
        return
    }


    item.quantity += change


    if (
        item.quantity <= 0
    ) {

        state.cart.delete(id)
    }


    renderCart()
}


// ========================================
// CART
// ========================================

function renderCart() {

    const list = items()


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


    el.emptyCart.classList.toggle(
        'hidden',
        Boolean(list.length)
    )


    el.cartItems.classList.toggle(
        'hidden',
        !list.length
    )


    el.cartItems.innerHTML =
        list
            .map(item => `

                <div
                    class="cart-item"
                >

                    <div>

                        <strong>
                            ${
                                esc(
                                    item.name
                                )
                            }
                        </strong>


                        <small>

                            ${
                                money(
                                    item.price
                                )
                            }

                            ×

                            ${
                                item.quantity
                            }

                        </small>


                        <div
                            class="qty"
                        >

                            <button
                                data-act="dec"
                                data-id="${
                                    item.id
                                }"
                            >
                                −
                            </button>


                            <b>
                                ${
                                    item.quantity
                                }
                            </b>


                            <button
                                data-act="inc"
                                data-id="${
                                    item.id
                                }"
                            >
                                ＋
                            </button>


                            <button
                                class="remove"
                                data-act="remove"
                                data-id="${
                                    item.id
                                }"
                            >
                                ลบ
                            </button>

                        </div>

                    </div>


                    <strong>

                        ${
                            money(
                                Number(
                                    item.price
                                )
                                *
                                item.quantity
                            )
                        }

                    </strong>

                </div>

            `)
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


// ========================================
// PAYMENT
// ========================================

function openPayment() {

    if (
        !items().length ||
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
        .forEach(button => {

            button.classList.toggle(

                'active',

                button.dataset.method
                ===
                'cash'
            )
        })


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


// ========================================
// QUICK CASH
// ========================================

function renderQuickCash() {

    const amount =
        total()


    const values = [

        amount,

        Math.ceil(
            amount / 20
        ) * 20,

        Math.ceil(
            amount / 100
        ) * 100,

        500,

        1000

    ]
        .filter(
            (
                value,
                index,
                array
            ) =>
                value >= amount &&
                array.indexOf(
                    value
                ) === index
        )
        .slice(
            0,
            4
        )


    el.quickCash.innerHTML =
        values
            .map(value => `

                <button
                    data-cash="${
                        value
                    }"
                >

                    ${
                        value
                            .toLocaleString(
                                'th-TH'
                            )
                    }

                </button>

            `)
            .join('')
}


// ========================================
// CHANGE
// ========================================

function updateChange() {

    const received =
        Number(
            el.receivedInput.value ||
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


// ========================================
// RECEIPT
// ========================================

function renderReceipt() {

    const sale =
        state.lastSale


    if (!sale) {
        return
    }


    if (el.receiptBranch) {

        el.receiptBranch.textContent =
            state.branch?.name ||
            '-'
    }


    if (el.receiptInvoice) {

        el.receiptInvoice.textContent =
            sale.invoice_no ||
            '-'
    }


    if (el.receiptDate) {

        el.receiptDate.textContent =
            new Intl.DateTimeFormat(
                'th-TH',
                {
                    dateStyle: 'short',
                    timeStyle: 'medium'
                }
            ).format(
                sale.created_at
            )
    }


    if (el.receiptCashier) {

        el.receiptCashier.textContent =

            state.profile?.full_name

            ||

            state.session
                ?.user
                ?.email
                ?.split('@')[0]

            ||

            '-'
    }


    if (el.receiptItems) {

        el.receiptItems.innerHTML =
            sale.items
                .map(item => `

                    <div
                        class="receipt-item"
                    >

                        <div
                            class="receipt-item-name"
                        >
                            ${
                                esc(
                                    item.name
                                )
                            }
                        </div>


                        <div
                            class="receipt-item-line"
                        >

                            <span>

                                ${
                                    item.quantity
                                }

                                ×

                                ${
                                    money(
                                        item.price
                                    )
                                }

                            </span>


                            <strong>

                                ${
                                    money(
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

                `)
                .join('')
    }


    if (el.receiptSubtotal) {

        el.receiptSubtotal.textContent =
            money(
                sale.subtotal
            )
    }


    if (el.receiptDiscount) {

        el.receiptDiscount.textContent =
            money(
                sale.discount
            )
    }


    if (el.receiptTotal) {

        el.receiptTotal.textContent =
            money(
                sale.total
            )
    }


    if (el.receiptReceived) {

        el.receiptReceived.textContent =
            money(
                sale.received_amount
            )
    }


    if (el.receiptChange) {

        el.receiptChange.textContent =
            money(
                sale.change_amount
            )
    }


    if (el.receiptPayment) {

        el.receiptPayment.textContent =

            sale.payment_method
            ===
            'cash'

                ? 'เงินสด'

                : 'QR'
    }
}


// ========================================
// PRINT RECEIPT
// ========================================

function printReceipt() {

    if (!state.lastSale) {

        alert(
            'ยังไม่มีข้อมูลใบเสร็จ'
        )

        return
    }


    renderReceipt()


    window.print()
}


// ========================================
// CONFIRM PAYMENT
// ========================================

async function confirmPayment() {

    const received =

        state.paymentMethod
        ===
        'cash'

            ? Number(
                el.receivedInput.value ||
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


    // เก็บข้อมูลสินค้าไว้ก่อน
    // เพราะหลังบันทึกจะใช้พิมพ์ใบเสร็จ

    const saleSnapshot = {

        items:
            items().map(
                item => ({
                    id: item.id,
                    name: item.name,
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
        } = await supabase.rpc(

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
                    el.saleNote.value
                        .trim()
                    ||
                    null,

                p_items:
                    saleSnapshot.items
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


        // เก็บบิลล่าสุด

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


        // เตรียมใบเสร็จ

        renderReceipt()


        // ปิดหน้าชำระเงิน

        closePayment()


        // แสดงหน้าสำเร็จ

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

    }

    catch (error) {

        console.error(
            'Create sale error:',
            error
        )


        msg(
            el.paymentMessage,

            error.message
            ||
            'บันทึกการขายไม่สำเร็จ'
        )
    }

    finally {

        el.confirmPaymentBtn.disabled =
            false


        el.confirmPaymentBtn.textContent =
            'ยืนยันการชำระเงิน'
    }
}


// ========================================
// NEW SALE
// ========================================

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


    renderCart()
}


// ========================================
// LOGOUT
// ========================================

async function logout() {

    await supabase.auth.signOut()

    location.replace(
        './index.html'
    )
}


// ========================================
// INIT
// ========================================

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


        await loadCatalog()


        renderCart()

    }

    catch (error) {

        console.error(
            error
        )


        el.loading
            .classList
            .add(
                'hidden'
            )


        el.empty
            .classList
            .remove(
                'hidden'
            )


        el.empty.textContent =
            error.message
    }
}


// ========================================
// EVENTS
// ========================================

el.backBtn.onclick = () => {

    location.href =
        './dashboard.html'
}


el.logoutBtn.onclick =
    logout


el.searchInput.oninput =
    renderProducts


el.refreshBtn.onclick =
    loadCatalog


// CATEGORY

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


// PRODUCT

el.productGrid.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-add]'
            )


        if (button) {

            add(
                button.dataset.add
            )
        }
    }


// CART

el.cartItems.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-act]'
            )


        if (!button) {
            return
        }


        if (
            button.dataset.act
            ===
            'inc'
        ) {

            qty(
                button.dataset.id,
                1
            )

        }

        else if (
            button.dataset.act
            ===
            'dec'
        ) {

            qty(
                button.dataset.id,
                -1
            )

        }

        else {

            state.cart.delete(
                button.dataset.id
            )


            renderCart()
        }
    }


// DISCOUNT

el.discountInput.oninput =
    renderCart


// CLEAR CART

el.clearCartBtn.onclick =
    () => {

        if (
            confirm(
                'ล้างตะกร้าหรือไม่?'
            )
        ) {

            state.cart.clear()

            el.discountInput.value =
                '0'

            renderCart()
        }
    }


// CHECKOUT

el.checkoutBtn.onclick =
    openPayment


// PAYMENT METHOD

document
    .querySelectorAll(
        '.method'
    )
    .forEach(
        button => {

            button.onclick =
                () => {

                    state.paymentMethod =
                        button.dataset.method


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
                                        item === button
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
                }
        }
    )


// RECEIVED MONEY

el.receivedInput.oninput =
    updateChange


// QUICK CASH

el.quickCash.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-cash]'
            )


        if (button) {

            el.receivedInput.value =
                button.dataset.cash


            updateChange()
        }
    }


// CLOSE PAYMENT

el.closePaymentBtn.onclick =
    closePayment


el.cancelPaymentBtn.onclick =
    closePayment


// CONFIRM PAYMENT

el.confirmPaymentBtn.onclick =
    confirmPayment


// PRINT RECEIPT

if (el.printReceiptBtn) {

    el.printReceiptBtn.onclick =
        printReceipt
}


// NEW SALE

el.newSaleBtn.onclick =
    newSale


// ========================================
// AUTH CHANGE
// ========================================

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


// ========================================
// START
// ========================================

init()
