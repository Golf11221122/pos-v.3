import { supabase } from './supabase.js'

const state = {
    token: null,
    context: null,
    categories: [],
    products: [],
    selectedCategory: '',
    cart: new Map(),
    modifierProduct: null,
    modifierGroups: [],
    modifierQty: 1,
    submittedOrder: null
}

const $ = id => document.getElementById(id)
const el = {
    pageTitle: $('pageTitle'),
    branchNameText: $('branchNameText'),
    cartButton: $('cartButton'),
    cartCountText: $('cartCountText'),
    errorState: $('errorState'),
    errorText: $('errorText'),
    menuSection: $('menuSection'),
    searchInput: $('searchInput'),
    categoryTabs: $('categoryTabs'),
    menuLoading: $('menuLoading'),
    menuEmpty: $('menuEmpty'),
    productGrid: $('productGrid'),
    modifierModal: $('modifierModal'),
    modifierProductName: $('modifierProductName'),
    modifierBasePrice: $('modifierBasePrice'),
    closeModifierBtn: $('closeModifierBtn'),
    modifierGroups: $('modifierGroups'),
    itemNoteInput: $('itemNoteInput'),
    modifierQtyMinus: $('modifierQtyMinus'),
    modifierQtyPlus: $('modifierQtyPlus'),
    modifierQtyText: $('modifierQtyText'),
    modifierTotalText: $('modifierTotalText'),
    modifierMessage: $('modifierMessage'),
    addToCartBtn: $('addToCartBtn'),
    cartModal: $('cartModal'),
    closeCartBtn: $('closeCartBtn'),
    emptyCart: $('emptyCart'),
    cartItems: $('cartItems'),
    cartSummaryText: $('cartSummaryText'),
    cartTotalText: $('cartTotalText'),
    cartMessage: $('cartMessage'),
    submitOrderBtn: $('submitOrderBtn'),
    customerNameInput: $('customerNameInput'),
    customerPhoneInput: $('customerPhoneInput'),
    customerNoteInput: $('customerNoteInput'),
    pendingModal: $('pendingModal'),
    pendingOrderNo: $('pendingOrderNo'),
    pendingTotalText: $('pendingTotalText'),
    closePendingBtn: $('closePendingBtn'),
    mobileCartBar: $('mobileCartBar'),
    mobileCartCountText: $('mobileCartCountText'),
    mobileCartTotalText: $('mobileCartTotalText')
}

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

function msg(target, text='') {
    if (target) target.textContent = text
}

function getTokenFromUrl() {
    return new URLSearchParams(window.location.search).get('token')?.trim() || null
}

function cartItems() {
    return [...state.cart.values()]
}

function cartCount() {
    return cartItems().reduce((sum,item) => sum + Number(item.quantity || 0), 0)
}

