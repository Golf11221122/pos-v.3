import { supabase } from './supabase.js'


/* ========================================
   STATE
======================================== */

const state = {

    token: null,

    table: null,

    order: null,

    guestCount: 1,

    categories: [],

    products: [],

    selectedCategory: '',

    cart: new Map(),

    modifierProduct: null,

    modifierGroups: [],

    modifierQty: 1
}


/* ========================================
   ELEMENTS
======================================== */

const $ = id =>
    document.getElementById(id)


const el = {

    tableNameText:
        $('tableNameText'),

    cartButton:
        $('cartButton'),

    cartCountText:
        $('cartCountText'),

    errorState:
        $('errorState'),

    errorText:
        $('errorText'),

    startOrderSection:
        $('startOrderSection'),

    guestMinusBtn:
        $('guestMinusBtn'),

    guestPlusBtn:
        $('guestPlusBtn'),

    guestCountText:
        $('guestCountText'),

    startOrderBtn:
        $('startOrderBtn'),

    startMessage:
        $('startMessage'),

    menuSection:
        $('menuSection'),

    searchInput:
        $('searchInput'),

    categoryTabs:
        $('categoryTabs'),

    menuLoading:
        $('menuLoading'),

    menuEmpty:
        $('menuEmpty'),

    productGrid:
        $('productGrid'),

    modifierModal:
        $('modifierModal'),

    modifierProductName:
        $('modifierProductName'),

    modifierBasePrice:
        $('modifierBasePrice'),

    closeModifierBtn:
        $('closeModifierBtn'),

    modifierGroups:
        $('modifierGroups'),

    itemNoteInput:
        $('itemNoteInput'),

    modifierQtyMinus:
        $('modifierQtyMinus'),

    modifierQtyPlus:
        $('modifierQtyPlus'),

    modifierQtyText:
        $('modifierQtyText'),

    modifierTotalText:
        $('modifierTotalText'),

    modifierMessage:
        $('modifierMessage'),

    addToCartBtn:
        $('addToCartBtn'),

    cartModal:
        $('cartModal'),

    closeCartBtn:
        $('closeCartBtn'),

    emptyCart:
        $('emptyCart'),

    cartItems:
        $('cartItems'),

    cartSummaryText:
        $('cartSummaryText'),

    cartTotalText:
        $('cartTotalText'),

    cartMessage:
        $('cartMessage'),

    submitOrderBtn:
        $('submitOrderBtn'),

    successModal:
        $('successModal'),

    continueOrderBtn:
        $('continueOrderBtn'),

    mobileCartBar:
        $('mobileCartBar'),

    mobileCartCountText:
        $('mobileCartCountText'),

    mobileCartTotalText:
        $('mobileCartTotalText')
}


/* ========================================
   HELPERS
======================================== */

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


function esc(
    value
) {

    return String(
        value ?? ''
    )
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}


function money(
    value
) {

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


function cartItems() {

    return [
        ...state.cart.values()
    ]
}


function cartCount() {

    return cartItems()
        .reduce(
            (
                sum,
                item
            ) =>
                sum
                +
                Number(
                    item.quantity || 0
                ),
            0
        )
}


function cartTotal() {

    return cartItems()
        .reduce(
            (
                sum,
                item
            ) =>
                sum
                +
                (
                    Number(
                        item.unit_price || 0
                    )
                    *
                    Number(
                        item.quantity || 0
                    )
                ),
            0
        )
}


function getTokenFromUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        )

    const token =
        params
            .get(
                'token'
            )
            ?.trim()

    return token || null
}


function showFatalError(
    text
) {

    el.startOrderSection
        .classList
        .add(
            'hidden'
        )

    el.menuSection
        .classList
        .add(
            'hidden'
        )

    el.mobileCartBar
        .classList
        .add(
            'hidden'
        )

    el.errorState
        .classList
        .remove(
            'hidden'
        )

    msg(
        el.errorText,
        text
    )
}


/* ========================================
   TABLE
======================================== */

