import { supabase } from './supabase.js'

const $ = id => document.getElementById(id)

const el = {
    branch: $('branchText'),
    refresh: $('refreshBtn'),
    search: $('searchInput'),
    tabs: $('filterTabs'),
    board: $('board'),
    message: $('message'),

    pending: $('pendingCount'),
    kitchen: $('kitchenCount'),
    ready: $('readyCount'),

    readySectionCount: $('readySectionCount'),
    kitchenSectionCount: $('kitchenSectionCount'),
    pendingSectionCount: $('pendingSectionCount'),

    readyList: $('readyList'),
    kitchenList: $('kitchenList'),
    pendingList: $('pendingList'),

    searchResultsSection: $('searchResultsSection'),
    searchResultsList: $('searchResultsList'),
    searchResultCount: $('searchResultCount'),
    empty: $('emptyState'),

    problemBellBtn: $('problemBellBtn'),
    problemBellCount: $('problemBellCount'),
    problemDrawer: $('problemDrawer'),
    problemDrawerCount: $('problemDrawerCount'),
    problemList: $('problemList'),
    problemEmpty: $('problemEmpty'),

    historyBtn: $('historyBtn'),
    historyDrawer: $('historyDrawer'),
    historyDrawerCount: $('historyDrawerCount'),
    historyList: $('historyList'),
    historyEmpty: $('historyEmpty'),

    orderDrawer: $('orderDrawer'),
    orderDrawerSubtitle: $('orderDrawerSubtitle'),
    orderDetail: $('orderDetail'),

    drawerBackdrop: $('drawerBackdrop')
}

const state = {
    rows: [],
    filter: 'all',
    timer: null,
    profile: null,
    openDrawer: null
}

const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const money = value => new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
}).format(Number(value || 0))

const time = value => {
    if (!value) return '-'
    try {
        return new Intl.DateTimeFormat('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(value))
    } catch {
        return '-'
    }
}

const padQueue = value => {
    const n = Number(value || 0)
    return n > 0 ? String(Math.trunc(n)).padStart(3, '0') : '-'
}

const WAIT_ALERT_MINUTES = 10

function ageMinutes(value) {
    if (!value) return 0
    const ms = Date.now() - new Date(value).getTime()
    return Math.max(0, Math.floor(ms / 60000))
}

function waitInfo(row) {
    const b = bucket(row)
    let from = row.created_at

    if (b === 'ready_for_pickup') {
        from = row.ready_at || row.created_at
    } else if (b === 'kitchen') {
        from = row.paid_at || row.created_at
    }

    const mins = ageMinutes(from)
    return {
        minutes: mins,
        long: mins >= WAIT_ALERT_MINUTES,
        label: mins <= 0 ? 'เมื่อสักครู่' : `รอ ${mins} นาที`
    }
}

function problemReason(row) {
    if (row.sale_stock_status === 'blocked') {
        return row.sale_stock_error || 'Sale/Stock ถูกบล็อก'
    }

    if (row.kitchen_dispatch_status === 'blocked') {
        return row.kitchen_dispatch_error || 'ส่งเข้าครัวไม่สำเร็จ'
    }

    if (row.cancellation_status === 'requested') {
        return 'มีคำขอยกเลิกออเดอร์'
    }

    if (['pending', 'pending_approval'].includes(row.refund_status)) {
        return 'มีรายการคืนเงินที่รอดำเนินการ'
    }

    return 'ต้องตรวจสอบออเดอร์'
}

function msg(text = '', bad = false) {
    el.message.textContent = text
    el.message.classList.toggle('error', bad)
}

function isTodayBangkok(value) {
    if (!value) return false

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })

    return formatter.format(new Date(value)) === formatter.format(new Date())
}