function cartTotal() {
    return cartItems().reduce((sum,item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0)
}

function showFatalError(text) {
    el.menuSection.classList.add('hidden')
    el.mobileCartBar.classList.add('hidden')
    el.errorState.classList.remove('hidden')
    msg(el.errorText, text)
}

async function loadContextAndMenu() {
    const [ctx, cats, menu] = await Promise.all([
        supabase.rpc('self_order_get_context_v1', { p_qr_token: state.token }),
        supabase.rpc('self_order_get_categories_v1', { p_qr_token: state.token }),
        supabase.rpc('self_order_get_menu_v1', { p_qr_token: state.token })
    ])

    if (ctx.error) throw ctx.error
    if (cats.error) throw cats.error
    if (menu.error) throw menu.error

    state.context = Array.isArray(ctx.data) ? ctx.data[0] : ctx.data
    state.categories = Array.isArray(cats.data) ? cats.data : []

    const menuData = Array.isArray(menu.data) ? menu.data[0] : menu.data
    state.products = Array.isArray(menuData?.products) ? menuData.products : []

    el.pageTitle.textContent = state.context?.label || 'สั่งกลับบ้าน'
    el.branchNameText.textContent = state.context?.branch_name || 'สาขามิตรภาพ บ้านไผ่'

    renderCategories()
    renderProducts()
}

function renderCategories() {
    el.categoryTabs.innerHTML =
        `<button type="button" class="category-tab ${!state.selectedCategory ? 'active' : ''}" data-cat="">ทั้งหมด</button>` +
        state.categories.map(c => `
            <button type="button"
                class="category-tab ${state.selectedCategory === c.id ? 'active' : ''}"
                data-cat="${esc(c.id)}">
                ${esc(c.name)}
            </button>
        `).join('')
}

function filteredProducts() {
    const keyword = el.searchInput.value.trim().toLowerCase()
    return state.products.filter(product => {
        const catOk = !state.selectedCategory || product.category_id === state.selectedCategory
        const searchOk = !keyword || String(product.name || '').toLowerCase().includes(keyword)
        return catOk && searchOk
    })
}

function renderProducts() {
    const list = filteredProducts()

    if (!list.length) {
        el.menuEmpty.classList.remove('hidden')
        el.productGrid.classList.add('hidden')
        return
    }

    el.menuEmpty.classList.add('hidden')
    el.productGrid.classList.remove('hidden')

    el.productGrid.innerHTML = list.map(product => {
        const available = Math.max(Math.floor(Number(product.available_qty || 0)), 0)
        const soldOut = available <= 0
        const stockText = soldOut
            ? `<div class="stock-out">สินค้าหมด</div>`
            : available <= 10
                ? `<div class="stock-low">เหลือ ${available.toLocaleString('th-TH')} จาน</div>`
                : ''

        return `
            <article class="product-card ${soldOut ? 'sold-out' : ''}">
                <button type="button" data-product-id="${esc(product.id)}" ${soldOut ? 'disabled' : ''}>
                    <div class="product-image">
                        ${product.image_url
                            ? `<img src="${esc(product.image_url)}" alt="${esc(product.name)}">`
                            : '🍽️'}
                    </div>
                    <div class="product-info">
                        <h3>${esc(product.name)}</h3>
                        ${stockText}
                        <div class="product-price-row">
                            <strong>${money(product.price)}</strong>
                            ${soldOut ? '' : '<span class="add-icon">＋</span>'}
                        </div>
                    </div>
                </button>
            </article>
        `
    }).join('')
}

async function openModifier(productId) {
    const product = state.products.find(p => p.id === productId)
    if (!product) return

    state.modifierProduct = product
    state.modifierQty = 1
    state.modifierGroups = []
    el.modifierGroups.innerHTML = '<div class="state">กำลังโหลดตัวเลือก...</div>'
    el.itemNoteInput.value = ''
    msg(el.modifierMessage, '')
    el.modifierProductName.textContent = product.name
    el.modifierBasePrice.textContent = money(product.price)
    el.modifierModal.classList.remove('hidden')

    const { data, error } = await supabase.rpc(
        'self_order_get_product_modifiers_v1',
        { p_qr_token: state.token, p_product_id: product.id }
    )

    if (error) {
        msg(el.modifierMessage, error.message || 'โหลดตัวเลือกไม่สำเร็จ')
        return
    }

    state.modifierGroups = Array.isArray(data) ? data : []
    renderModifierGroups()
    renderModifierTotal()
}

function renderModifierGroups() {
    if (!state.modifierGroups.length) {
        el.modifierGroups.innerHTML = '<div class="state small">ไม่มีตัวเลือกเพิ่มเติม</div>'
        return
    }

    el.modifierGroups.innerHTML = state.modifierGroups.map(group => {
        const single = group.selection_type === 'single'
        const inputType = single ? 'radio' : 'checkbox'
        const required = group.is_required ? '<span class="required">จำเป็น</span>' : ''
        const minMax = [
            Number(group.min_select || 0) > 0 ? `ขั้นต่ำ ${group.min_select}` : '',
            Number(group.max_select || 0) > 0 ? `สูงสุด ${group.max_select}` : ''
        ].filter(Boolean).join(' • ')

        return `
            <section class="modifier-group" data-group-id="${esc(group.id)}">
                <div class="modifier-group-head">
                    <div>
                        <strong>${esc(group.name)}</strong>
                        ${required}
                    </div>
                    <small>${esc(minMax)}</small>
                </div>
                <div class="modifier-options">
                    ${(group.options || []).map(option => `
                        <label class="modifier-option">
                            <input
                                type="${inputType}"
                                name="modifier-${esc(group.id)}"
                                value="${esc(option.id)}"
                                data-group-id="${esc(group.id)}"
                                data-option-id="${esc(option.id)}"
                                data-price="${Number(option.price_adjustment || 0)}"
                            >
                            <span>${esc(option.name)}</span>
                            <strong>${Number(option.price_adjustment || 0) ? `+${money(option.price_adjustment)}` : ''}</strong>
                        </label>
                    `).join('')}
                </div>
            </section>
        `
    }).join('')
}

function selectedModifiers() {
    return [...el.modifierGroups.querySelectorAll('input:checked')].map(input => ({
        group_id: input.dataset.groupId,
        option_id: input.dataset.optionId,
        price_adjustment: Number(input.dataset.price || 0)
    }))
}

function validateModifierSelection() {
    const selected = selectedModifiers()
    for (const group of state.modifierGroups) {
        const count = selected.filter(x => x.group_id === group.id).length
        const min = Number(group.min_select || 0)
        const max = Number(group.max_select || 0)
        if (group.is_required && count < Math.max(min, 1)) return `กรุณาเลือก ${group.name}`
        if (count < min) return `${group.name} ต้องเลือกอย่างน้อย ${min}`
        if (max > 0 && count > max) return `${group.name} เลือกได้ไม่เกิน ${max}`
        if (group.selection_type === 'single' && count > 1) return `${group.name} เลือกได้ 1 รายการ`
    }
    return ''
}

function currentModifierUnitPrice() {
    const base = Number(state.modifierProduct?.price || 0)
    const extra = selectedModifiers().reduce((sum,x) => sum + Number(x.price_adjustment || 0), 0)
    return base + extra
}

function renderModifierTotal() {
    el.modifierQtyText.textContent = state.modifierQty.toLocaleString('th-TH')
    el.modifierTotalText.textContent = money(currentModifierUnitPrice() * state.modifierQty)
}

function addModifierItemToCart() {
    const validation = validateModifierSelection()
    if (validation) {
        msg(el.modifierMessage, validation)
        return
    }

    const product = state.modifierProduct
    if (!product) return

    const selected = selectedModifiers()
    const unitPrice = currentModifierUnitPrice()
    const note = el.itemNoteInput.value.trim()

    const key = [
        product.id,
        selected.map(x => x.option_id).sort().join(','),
        note
    ].join('|')

    const existing = state.cart.get(key)
    const nextQty = Number(existing?.quantity || 0) + state.modifierQty
    const available = Math.floor(Number(product.available_qty || 0))

    if (nextQty > available) {
        msg(el.modifierMessage, `เหลือสินค้า ${available.toLocaleString('th-TH')} จาน`)
        return
    }

    state.cart.set(key, {
        key,
        product_id: product.id,
        product_name: product.name,
        quantity: nextQty,
        base_price: Number(product.price || 0),
        unit_price: unitPrice,
        modifiers: selected.map(x => ({ group_id: x.group_id, option_id: x.option_id })),
        modifier_labels: selected.map(x => {
            const group = state.modifierGroups.find(g => g.id === x.group_id)
            const option = group?.options?.find(o => o.id === x.option_id)
            return option?.name || ''
        }).filter(Boolean),
        item_note: note
    })

    el.modifierModal.classList.add('hidden')
    renderCart()
}

function renderCart() {
    const items = cartItems()
    const count = cartCount()
    const total = cartTotal()

    el.cartCountText.textContent = count
    el.mobileCartCountText.textContent = `${count.toLocaleString('th-TH')} รายการ`
    el.mobileCartTotalText.textContent = money(total)
    el.cartSummaryText.textContent = `${count.toLocaleString('th-TH')} รายการ`
    el.cartTotalText.textContent = money(total)

    el.mobileCartBar.classList.toggle('hidden', count <= 0)
    el.emptyCart.classList.toggle('hidden', items.length > 0)
    el.cartItems.classList.toggle('hidden', items.length === 0)
    el.submitOrderBtn.disabled = items.length === 0 || Boolean(state.submittedOrder)

    el.cartItems.innerHTML = items.map(item => `
        <div class="cart-item" data-cart-key="${esc(item.key)}">
            <div class="cart-item-main">
                <strong>${esc(item.product_name)}</strong>
                ${item.modifier_labels.length
                    ? `<small>${item.modifier_labels.map(esc).join(', ')}</small>`
                    : ''}
                ${item.item_note ? `<small>หมายเหตุ: ${esc(item.item_note)}</small>` : ''}
                <span>${money(item.unit_price)} × ${item.quantity}</span>
            </div>
            <div class="cart-item-side">
                <strong>${money(item.unit_price * item.quantity)}</strong>
                <div class="mini-qty">
                    <button type="button" data-cart-action="minus" data-cart-key="${esc(item.key)}">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" data-cart-action="plus" data-cart-key="${esc(item.key)}">＋</button>
                </div>
                <button type="button" class="remove-button" data-cart-action="remove" data-cart-key="${esc(item.key)}">
                    ลบ
                </button>
            </div>
        </div>
    `).join('')
}

function updateCartItem(key, action) {
    const item = state.cart.get(key)
    if (!item) return

    if (action === 'remove') {
        state.cart.delete(key)
    } else if (action === 'minus') {
        item.quantity -= 1
        if (item.quantity <= 0) state.cart.delete(key)
        else state.cart.set(key, item)
    } else if (action === 'plus') {
        const product = state.products.find(p => p.id === item.product_id)
        const available = Math.floor(Number(product?.available_qty || 0))
        if (item.quantity + 1 > available) {
            msg(el.cartMessage, `สินค้า ${item.product_name} เหลือ ${available} จาน`)
            return
        }
        item.quantity += 1
        state.cart.set(key, item)
    }

    msg(el.cartMessage, '')
    renderCart()
}

async function submitOrder() {
    if (!cartItems().length || state.submittedOrder) return

    el.submitOrderBtn.disabled = true
    el.submitOrderBtn.textContent = 'กำลังสร้างออเดอร์...'
    msg(el.cartMessage, '')

    try {
        const payloadCart = cartItems().map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            modifiers: item.modifiers,
            item_note: item.item_note || null
        }))

        const { data, error } = await supabase.rpc(
            'self_order_submit_cart_v1',
            {
                p_qr_token: state.token,
                p_cart: payloadCart,
                p_customer_name: el.customerNameInput.value.trim() || null,
                p_customer_phone: el.customerPhoneInput.value.trim() || null,
                p_customer_note: el.customerNoteInput.value.trim() || null
            }
        )

        if (error) throw error

        const result = Array.isArray(data) ? data[0] : data
        if (!result?.self_order_id) throw new Error('สร้างออเดอร์ไม่สำเร็จ')

        state.submittedOrder = result
        state.cart.clear()
        renderCart()
        el.cartModal.classList.add('hidden')

        el.pendingOrderNo.textContent = `เลขออเดอร์ ${result.order_no}`
        el.pendingTotalText.textContent = money(result.total)
        el.pendingModal.classList.remove('hidden')

        try {
            sessionStorage.setItem(
                'chaixi_self_order_last',
                JSON.stringify({
                    public_token: result.public_token,
                    order_no: result.order_no,
                    total: result.total
                })
            )
        } catch (_) {}

    } catch (error) {
        console.error('Submit self order error:', error)
        let text = error.message || 'สร้างออเดอร์ไม่สำเร็จ'
        if (text.includes('PRODUCT_OUT_OF_STOCK')) text = 'มีสินค้าบางรายการหมด กรุณาตรวจตะกร้าอีกครั้ง'
        if (text.includes('INVALID_MODIFIER')) text = 'ตัวเลือกสินค้าไม่ถูกต้อง กรุณาเลือกใหม่'
        msg(el.cartMessage, text)
    } finally {
        if (!state.submittedOrder) {
            el.submitOrderBtn.disabled = false
            el.submitOrderBtn.textContent = 'ไปชำระเงิน'
        }
    }
}