async function loadTableContext() {

    const {
        data,
        error
    } =
        await supabase.rpc(
            'get_customer_table_context',
            {
                p_qr_token:
                    state.token
            }
        )

    if (error) {
        throw error
    }

    const table =
        Array.isArray(data)
            ? data[0]
            : data

    if (
        !table?.table_id
    ) {
        throw new Error(
            'TABLE_NOT_FOUND'
        )
    }

    state.table =
        table

    el.tableNameText.textContent =
        table.table_name
        ||
        `โต๊ะ ${table.table_no}`


    if (
        table.has_open_order
        &&
        table.order_id
    ) {

        state.order = {
            id:
                table.order_id,

            table_id:
                table.table_id,

            guest_count:
                Number(
                    table.guest_count || 1
                ),

            is_existing:
                true
        }

        state.guestCount =
            state.order.guest_count

        el.startOrderSection
            .classList
            .add(
                'hidden'
            )

        el.menuSection
            .classList
            .remove(
                'hidden'
            )

        return
    }


    el.startOrderSection
        .classList
        .remove(
            'hidden'
        )

    el.menuSection
        .classList
        .add(
            'hidden'
        )

    renderGuestCount()
}


/* ========================================
   START ORDER
======================================== */

function renderGuestCount() {

    el.guestCountText.textContent =
        `${state.guestCount.toLocaleString(
            'th-TH'
        )} คน`
}


async function startOrder() {

    el.startOrderBtn.disabled =
        true

    el.startOrderBtn.textContent =
        'กำลังเปิดโต๊ะ...'

    msg(
        el.startMessage,
        ''
    )

    try {

        const {
            data,
            error
        } =
            await supabase.rpc(
                'customer_open_restaurant_order',
                {
                    p_qr_token:
                        state.token,

                    p_guest_count:
                        state.guestCount
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
            !order?.order_id
        ) {
            throw new Error(
                'เปิดออเดอร์ไม่สำเร็จ'
            )
        }

        state.order = {
            id:
                order.order_id,

            table_id:
                order.table_id,

            guest_count:
                Number(
                    order.guest_count || 1
                ),

            is_existing:
                Boolean(
                    order.is_existing
                )
        }

        el.startOrderSection
            .classList
            .add(
                'hidden'
            )

        el.menuSection
            .classList
            .remove(
                'hidden'
            )

        await loadMenu()

    } catch (error) {

        console.error(
            'Start customer order error:',
            error
        )

        let text =
            error.message
            ||
            'เริ่มออเดอร์ไม่สำเร็จ'

        if (
            text.includes(
                'TABLE_NOT_FOUND'
            )
        ) {
            text =
                'ไม่พบโต๊ะ หรือ QR นี้ถูกปิดใช้งานแล้ว'
        }

        if (
            text.includes(
                'INVALID_GUEST_COUNT'
            )
        ) {
            text =
                'จำนวนลูกค้าไม่ถูกต้อง'
        }

        msg(
            el.startMessage,
            text
        )

    } finally {

        el.startOrderBtn.disabled =
            false

        el.startOrderBtn.textContent =
            'เริ่มสั่งอาหาร'
    }
}


/* ========================================
   MENU
======================================== */

async function loadMenu() {

    el.menuLoading
        .classList
        .remove(
            'hidden'
        )

    el.menuEmpty
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
            menuResult
        ] =
            await Promise.all([
                supabase.rpc(
                    'get_customer_categories',
                    {
                        p_qr_token:
                            state.token
                    }
                ),

                supabase.rpc(
                    'get_customer_menu',
                    {
                        p_qr_token:
                            state.token
                    }
                )
            ])

        if (
            categoriesResult.error
        ) {
            throw categoriesResult.error
        }

        if (
            menuResult.error
        ) {
            throw menuResult.error
        }

        state.categories =
            Array.isArray(
                categoriesResult.data
            )
                ? categoriesResult.data
                : []

        const menuData =
            Array.isArray(
                menuResult.data
            )
                ? menuResult.data[0]
                : menuResult.data

        state.products =
            Array.isArray(
                menuData?.products
            )
                ? menuData.products
                : []

        renderCategories()
        renderProducts()

    } catch (error) {

        console.error(
            'Load customer menu error:',
            error
        )

        showFatalError(
            error.message
            ||
            'โหลดเมนูไม่สำเร็จ'
        )

    } finally {

        el.menuLoading
            .classList
            .add(
                'hidden'
            )
    }
}