async function requireStaff() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession()

    if (error) throw error

    if (!session) {
        location.replace('./index.html')
        return false
    }

    const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id,full_name,role,branch_id')
        .eq('id', session.user.id)
        .maybeSingle()

    if (profileError) throw profileError
    if (!data?.branch_id) throw new Error('บัญชียังไม่ได้กำหนดสาขา')

    state.profile = data

    const { data: branch } = await supabase
        .from('branches')
        .select('name')
        .eq('id', data.branch_id)
        .maybeSingle()

    el.branch.textContent = `สาขา: ${branch?.name || '-'}`
    return true
}

function bucket(row) {
    if (
        row.sale_stock_status === 'blocked' ||
        row.kitchen_dispatch_status === 'blocked' ||
        row.cancellation_status === 'requested' ||
        ['pending', 'pending_approval'].includes(row.refund_status)
    ) {
        return 'problem'
    }

    if (row.status === 'completed' || row.status === 'picked_up') {
        return 'completed'
    }

    if (row.status === 'ready_for_pickup') {
        return 'ready_for_pickup'
    }

    if (row.payment_status !== 'paid') {
        return 'payment_pending'
    }

    return 'kitchen'
}

function activeRows() {
    return state.rows.filter(row => {
        const b = bucket(row)
        return b !== 'completed' && b !== 'problem' && row.status !== 'cancelled'
    })
}

function rowsForBucket(name) {
    return state.rows.filter(row => bucket(row) === name)
}

function kitchenLabel(row) {
    if (row.status === 'ready_for_pickup') return 'พร้อมรับ'
    if (row.status === 'dispatched') return 'กำลังทำ'
    if (row.status === 'paid') return 'รอเข้าครัว'
    return row.status || '-'
}

function paymentLabel(row) {
    return row.payment_status === 'paid' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'
}

function makeCard(row, mode = 'active') {
    const b = bucket(row)
    const canPickup = b === 'ready_for_pickup' && row.pickup_code
    const saleLabel = row.sale_stock_status || 'pending'
    const wait = waitInfo(row)

    const paymentClass = row.payment_status === 'paid' ? 'green' : 'orange'
    const kitchenClass =
        b === 'ready_for_pickup'
            ? 'green'
            : b === 'kitchen'
                ? 'blue'
                : ''

    let cardClass = ''
    if (b === 'ready_for_pickup') cardClass = 'ready-card'
    if (b === 'kitchen') cardClass = 'kitchen-card'
    if (b === 'payment_pending') cardClass = 'pending-card'
    if (b === 'problem') cardClass = 'problem-card'
    if (b === 'completed') cardClass = 'completed-card'

    const problemBadge = b === 'problem'
        ? '<span class="badge red">⚠️ ต้องตรวจสอบ</span>'
        : ''

    let primaryAction = ''

    if (canPickup) {
        primaryAction =
            `<a class="mini-action pickup" href="./pickup.html?code=${encodeURIComponent(row.pickup_code)}">🛍️ ตรวจรับอาหาร</a>`
    } else if (b === 'kitchen') {
        primaryAction =
            '<a class="mini-action kitchen-action" href="./kitchen.html">👨‍🍳 เปิดจอครัว</a>'
    } else if (b === 'payment_pending') {
        primaryAction =
            `<button class="mini-action pending-action" type="button" data-detail-id="${esc(row.id)}">💳 ดูออเดอร์</button>`
    } else if (b === 'problem') {
        primaryAction =
            `<button class="mini-action problem-action" type="button" data-detail-id="${esc(row.id)}">⚠️ ดูสาเหตุ</button>`
    } else {
        primaryAction =
            `<button class="mini-action secondary" type="button" data-detail-id="${esc(row.id)}">ดูรายละเอียด</button>`
    }

    return `
        <article class="mini-card ${cardClass} ${wait.long && b !== 'completed' ? 'waiting-long' : ''}">
            <div class="mini-card-top">
                <div class="mini-queue">
                    <small>คิว</small>
                    <strong>${esc(padQueue(row.queue_no))}</strong>
                </div>

                <div class="mini-meta">
                    <div class="order-line">
                        <strong>${esc(row.order_no || '-')}</strong>
                        <time>${esc(time(row.created_at))}</time>
                    </div>
                    <div class="pickup-code-line">
                        <span>รหัสรับอาหาร</span>
                        <b>${esc(row.pickup_code || '-')}</b>
                    </div>
                </div>
            </div>

            <div class="wait-line ${wait.long ? 'long' : ''}">
                ⏱️ ${esc(wait.label)}
                ${wait.long ? '<span>รอนาน</span>' : ''}
            </div>

            <div class="customer-line">
                <span>ลูกค้า: ${esc(row.customer_name || '-')}</span>
                <strong>${esc(money(row.total))}</strong>
            </div>

            <div class="mini-status-row">
                <span class="badge ${paymentClass}">${esc(paymentLabel(row))}</span>
                <span class="badge ${kitchenClass}">ครัว: ${esc(kitchenLabel(row))}</span>
                ${b === 'problem' || mode === 'history'
                    ? `<span class="badge ${saleLabel === 'blocked' ? 'red' : ''}">Sale/Stock: ${esc(saleLabel)}</span>`
                    : ''}
                ${problemBadge}
            </div>

            <div class="mini-actions">
                ${primaryAction}
                <button class="mini-action secondary" type="button" data-copy="${esc(row.order_no || '')}">
                    คัดลอกเลขออเดอร์
                </button>
            </div>
        </article>
    `
}

