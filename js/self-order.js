import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase.js'
import { PROMPTPAY_PHONE } from './config.js'

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
    submittedOrder: null,
    sessionToken: null,
    sessionExpiresAt: null,
    sessionTimer: null,
    sessionExpired: false
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
    sessionCountdownCard: $('sessionCountdownCard'),
    sessionCountdownText: $('sessionCountdownText'),
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
    selfOrderPromptpayQr: $('selfOrderPromptpayQr'),
    slipInput: $('slipInput'),
    slipPreviewWrap: $('slipPreviewWrap'),
    slipPreview: $('slipPreview'),
    verifySlipBtn: $('verifySlipBtn'),
    paymentMessage: $('paymentMessage'),
    paidSuccessBox: $('paidSuccessBox'),
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

function formatTLV(id, value) {
    const text = String(value)
    return `${id}${String(text.length).padStart(2, '0')}${text}`
}

function crc16(text) {
    let crc = 0xFFFF
    for (let i = 0; i < text.length; i++) {
        crc ^= text.charCodeAt(i) << 8
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
            crc &= 0xFFFF
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0')
}

function normalizePromptPayPhone(phone) {
    const cleaned = String(phone || '').replace(/\D/g, '')
    if (!/^0\d{9}$/.test(cleaned)) {
        throw new Error('ตั้งค่าเบอร์ PromptPay ไม่ถูกต้อง')
    }
    return `0066${cleaned.substring(1)}`
}

function generatePromptPayPayload(phone, amount) {
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('ยอดชำระเงินไม่ถูกต้อง')
    }

    const merchantAccount =
        formatTLV('00', 'A000000677010111') +
        formatTLV('01', normalizePromptPayPhone(phone))

    let payload = ''
    payload += formatTLV('00', '01')
    payload += formatTLV('01', '12')
    payload += formatTLV('29', merchantAccount)
    payload += formatTLV('53', '764')
    payload += formatTLV('54', numericAmount.toFixed(2))
    payload += formatTLV('58', 'TH')
    payload += formatTLV('59', 'PROMPTPAY')
    payload += formatTLV('60', 'BANGKOK')
    payload += '6304'
    return payload + crc16(payload)
}

function renderPaymentQr(amount) {
    if (!el.selfOrderPromptpayQr) return
    el.selfOrderPromptpayQr.innerHTML = ''

    if (!window.QRCode) {
        throw new Error('ไม่พบ QRCode library')
    }

    const payload = generatePromptPayPayload(PROMPTPAY_PHONE, amount)

    new window.QRCode(el.selfOrderPromptpayQr, {
        text: payload,
        width: 230,
        height: 230,
        correctLevel: window.QRCode.CorrectLevel.M
    })
}

async function startPayment(publicToken) {
    const { data, error } = await supabase.rpc(
        'self_order_start_payment_v1',
        { p_public_token: publicToken }
    )
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
}

async function verifySlip(file) {
    if (!state.submittedOrder?.public_token) {
        throw new Error('ไม่พบข้อมูลออเดอร์')
    }

    const form = new FormData()
    form.append('public_token', state.submittedOrder.public_token)
    form.append('image', file)

    const response = await fetch(`${SUPABASE_URL}/functions/v1/self-order-payment`, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY
        },
        body: form
    })

    let body = {}
    try { body = await response.json() } catch (_) {}

    if (!response.ok || body?.ok !== true) {
        const error = new Error(body?.message || body?.error || 'ตรวจสอบสลิปไม่สำเร็จ')
        error.code = body?.code
        throw error
    }

    return body
}

async function openPaymentForOrder(order) {
    state.submittedOrder = { ...state.submittedOrder, ...order }
    el.pendingOrderNo.textContent = `เลขออเดอร์ ${order.order_no}`
    el.pendingTotalText.textContent = money(order.total)
    el.slipInput.value = ''
    el.slipPreviewWrap.classList.add('hidden')
    el.verifySlipBtn.disabled = true
    el.paidSuccessBox.classList.add('hidden')
    msg(el.paymentMessage, 'กำลังเตรียมรายการชำระเงิน...')

    const payment = await startPayment(order.public_token)
    state.submittedOrder.payment_id = payment.payment_id
    state.submittedOrder.payment_status = payment.payment_status

    renderPaymentQr(payment.amount)
    msg(el.paymentMessage, '')
    el.pendingModal.classList.remove('hidden')
}