function renderCategories() {

    el.categoryTabs.innerHTML =
        `
        <button
            type="button"
            class="category-tab ${
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
            .map(
                category =>
                    `
                    <button
                        type="button"
                        class="category-tab ${
                            state.selectedCategory ===
                            category.id
                                ? 'active'
                                : ''
                        }"
                        data-cat="${esc(
                            category.id
                        )}"
                    >
                        ${esc(
                            category.name
                        )}
                    </button>
                    `
            )
            .join('')
}


function filteredProducts() {

    const keyword =
        el.searchInput
            .value
            .trim()
            .toLowerCase()

    return state.products.filter(
        product => {

            const categoryMatch =
                !state.selectedCategory
                ||
                product.category_id ===
                state.selectedCategory

            const searchMatch =
                !keyword
                ||
                String(
                    product.name || ''
                )
                    .toLowerCase()
                    .includes(
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


function renderProducts() {

    const list =
        filteredProducts()

    if (
        !list.length
    ) {

        el.menuEmpty
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

    el.menuEmpty
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

                    const availableQty =
                        Math.max(
                            Math.floor(
                                Number(
                                    product.available_qty || 0
                                )
                            ),
                            0
                        )

                    const soldOut =
                        availableQty <= 0

                    const stockText =
                        soldOut
                            ? `
                                <div class="stock-out">
                                    สินค้าหมด
                                </div>
                            `
                            : availableQty <= 10
                                ? `
                                    <div class="stock-low">
                                        เหลือ ${availableQty.toLocaleString(
                                            'th-TH'
                                        )} จาน
                                    </div>
                                `
                                : ''

                    return `
                        <article
                            class="product-card ${
                                soldOut
                                    ? 'sold-out'
                                    : ''
                            }"
                        >

                            <button
                                type="button"
                                data-product-id="${esc(
                                    product.id
                                )}"
                                ${soldOut ? 'disabled' : ''}
                                style="
                                    width:100%;
                                    border:0;
                                    background:transparent;
                                    text-align:left;
                                    padding:0;
                                "
                            >

                                <div class="product-image">

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
                                                >
                                            `
                                            : '🍽️'
                                    }

                                </div>

                                <div class="product-info">

                                    <h3>
                                        ${esc(
                                            product.name
                                        )}
                                    </h3>

                                    ${stockText}

                                    <div class="product-price-row">

                                        <strong class="product-price">
                                            ${money(
                                                product.price
                                            )}
                                        </strong>

                                        ${
                                            soldOut
                                                ? ''
                                                : `
                                                    <span class="add-icon">
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
   MODIFIERS
======================================== */

async function openProduct(
    productId
) {

    if (!state.order?.id) {
        return
    }

    const product =
        state.products.find(
            item =>
                item.id ===
                productId
        )

    if (!product) {
        return
    }

    try {

        const {
            data,
            error
        } =
            await supabase.rpc(
                'get_customer_product_modifiers',
                {
                    p_qr_token:
                        state.token,

                    p_product_id:
                        product.id
                }
            )

        if (error) {
            throw error
        }

        const groups =
            Array.isArray(data)
                ? data
                : []

        state.modifierProduct =
            product

        state.modifierGroups =
            groups

        state.modifierQty =
            1

        el.itemNoteInput.value =
            ''

        el.modifierProductName.textContent =
            product.name

        el.modifierBasePrice.textContent =
            `ราคาเริ่มต้น ${money(
                product.price
            )}`

        renderModifierGroups()
        renderModifierQty()
        updateModifierTotal()

        msg(
            el.modifierMessage,
            ''
        )

        el.modifierModal
            .classList
            .remove(
                'hidden'
            )

    } catch (error) {

        console.error(
            'Load modifiers error:',
            error
        )

        alert(
            error.message
            ||
            'โหลดตัวเลือกไม่สำเร็จ'
        )
    }
}