function renderSection(listElement, rows, limit = 5) {
    listElement.innerHTML = rows
        .slice(0, limit)
        .map(row => makeCard(row))
        .join('')
}

function matchesSearch(row, keyword) {
    return [
        row.order_no,
        row.pickup_code,
        String(row.queue_no ?? ''),
        row.customer_name,
        row.customer_phone
    ].some(value =>
        String(value || '')
            .toLowerCase()
            .includes(keyword)
    )
}

function setFilter(filter) {
    state.filter = filter

    el.tabs.querySelectorAll('.filter-tab').forEach(button => {
        button.classList.toggle('active', button.dataset.filter === filter)
    })

    render()
}

function renderMainBoard() {
    const keyword = el.search.value.trim().toLowerCase()

    const readyRows = rowsForBucket('ready_for_pickup')
    const kitchenRows = rowsForBucket('kitchen')
    const pendingRows = rowsForBucket('payment_pending')
    const problemRows = rowsForBucket('problem')
    const completedRows = rowsForBucket('completed')

    el.ready.textContent = readyRows.length
    el.kitchen.textContent = kitchenRows.length
    el.pending.textContent = pendingRows.length

    el.readySectionCount.textContent = readyRows.length
    el.kitchenSectionCount.textContent = kitchenRows.length
    el.pendingSectionCount.textContent = pendingRows.length

    el.problemBellCount.textContent = problemRows.length
    el.problemBellCount.classList.toggle('hidden', problemRows.length === 0)

    el.problemDrawerCount.textContent = problemRows.length
    el.historyDrawerCount.textContent = completedRows.length

    el.problemList.innerHTML = problemRows.map(row => makeCard(row, 'problem')).join('')
    el.problemEmpty.classList.toggle('hidden', problemRows.length > 0)

    el.historyList.innerHTML = completedRows.map(row => makeCard(row, 'history')).join('')
    el.historyEmpty.classList.toggle('hidden', completedRows.length > 0)

    if (keyword) {
        const matches = activeRows().filter(row => matchesSearch(row, keyword))

        el.searchResultsSection.classList.remove('hidden')
        document.querySelectorAll('.status-section[data-section]').forEach(section => {
            section.classList.add('hidden')
        })

        el.searchResultCount.textContent = matches.length
        el.searchResultsList.innerHTML = matches.map(row => makeCard(row)).join('')
        el.empty.classList.toggle('hidden', matches.length > 0)
        return
    }

    el.searchResultsSection.classList.add('hidden')
    el.empty.classList.add('hidden')

    const sectionMap = {
        ready_for_pickup: {
            section: document.querySelector('[data-section="ready_for_pickup"]'),
            rows: readyRows,
            list: el.readyList
        },
        kitchen: {
            section: document.querySelector('[data-section="kitchen"]'),
            rows: kitchenRows,
            list: el.kitchenList
        },
        payment_pending: {
            section: document.querySelector('[data-section="payment_pending"]'),
            rows: pendingRows,
            list: el.pendingList
        }
    }

    Object.values(sectionMap).forEach(entry => entry.section.classList.remove('hidden'))

    if (state.filter === 'all') {
        renderSection(el.readyList, readyRows)
        renderSection(el.kitchenList, kitchenRows)
        renderSection(el.pendingList, pendingRows)

        Object.values(sectionMap).forEach(entry => {
            entry.section.classList.toggle('hidden', entry.rows.length === 0)
        })

        el.empty.classList.toggle(
            'hidden',
            readyRows.length + kitchenRows.length + pendingRows.length > 0
        )

        return
    }

    if (state.filter === 'today') {
        const todayReady = readyRows.filter(row => isTodayBangkok(row.created_at))
        const todayKitchen = kitchenRows.filter(row => isTodayBangkok(row.created_at))
        const todayPending = pendingRows.filter(row => isTodayBangkok(row.created_at))

        renderSection(el.readyList, todayReady, Number.MAX_SAFE_INTEGER)
        renderSection(el.kitchenList, todayKitchen, Number.MAX_SAFE_INTEGER)
        renderSection(el.pendingList, todayPending, Number.MAX_SAFE_INTEGER)

        sectionMap.ready_for_pickup.section.classList.toggle('hidden', todayReady.length === 0)
        sectionMap.kitchen.section.classList.toggle('hidden', todayKitchen.length === 0)
        sectionMap.payment_pending.section.classList.toggle('hidden', todayPending.length === 0)

        el.empty.classList.toggle(
            'hidden',
            todayReady.length + todayKitchen.length + todayPending.length > 0
        )

        return
    }

    Object.entries(sectionMap).forEach(([name, entry]) => {
        const selected = name === state.filter
        entry.section.classList.toggle('hidden', !selected)

        if (selected) {
            renderSection(entry.list, entry.rows, Number.MAX_SAFE_INTEGER)
            el.empty.classList.toggle('hidden', entry.rows.length > 0)
        }
    })
}