function msg(target, text='') {
    if (target) target.textContent = text
}

function getUrlParam(name){return new URLSearchParams(window.location.search).get(name)?.trim()||null}
function getScanTokenFromUrl(){return getUrlParam('scan')}
function getSessionTokenFromUrl(){return getUrlParam('session')}
function replaceUrlWithSession(t){const u=new URL(location.href);u.search='';u.searchParams.set('session',t);history.replaceState({},'',u)}

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

async function beginOrResumeSession(){const e=getSessionTokenFromUrl();if(e){const {data,error}=await supabase.rpc('self_order_get_session_v1',{p_session_token:e});if(error)throw error;const r=Array.isArray(data)?data[0]:data;state.sessionToken=r.session_token;state.sessionExpiresAt=r.expires_at;state.context=r.context||null;return}const s=getScanTokenFromUrl();if(!s)throw new Error('STORE_QR_REQUIRED');const {data,error}=await supabase.rpc('self_order_begin_session_v1',{p_scan_token:s});if(error)throw error;const r=Array.isArray(data)?data[0]:data;state.sessionToken=r.session_token;state.sessionExpiresAt=r.expires_at;state.context=r.context||null;replaceUrlWithSession(r.session_token)}
function stopSessionCountdown(){if(state.sessionTimer){clearInterval(state.sessionTimer);state.sessionTimer=null}}
function expireCustomerSession(){if(state.submittedOrder||state.sessionExpired)return;state.sessionExpired=true;stopSessionCountdown();state.cart.clear();renderCart();el.submitOrderBtn.disabled=true;el.mobileCartBar.classList.add('hidden');el.sessionCountdownCard.classList.add('expired');el.sessionCountdownText.textContent='00:00';showFatalError('หมดเวลาสั่งอาหารแล้ว กรุณาสแกน QR ที่หน้าร้านใหม่อีกครั้ง')}
function startSessionCountdown(){if(!state.sessionExpiresAt||state.submittedOrder)return;stopSessionCountdown();el.sessionCountdownCard.classList.remove('hidden','expired');const tick=()=>{const r=Math.max(0,Math.ceil((new Date(state.sessionExpiresAt).getTime()-Date.now())/1000)),m=Math.floor(r/60),s=r%60;el.sessionCountdownText.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;el.sessionCountdownCard.classList.toggle('warning',r<=300&&r>0);if(r<=0)expireCustomerSession()};tick();state.sessionTimer=setInterval(tick,1000)}
function ensureSessionActive(){if(state.sessionExpired||!state.sessionExpiresAt||new Date(state.sessionExpiresAt).getTime()<=Date.now()){expireCustomerSession();throw new Error('SELF_ORDER_SESSION_EXPIRED')}}