function renderModifierGroups() {

    if (
        !state.modifierGroups.length
    ) {

        el.modifierGroups.innerHTML =
            `
            <div
                style="
                    color:#70757a;
                    font-size:13px;
                "
            >
                เมนูนี้ไม่มีตัวเลือกเพิ่มเติม
            </div>
            `

        return
    }

    el.modifierGroups.innerHTML =
        state.modifierGroups
            .map(
                group => {

                    const inputType =
                        group.selection_type ===
                        'multiple'
                            ? 'checkbox'
                            : 'radio'

                    return `
                        <section
                            class="modifier-group"
                            data-group-id="${esc(
                                group.id
                            )}"
                            data-selection-type="${esc(
                                group.selection_type
                            )}"
                            data-required="${group.is_required ? 'true' : 'false'}"
                            data-min="${Number(
                                group.min_select || 0
                            )}"
                            data-max="${Number(
                                group.max_select || 0
                            )}"
                        >

                            <div class="modifier-group-head">

                                <strong>
                                    ${esc(
                                        group.name
                                    )}
                                </strong>

                                ${
                                    group.is_required
                                        ? `
                                            <span class="required-text">
                                                จำเป็น
                                            </span>
                                        `
                                        : ''
                                }

                            </div>


                            <div class="modifier-options">

                                ${(group.options || [])
                                    .map(
                                        (
                                            option,
                                            index
                                        ) => {

                                            const defaultChecked =
                                                group.selection_type ===
                                                'single'
                                                &&
                                                group.is_required
                                                &&
                                                index === 0

                                            const price =
                                                Number(
                                                    option.price_adjustment || 0
                                                )

                                            return `
                                                <label class="modifier-option">

                                                    <input
                                                        type="${inputType}"
                                                        name="group-${esc(
                                                            group.id
                                                        )}"
                                                        value="${esc(
                                                            option.id
                                                        )}"
                                                        data-group-id="${esc(
                                                            group.id
                                                        )}"
                                                        data-group-name="${esc(
                                                            group.name
                                                        )}"
                                                        data-option-name="${esc(
                                                            option.name
                                                        )}"
                                                        data-price="${price}"
                                                        ${defaultChecked ? 'checked' : ''}
                                                    >

                                                    <span class="modifier-option-box">

                                                        <span>
                                                            ${esc(
                                                                option.name
                                                            )}
                                                        </span>

                                                        <span class="modifier-option-price">
                                                            ${
                                                                price > 0
                                                                    ? `+${money(
                                                                        price
                                                                    )}`
                                                                    : ''
                                                            }
                                                        </span>

                                                    </span>

                                                </label>
                                            `
                                        }
                                    )
                                    .join('')}

                            </div>

                        </section>
                    `
                }
            )
            .join('')
}


function selectedModifiers() {

    return [
        ...el.modifierGroups
            .querySelectorAll(
                'input[data-group-id]:checked'
            )
    ]
        .map(
            input => ({
                group_id:
                    input.dataset.groupId,

                group_name:
                    input.dataset.groupName,

                option_id:
                    input.value,

                option_name:
                    input.dataset.optionName,

                price_adjustment:
                    Number(
                        input.dataset.price || 0
                    )
            })
        )
}


function modifierPrice() {

    return selectedModifiers()
        .reduce(
            (
                sum,
                modifier
            ) =>
                sum
                +
                Number(
                    modifier.price_adjustment || 0
                ),
            0
        )
}


function renderModifierQty() {

    el.modifierQtyText.textContent =
        state.modifierQty.toLocaleString(
            'th-TH'
        )
}


function updateModifierTotal() {

    if (
        !state.modifierProduct
    ) {
        return
    }

    const unitPrice =
        Number(
            state.modifierProduct.price || 0
        )
        +
        modifierPrice()

    el.modifierTotalText.textContent =
        money(
            unitPrice
            *
            state.modifierQty
        )

    msg(
        el.modifierMessage,
        ''
    )
}