function render() {
    renderMainBoard()
}

function openDrawer(name) {
    closeDrawer()

    const drawer =
        name === 'problem'
            ? el.problemDrawer
            : name === 'history'
                ? el.historyDrawer
                : el.orderDrawer

    state.openDrawer = name
    drawer.classList.remove('hidden')
    drawer.setAttribute('aria-hidden', 'false')
    el.drawerBackdrop.classList.remove('hidden')
    document.body.classList.add('drawer-open')
}

function closeDrawer() {
    ;[el.problemDrawer, el.historyDrawer, el.orderDrawer].forEach(drawer => {
        drawer.classList.add('hidden')
        drawer.setAttribute('aria-hidden', 'true')
    })

    el.drawerBackdrop.classList.add('hidden')
    document.body.classList.remove('drawer-open')
    state.openDrawer = null
}


function renderOrderDetail(row) {
    if (!row) return

    const b = bucket(row)
    const reason = b === 'problem' ? problemReason(row) : ''
    const wait = waitInfo(row)

    el.orderDrawerSubtitle.textContent =
        `${row.order_no || '-'} • คิว ${padQueue(row.queue_no)}`

    el.orderDetail.innerHTML = `
        <div class="detail-hero">
            <div>
                <span>คิว</span>
                <strong>${esc(padQueue(row.queue_no))}</strong>
            </div>
            <div>
                <span>ยอด</span>
                <strong>${esc(money(row.total))}</strong>
            </div>
        </div>

        ${reason
            ? `<div class="detail-alert"><strong>สาเหตุที่ต้องตรวจสอบ</strong><p>${esc(reason)}</p></div>`
            : ''}

        <div class="detail-grid">
            <div><span>เลขออเดอร์</span><strong>${esc(row.order_no || '-')}</strong></div>
            <div><span>รหัสรับอาหาร</span><strong>${esc(row.pickup_code || '-')}</strong></div>
            <div><span>ลูกค้า</span><strong>${esc(row.customer_name || '-')}</strong></div>
            <div><span>โทรศัพท์</span><strong>${esc(row.customer_phone || '-')}</strong></div>
            <div><span>Payment</span><strong>${esc(row.payment_status || '-')}</strong></div>
            <div><span>Kitchen</span><strong>${esc(row.kitchen_dispatch_status || row.status || '-')}</strong></div>
            <div><span>Sale/Stock</span><strong>${esc(row.sale_stock_status || 'pending')}</strong></div>
            <div><span>เวลารอ</span><strong>${esc(wait.label)}</strong></div>
        </div>

        <div class="detail-actions">
            ${b === 'ready_for_pickup' && row.pickup_code
                ? `<a class="detail-action primary" href="./pickup.html?code=${encodeURIComponent(row.pickup_code)}">🛍️ เปิดหน้าตรวจรับอาหาร</a>`
                : ''}
            ${b === 'kitchen'
                ? '<a class="detail-action primary" href="./kitchen.html">👨‍🍳 เปิดจอครัว</a>'
                : ''}
            <button class="detail-action" type="button" data-copy="${esc(row.order_no || '')}">คัดลอกเลขออเดอร์</button>
        </div>
    `

    openDrawer('order')
}