async function loadContextAndMenu(){const [cats,menu]=await Promise.all([supabase.rpc('self_order_get_categories_session_v1',{p_session_token:state.sessionToken}),supabase.rpc('self_order_get_menu_session_v1',{p_session_token:state.sessionToken})]);if(cats.error)throw cats.error;if(menu.error)throw menu.error;state.categories=Array.isArray(cats.data)?cats.data:[];const md=Array.isArray(menu.data)?menu.data[0]:menu.data;state.products=Array.isArray(md?.products)?md.products:[];el.pageTitle.textContent=state.context?.label||'สั่งกลับบ้าน';el.branchNameText.textContent=state.context?.branch_name||'สาขามิตรภาพ บ้านไผ่';renderCategories();renderProducts()}
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
    try{ensureSessionActive()}catch(_){return}
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
        'self_order_get_product_modifiers_session_v1',
        { p_session_token: state.sessionToken, p_product_id: product.id }
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
    try{ensureSessionActive()}catch(_){return}
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

        ensureSessionActive()
        const { data, error } = await supabase.rpc(
            'self_order_submit_cart_session_v1',
            {
                p_session_token: state.sessionToken,
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
        stopSessionCountdown()
        el.sessionCountdownCard.classList.add('hidden')
        state.cart.clear()
        renderCart()
        el.cartModal.classList.add('hidden')

        await openPaymentForOrder(result)

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

el.slipInput.addEventListener('change', () => {
    const file = el.slipInput.files?.[0]
    msg(el.paymentMessage, '')
    el.verifySlipBtn.disabled = !file

    if (!file) {
        el.slipPreviewWrap.classList.add('hidden')
        return
    }

    if (file.size > 4 * 1024 * 1024) {
        el.slipInput.value = ''
        el.verifySlipBtn.disabled = true
        el.slipPreviewWrap.classList.add('hidden')
        msg(el.paymentMessage, 'รูปสลิปต้องมีขนาดไม่เกิน 4 MB')
        return
    }

    const allowed = ['image/jpeg','image/png','image/webp','image/gif']
    if (!allowed.includes(file.type)) {
        el.slipInput.value = ''
        el.verifySlipBtn.disabled = true
        el.slipPreviewWrap.classList.add('hidden')
        msg(el.paymentMessage, 'รองรับเฉพาะ JPG / PNG / WebP / GIF')
        return
    }

    el.slipPreview.src = URL.createObjectURL(file)
    el.slipPreviewWrap.classList.remove('hidden')
})

el.verifySlipBtn.addEventListener('click', async () => {
    const file = el.slipInput.files?.[0]
    if (!file) return

    el.verifySlipBtn.disabled = true
    el.verifySlipBtn.textContent = 'กำลังตรวจสอบสลิป...'
    msg(el.paymentMessage, '')

    try {
        const result = await verifySlip(file)

        state.submittedOrder.payment_status = 'paid'
        el.paidSuccessBox.classList.remove('hidden')
        el.slipInput.disabled = true
        el.verifySlipBtn.classList.add('hidden')
        msg(el.paymentMessage, `ตรวจสอบสำเร็จ • ยอด ${money(result.amount)}`)

        try {
            sessionStorage.setItem(
                'chaixi_self_order_last',
                JSON.stringify({
                    public_token: state.submittedOrder.public_token,
                    order_no: state.submittedOrder.order_no,
                    total: state.submittedOrder.total,
                    payment_status: 'paid'
                })
            )
        } catch (_) {}

    } catch (error) {
        console.error('Verify slip error:', error)
        let text = error.message || 'ตรวจสอบสลิปไม่สำเร็จ'

        if (error.code === 'PAYMENT_AMOUNT_MISMATCH') {
            text = 'ยอดเงินในสลิปไม่ตรงกับยอดออเดอร์'
        } else if (error.code === 'PAYMENT_RECEIVER_MISMATCH') {
            text = 'บัญชีผู้รับในสลิปไม่ตรงกับบัญชีของร้าน'
        } else if (error.code === 'SLIP_ALREADY_USED') {
            text = 'สลิปนี้ถูกใช้กับออเดอร์อื่นแล้ว'
        } else if (error.code === 'EASYSLIP_NOT_CONFIGURED') {
            text = 'ระบบตรวจสลิปยังไม่ได้ตั้งค่า EasySlip API Key'
        }

        msg(el.paymentMessage, text)
        el.verifySlipBtn.disabled = false
    } finally {
        if (!el.verifySlipBtn.classList.contains('hidden')) {
            el.verifySlipBtn.textContent = 'ตรวจสอบการชำระเงิน'
        }
    }
})

el.closePendingBtn.addEventListener('click', () => el.pendingModal.classList.add('hidden'))

for (const modal of [el.modifierModal, el.cartModal]) {
    modal.addEventListener('click', event => {
        if (event.target === modal) modal.classList.add('hidden')
    })
}

async function init(){try{await beginOrResumeSession();startSessionCountdown();await loadContextAndMenu()}catch(error){console.error('Self order init error:',error);let text=error.message||'เปิดเมนูไม่สำเร็จ';if(text.includes('STORE_QR_REQUIRED'))text='กรุณาสแกน QR สั่งกลับบ้านที่หน้าร้าน';else if(text.includes('STORE_QR_EXPIRED')||text.includes('STORE_QR_NOT_FOUND')||text.includes('SELF_ORDER_SESSION_EXPIRED'))text='QR หรือเวลาสั่งอาหารหมดอายุแล้ว กรุณาสแกน QR ที่หน้าร้านใหม่';showFatalError(text)}finally{el.menuLoading.classList.add('hidden')}}
init()