function validateModifierSelection() {

    const groupElements =
        [
            ...el.modifierGroups
                .querySelectorAll(
                    '[data-group-id]'
                )
        ]

    for (
        const group
        of
        groupElements
    ) {

        const checked =
            [
                ...group
                    .querySelectorAll(
                        'input:checked'
                    )
            ]

        const required =
            group.dataset.required ===
            'true'

        const min =
            Number(
                group.dataset.min || 0
            )

        const max =
            Number(
                group.dataset.max || 0
            )

        const type =
            group.dataset.selectionType

        const name =
            group
                .querySelector(
                    '.modifier-group-head strong'
                )
                ?.textContent
                ?.trim()
            ||
            'ตัวเลือก'

        if (
            (
                required
                &&
                checked.length <
                Math.max(
                    min,
                    1
                )
            )
            ||
            checked.length <
            min
        ) {

            msg(
                el.modifierMessage,
                `กรุณาเลือก ${name}`
            )

            return false
        }

        if (
            (
                max > 0
                &&
                checked.length > max
            )
            ||
            (
                type ===
                'single'
                &&
                checked.length > 1
            )
        ) {

            msg(
                el.modifierMessage,
                `เลือก ${name} เกินจำนวนที่กำหนด`
            )

            return false
        }
    }

    return true
}


function buildCartKey(
    productId,
    modifiers,
    note
) {

    const options =
        modifiers
            .map(
                modifier =>
                    modifier.option_id
            )
            .sort()
            .join(
                ','
            )

    return (
        `${productId}::${options}::${String(
            note || ''
        )
            .trim()
            .toLowerCase()}`
    )
}


function addConfiguredItemToCart() {

    if (
        !state.modifierProduct
    ) {
        return
    }

    if (
        !validateModifierSelection()
    ) {
        return
    }

    const modifiers =
        selectedModifiers()

    const note =
        el.itemNoteInput
            .value
            .trim()

    const modifierTotal =
        modifierPrice()

    const unitPrice =
        Number(
            state.modifierProduct.price || 0
        )
        +
        modifierTotal

    const key =
        buildCartKey(
            state.modifierProduct.id,
            modifiers,
            note
        )

    const old =
        state.cart.get(
            key
        )

    if (old) {

        old.quantity +=
            state.modifierQty

    } else {

        state.cart.set(
            key,
            {
                cart_key:
                    key,

                product_id:
                    state.modifierProduct.id,

                product_name:
                    state.modifierProduct.name,

                base_price:
                    Number(
                        state.modifierProduct.price || 0
                    ),

                modifier_total:
                    modifierTotal,

                unit_price:
                    unitPrice,

                quantity:
                    state.modifierQty,

                modifiers,

                item_note:
                    note
            }
        )
    }

    closeModifierModal()

    renderCart()

    openCart()
}


function closeModifierModal() {

    el.modifierModal
        .classList
        .add(
            'hidden'
        )

    state.modifierProduct =
        null

    state.modifierGroups =
        []

    state.modifierQty =
        1
}


/* ========================================
   CART
======================================== */

function renderCart() {

    const list =
        cartItems()

    const count =
        cartCount()

    const total =
        cartTotal()

    el.cartCountText.textContent =
        count.toLocaleString(
            'th-TH'
        )

    el.mobileCartCountText.textContent =
        `${count.toLocaleString(
            'th-TH'
        )} รายการ`

    el.mobileCartTotalText.textContent =
        money(
            total
        )

    el.cartSummaryText.textContent =
        `${count.toLocaleString(
            'th-TH'
        )} รายการ`

    el.cartTotalText.textContent =
        money(
            total
        )

    el.mobileCartBar
        .classList
        .toggle(
            'hidden',
            count <= 0
        )

    el.emptyCart
        .classList
        .toggle(
            'hidden',
            list.length > 0
        )

    el.cartItems
        .classList
        .toggle(
            'hidden',
            list.length === 0
        )

    el.submitOrderBtn.disabled =
        list.length === 0
        ||
        !state.order?.id

    el.cartItems.innerHTML =
        list
            .map(
                item => {

                    const modifierText =
                        (item.modifiers || [])
                            .map(
                                modifier =>
                                    modifier.option_name
                                    +
                                    (
                                        Number(
                                            modifier.price_adjustment || 0
                                        ) > 0
                                            ? ` (+${money(
                                                modifier.price_adjustment
                                            )})`
                                            : ''
                                    )
                            )
                            .join(
                                ' • '
                            )

                    return `
                        <div class="cart-item">

                            <div>

                                <strong>
                                    ${esc(
                                        item.product_name
                                    )}
                                </strong>

                                ${
                                    modifierText
                                        ? `
                                            <small>
                                                ${esc(
                                                    modifierText
                                                )}
                                            </small>
                                        `
                                        : ''
                                }

                                ${
                                    item.item_note
                                        ? `
                                            <small>
                                                หมายเหตุ:
                                                ${esc(
                                                    item.item_note
                                                )}
                                            </small>
                                        `
                                        : ''
                                }

                                <small>
                                    ${money(
                                        item.unit_price
                                    )}
                                    ×
                                    ${item.quantity}
                                </small>

                                <div class="cart-item-actions">

                                    <button
                                        type="button"
                                        data-act="dec"
                                        data-key="${esc(
                                            item.cart_key
                                        )}"
                                    >
                                        −
                                    </button>

                                    <strong>
                                        ${item.quantity}
                                    </strong>

                                    <button
                                        type="button"
                                        data-act="inc"
                                        data-key="${esc(
                                            item.cart_key
                                        )}"
                                    >
                                        ＋
                                    </button>

                                    <button
                                        type="button"
                                        class="remove-button"
                                        data-act="remove"
                                        data-key="${esc(
                                            item.cart_key
                                        )}"
                                    >
                                        ลบ
                                    </button>

                                </div>

                            </div>

                            <strong>
                                ${money(
                                    Number(
                                        item.unit_price
                                    )
                                    *
                                    Number(
                                        item.quantity
                                    )
                                )}
                            </strong>

                        </div>
                    `
                }
            )
            .join('')
}