function openOrderDetail(id) {
    const row = state.rows.find(item => String(item.id) === String(id))
    if (!row) {
        msg('ไม่พบออเดอร์นี้แล้ว กรุณารีเฟรช', true)
        return
    }

    renderOrderDetail(row)
}

async function load() {
    msg('กำลังอัปเดต...')

    const { data, error } = await supabase.rpc('self_order_live_center_v1')

    if (error) {
        msg(error.message || 'โหลดออเดอร์ไม่สำเร็จ', true)
        return
    }

    state.rows = Array.isArray(data) ? data : []
    msg('')
    render()
}

el.tabs.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]')
    if (!button) return
    setFilter(button.dataset.filter)
})

el.board.addEventListener('click', event => {
    const filterButton = event.target.closest('[data-show-filter]')
    if (filterButton) {
        setFilter(filterButton.dataset.showFilter)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }

    const detailButton = event.target.closest('[data-detail-id]')
    if (detailButton) {
        openOrderDetail(detailButton.dataset.detailId)
        return
    }

    const copyButton = event.target.closest('[data-copy]')
    if (!copyButton) return

    navigator.clipboard
        .writeText(copyButton.dataset.copy)
        .then(() => msg('คัดลอกเลขออเดอร์แล้ว'))
        .catch(() => msg('คัดลอกไม่สำเร็จ', true))
})

document.addEventListener('click', event => {
    const detailButton = event.target.closest('.side-drawer [data-detail-id]')
    if (detailButton) {
        openOrderDetail(detailButton.dataset.detailId)
        return
    }

    const copyButton = event.target.closest('.side-drawer [data-copy]')
    if (!copyButton) return

    navigator.clipboard
        .writeText(copyButton.dataset.copy)
        .then(() => msg('คัดลอกเลขออเดอร์แล้ว'))
        .catch(() => msg('คัดลอกไม่สำเร็จ', true))
})

el.search.addEventListener('input', render)
el.refresh.addEventListener('click', load)

el.problemBellBtn.addEventListener('click', () => openDrawer('problem'))
el.historyBtn.addEventListener('click', () => openDrawer('history'))

el.drawerBackdrop.addEventListener('click', closeDrawer)

document.querySelectorAll('[data-close-drawer]').forEach(button => {
    button.addEventListener('click', closeDrawer)
})

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDrawer()
})

async function init() {
    try {
        if (!await requireStaff()) return

        await load()

        state.timer = setInterval(() => {
            if (!document.hidden) load()
        }, 5000)
    } catch (error) {
        console.error(error)
        msg(error.message || 'เปิดหน้า QR Self Order Live ไม่สำเร็จ', true)
    }
}

init()