el.categoryTabs.addEventListener('click', event => {
    const button = event.target.closest('[data-cat]')
    if (!button) return
    state.selectedCategory = button.dataset.cat || ''
    renderCategories()
    renderProducts()
})

el.searchInput.addEventListener('input', renderProducts)

el.productGrid.addEventListener('click', event => {
    const button = event.target.closest('[data-product-id]')
    if (!button || button.disabled) return
    openModifier(button.dataset.productId)
})

el.closeModifierBtn.addEventListener('click', () => el.modifierModal.classList.add('hidden'))
el.modifierGroups.addEventListener('change', renderModifierTotal)

el.modifierQtyMinus.addEventListener('click', () => {
    state.modifierQty = Math.max(1, state.modifierQty - 1)
    renderModifierTotal()
})

el.modifierQtyPlus.addEventListener('click', () => {
    const available = Math.floor(Number(state.modifierProduct?.available_qty || 0))
    state.modifierQty = Math.min(Math.max(available, 1), state.modifierQty + 1)
    renderModifierTotal()
})

el.addToCartBtn.addEventListener('click', addModifierItemToCart)

function openCart() {
    renderCart()
    el.cartModal.classList.remove('hidden')
}

el.cartButton.addEventListener('click', openCart)
el.mobileCartBar.addEventListener('click', openCart)
el.closeCartBtn.addEventListener('click', () => el.cartModal.classList.add('hidden'))

el.cartItems.addEventListener('click', event => {
    const button = event.target.closest('[data-cart-action]')
    if (!button) return
    updateCartItem(button.dataset.cartKey, button.dataset.cartAction)
})

el.submitOrderBtn.addEventListener('click', submitOrder)
el.closePendingBtn.addEventListener('click', () => el.pendingModal.classList.add('hidden'))

for (const modal of [el.modifierModal, el.cartModal]) {
    modal.addEventListener('click', event => {
        if (event.target === modal) modal.classList.add('hidden')
    })
}

async function init() {
    state.token = getTokenFromUrl()

    if (!state.token) {
        showFatalError('ลิงก์สั่งอาหารไม่ถูกต้อง')
        return
    }

    try {
        await loadContextAndMenu()
    } catch (error) {
        console.error('Self order init error:', error)
        let text = error.message || 'เปิดเมนูไม่สำเร็จ'
        if (text.includes('SELF_ORDER_QR_NOT_FOUND')) {
            text = 'QR สั่งกลับบ้านนี้ไม่ถูกต้อง หรือถูกปิดใช้งานแล้ว'
        }
        showFatalError(text)
    } finally {
        el.menuLoading.classList.add('hidden')
    }
}

init()