function openCart() {

    el.cartModal
        .classList
        .remove(
            'hidden'
        )

    renderCart()
}


function closeCart() {

    el.cartModal
        .classList
        .add(
            'hidden'
        )

    msg(
        el.cartMessage,
        ''
    )
}


function changeCartQty(
    key,
    change
) {

    const item =
        state.cart.get(
            key
        )

    if (!item) {
        return
    }

    item.quantity +=
        change

    if (
        item.quantity <= 0
    ) {

        state.cart.delete(
            key
        )
    }

    renderCart()
}


/* ========================================
   SUBMIT ORDER
======================================== */

async function submitOrder() {

    const list =
        cartItems()

    if (
        !list.length
        ||
        !state.order?.id
    ) {
        return
    }

    el.submitOrderBtn.disabled =
        true

    el.submitOrderBtn.textContent =
        'กำลังส่งออเดอร์...'

    msg(
        el.cartMessage,
        ''
    )

    try {

        /*
         * ส่งทีละรายการ
         * เพื่อให้รายการแต่ละจานเป็น record แยกใน restaurant_order_items
         */
        for (
            const item
            of
            list
        ) {

            const {
                error
            } =
                await supabase.rpc(
                    'customer_add_order_item',
                    {
                        p_qr_token:
                            state.token,

                        p_order_id:
                            state.order.id,

                        p_product_id:
                            item.product_id,

                        p_quantity:
                            item.quantity,

                        p_modifiers:
                            (item.modifiers || [])
                                .map(
                                    modifier => ({
                                        group_id:
                                            modifier.group_id,

                                        option_id:
                                            modifier.option_id
                                    })
                                ),

                        p_item_note:
                            item.item_note
                            ||
                            null
                    }
                )

            if (error) {
                throw error
            }
        }

        state.cart.clear()

        renderCart()

        closeCart()

        el.successModal
            .classList
            .remove(
                'hidden'
            )

        /*
         * โหลดเมนูใหม่ เพื่อให้จำนวนคงเหลือล่าสุด
         */
        await loadMenu()

    } catch (error) {

        console.error(
            'Customer submit order error:',
            error
        )

        let text =
            error.message
            ||
            'ส่งออเดอร์ไม่สำเร็จ'

        if (
            text.includes(
                'ORDER_NOT_OPEN'
            )
        ) {
            text =
                'บิลโต๊ะนี้ถูกปิดแล้ว กรุณาแจ้งพนักงาน'
        }

        if (
            text.includes(
                'INSUFFICIENT_INGREDIENT_STOCK'
            )
        ) {
            text =
                'สินค้าบางรายการมีวัตถุดิบไม่เพียงพอ กรุณาเลือกใหม่'
        }

        if (
            text.includes(
                'MODIFIER_SELECTION_REQUIRED_OR_INVALID'
            )
            ||
            text.includes(
                'INVALID_MODIFIER'
            )
        ) {
            text =
                'ตัวเลือกสินค้าบางรายการไม่ถูกต้อง กรุณาเลือกใหม่'
        }

        msg(
            el.cartMessage,
            text
        )

    } finally {

        el.submitOrderBtn.disabled =
            false

        el.submitOrderBtn.textContent =
            'ส่งออเดอร์เข้าร้าน'

        renderCart()
    }
}


/* ========================================
   INIT
======================================== */

async function init() {

    state.token =
        getTokenFromUrl()

    if (!state.token) {

        showFatalError(
            'QR Code นี้ไม่มีข้อมูลโต๊ะ'
        )

        return
    }

    try {

        await loadTableContext()

        if (
            state.order?.id
        ) {
            await loadMenu()
        }

        renderCart()

    } catch (error) {

        console.error(
            'Customer order init error:',
            error
        )

        let text =
            error.message
            ||
            'ไม่สามารถเปิดเมนูได้'

        if (
            text.includes(
                'TABLE_NOT_FOUND'
            )
            ||
            text.includes(
                'INVALID_QR_TOKEN'
            )
        ) {
            text =
                'QR Code นี้ไม่ถูกต้อง หรือโต๊ะถูกปิดใช้งาน'
        }

        showFatalError(
            text
        )
    }
}


/* ========================================
   EVENTS
======================================== */

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
        startOrder
    )


el.searchInput
    ?.addEventListener(
        'input',
        renderProducts
    )


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


el.productGrid
    ?.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-product-id]'
                )

            if (
                !button
                ||
                button.disabled
            ) {
                return
            }

            openProduct(
                button.dataset.productId
            )
        }
    )


el.modifierGroups
    ?.addEventListener(
        'change',
        updateModifierTotal
    )


el.modifierQtyMinus
    ?.addEventListener(
        'click',
        () => {

            state.modifierQty =
                Math.max(
                    state.modifierQty - 1,
                    1
                )

            renderModifierQty()
            updateModifierTotal()
        }
    )


el.modifierQtyPlus
    ?.addEventListener(
        'click',
        () => {

            const max =
                Math.max(
                    Math.floor(
                        Number(
                            state.modifierProduct
                                ?.available_qty
                            ||
                            1
                        )
                    ),
                    1
                )

            state.modifierQty =
                Math.min(
                    state.modifierQty + 1,
                    max
                )

            renderModifierQty()
            updateModifierTotal()
        }
    )


el.addToCartBtn
    ?.addEventListener(
        'click',
        addConfiguredItemToCart
    )


el.closeModifierBtn
    ?.addEventListener(
        'click',
        closeModifierModal
    )


el.cartButton
    ?.addEventListener(
        'click',
        openCart
    )


el.mobileCartBar
    ?.addEventListener(
        'click',
        openCart
    )


el.closeCartBtn
    ?.addEventListener(
        'click',
        closeCart
    )


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

            const key =
                button.dataset.key

            const action =
                button.dataset.act

            if (
                action ===
                'inc'
            ) {
                changeCartQty(
                    key,
                    1
                )

                return
            }

            if (
                action ===
                'dec'
            ) {
                changeCartQty(
                    key,
                    -1
                )

                return
            }

            if (
                action ===
                'remove'
            ) {
                state.cart.delete(
                    key
                )

                renderCart()
            }
        }
    )


el.submitOrderBtn
    ?.addEventListener(
        'click',
        submitOrder
    )


el.continueOrderBtn
    ?.addEventListener(
        'click',
        () => {

            el.successModal
                .classList
                .add(
                    'hidden'
                )
        }
    )


el.modifierModal
    ?.addEventListener(
        'click',
        event => {

            if (
                event.target ===
                el.modifierModal
            ) {
                closeModifierModal()
            }
        }
    )


el.cartModal
    ?.addEventListener(
        'click',
        event => {

            if (
                event.target ===
                el.cartModal
            ) {
                closeCart()
            }
        }
    )


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

            if (
                !el.modifierModal
                    .classList
                    .contains(
                        'hidden'
                    )
            ) {

                closeModifierModal()

                return
            }

            if (
                !el.cartModal
                    .classList
                    .contains(
                        'hidden'
                    )
            ) {
                closeCart()
            }
        }
    )


init()