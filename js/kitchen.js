import { supabase } from './supabase.js'

const state = {
    session: null,
    profile: null,
    branch: null,
    stations: [],
    selectedStation: '',
    items: [],
    soundEnabled: false,
    knownItemIds: new Set(),
    realtimeChannel: null,
    realtimeRetryTimer: null,
    realtimePollTimer: null
}

const $ = id => document.getElementById(id)

const el = {
    branchText: $('branchText'),
    stationSelect: $('stationSelect'),
    selectedStationText: $('selectedStationText'),
    enableSoundBtn: $('enableSoundBtn'),
    refreshBtn: $('refreshBtn'),
    backBtn: $('backBtn'),

    pendingCount: $('pendingCount'),
    preparingCount: $('preparingCount'),
    readyCount: $('readyCount'),

    pendingBadge: $('pendingBadge'),
    preparingBadge: $('preparingBadge'),
    readyBadge: $('readyBadge'),

    statusText: $('statusText'),

    pendingGrid: $('pendingGrid'),
    preparingGrid: $('preparingGrid'),
    readyGrid: $('readyGrid'),

    pendingEmpty: $('pendingEmpty'),
    preparingEmpty: $('preparingEmpty'),
    readyEmpty: $('readyEmpty'),

    pageMessage: $('pageMessage'),
    kitchenPrintArea: $('kitchenPrintArea')
}

function msg(target, text = '') {
    if (target) target.textContent = text
}

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function formatTime(value) {
    try {
        return new Intl.DateTimeFormat(
            'th-TH',
            {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }
        ).format(new Date(value))
    } catch {
        return '-'
    }
}

function tableName(item) {
    return item.table_name
        || (
            item.table_no
                ? `โต๊ะ ${item.table_no}`
                : 'ไม่ระบุโต๊ะ'
        )
}

function statusText(status) {
    return {
        pending: 'ออเดอร์ใหม่',
        preparing: 'กำลังทำ',
        ready: 'พร้อมเสิร์ฟ'
    }[status] || status
}


/* ========================================
   SOUND
======================================== */

function playAlertSound() {
    if (!state.soundEnabled) return

    try {
        const AudioContext =
            window.AudioContext
            || window.webkitAudioContext

        if (!AudioContext) return

        const ctx = new AudioContext()

        const tone = (frequency, start, duration) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            osc.frequency.value = frequency
            osc.type = 'sine'

            gain.gain.setValueAtTime(
                0.0001,
                ctx.currentTime + start
            )

            gain.gain.exponentialRampToValueAtTime(
                0.35,
                ctx.currentTime + start + 0.02
            )

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                ctx.currentTime + start + duration
            )

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start(ctx.currentTime + start)
            osc.stop(ctx.currentTime + start + duration)
        }

        tone(880, 0, 0.22)
        tone(1100, 0.28, 0.22)
        tone(880, 0.56, 0.28)

        setTimeout(
            () => ctx.close().catch(() => { }),
            1200
        )

    } catch (error) {
        console.warn('Alert sound error:', error)
    }
}


/* ========================================
   AUTH
======================================== */

async function requireSession() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession()

    if (error) throw error

    if (!session) {
        location.replace('./index.html')
        return null
    }

    state.session = session
    return session
}

async function loadProfile(userId) {
    const {
        data,
        error
    } = await supabase
        .from('profiles')
        .select('id,full_name,role,branch_id')
        .eq('id', userId)
        .maybeSingle()

    if (error) throw error

    if (!data?.branch_id) {
        throw new Error(
            'บัญชียังไม่ได้กำหนดสาขา'
        )
    }

    state.profile = data
}

async function loadBranch() {
    const {
        data,
        error
    } = await supabase
        .from('branches')
        .select('id,name')
        .eq('id', state.profile.branch_id)
        .maybeSingle()

    if (error) throw error

    if (!data) {
        throw new Error('ไม่พบสาขา')
    }

    state.branch = data

    el.branchText.textContent =
        `สาขา: ${data.name}`
}

/* ========================================
   KITCHEN STATIONS
======================================== */

function stationStorageKey() {
    return `jokjung-kitchen-station-${state.profile.branch_id}`
}

async function loadKitchenStations() {
    const { data, error } = await supabase
        .from('kitchen_stations')
        .select('id,name,code,display_order,is_active')
        .eq('branch_id', state.profile.branch_id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

    if (error) throw error
    state.stations = data || []

    const saved = localStorage.getItem(stationStorageKey()) || ''
    const validSaved = !saved || state.stations.some(station => station.id === saved)
    state.selectedStation = validSaved ? saved : ''
    renderStationSelect()
}

function renderStationSelect() {
    if (!el.stationSelect) return

    el.stationSelect.innerHTML = `
        <option value="">ทุกครัว</option>
        ${state.stations.map(station => `
            <option value="${esc(station.id)}">${esc(station.name)}</option>
        `).join('')}
    `

    el.stationSelect.value = state.selectedStation
    renderSelectedStationText()
}

function renderSelectedStationText() {
    const station = state.stations.find(row => row.id === state.selectedStation)
    const text = station?.name || 'ทุกครัว'
    if (el.selectedStationText) el.selectedStationText.textContent = text
    document.title = state.selectedStation ? `${text} | JOKJUNG POS` : 'Kitchen | JOKJUNG POS'
}



/* ========================================
   LOAD / RENDER
======================================== */

async function loadKitchenItems({
    notifyNew = false
} = {}) {
    const {
        data,
        error
    } = await supabase.rpc(
        'get_kitchen_active_items_by_station',
        {
            p_kitchen_station_id: state.selectedStation || null
        }
    )

    if (error) throw error

    const list =
        Array.isArray(data)
            ? data
            : []

    /*
     * แจ้งเตือนออเดอร์ใหม่ทุกแหล่ง:
     * - QR
     * - POS ทานที่ร้าน
     * - POS กลับบ้าน
     *
     * ไม่จำกัดเฉพาะ order_source === 'qr'
     */
    const newPending =
        list.filter(item =>
            item.item_status === 'pending'
            && !state.knownItemIds.has(item.item_id)
        )

    state.items = list

    for (const item of list) {
        state.knownItemIds.add(item.item_id)
    }

    renderBoard()

    if (notifyNew && newPending.length > 0) {
        playAlertSound()

        const toPrint =
            newPending.filter(
                item => !item.kitchen_printed_at
            )

        for (const item of toPrint) {
            await printKitchenItem(
                item,
                { auto: true }
            )

            await new Promise(resolve =>
                setTimeout(resolve, 400)
            )
        }
    }
}

function setCount(target, value) {
    if (target) {
        target.textContent =
            Number(value).toLocaleString('th-TH')
    }
}

function renderBoard() {
    const pending =
        state.items.filter(
            item => item.item_status === 'pending'
        )

    const preparing =
        state.items.filter(
            item => item.item_status === 'preparing'
        )

    const ready =
        state.items.filter(
            item => item.item_status === 'ready'
        )

    setCount(el.pendingCount, pending.length)
    setCount(el.preparingCount, preparing.length)
    setCount(el.readyCount, ready.length)

    setCount(el.pendingBadge, pending.length)
    setCount(el.preparingBadge, preparing.length)
    setCount(el.readyBadge, ready.length)

    const selectedStation = state.stations.find(
        station => station.id === state.selectedStation
    )
    const stationName = selectedStation?.name || 'ทุกครัว'

    el.statusText.textContent =
        state.items.length
            ? `${stationName} • ${state.items.length.toLocaleString('th-TH')} รายการ`
            : `${stationName} • รอออเดอร์ใหม่...`

    renderColumn(
        el.pendingGrid,
        el.pendingEmpty,
        pending
    )

    renderColumn(
        el.preparingGrid,
        el.preparingEmpty,
        preparing
    )

    renderColumn(
        el.readyGrid,
        el.readyEmpty,
        ready
    )
}

function renderColumn(grid, empty, list) {
    if (!grid || !empty) return

    empty.classList.toggle(
        'hidden',
        list.length > 0
    )

    grid.classList.toggle(
        'hidden',
        list.length === 0
    )

    grid.innerHTML =
        list.map(renderTicket).join('')
}

function renderTicket(item) {
    const modifiers =
        Array.isArray(item.modifiers)
            ? item.modifiers
            : []

    const modifierHtml =
        modifiers
            .map(modifier =>
                `${esc(modifier.group_name || '')}: ${esc(modifier.option_name || '')}`
            )
            .join('<br>')

    let actions = ''

    if (item.item_status === 'pending') {
        actions = `
            <div class="ticket-actions three-actions">
                <button
                    type="button"
                    class="print-btn"
                    data-act="print"
                    data-id="${esc(item.item_id)}"
                >
                    🖨️ พิมพ์
                </button>

                <button
                    type="button"
                    class="ack-btn"
                    data-act="start"
                    data-id="${esc(item.item_id)}"
                >
                    🍳 เริ่มทำ
                </button>

                <button
                    type="button"
                    class="cancel-btn"
                    data-act="cancel"
                    data-id="${esc(item.item_id)}"
                >
                    ยกเลิกรายการ
                </button>
            </div>
        `
    }

    if (item.item_status === 'preparing') {
        actions = `
            <div class="ticket-actions three-actions">
                <button
                    type="button"
                    class="print-btn"
                    data-act="print"
                    data-id="${esc(item.item_id)}"
                >
                    🖨️ พิมพ์ซ้ำ
                </button>

                <button
                    type="button"
                    class="ready-btn"
                    data-act="ready"
                    data-id="${esc(item.item_id)}"
                >
                    ✅ พร้อมเสิร์ฟ
                </button>

                <button
                    type="button"
                    class="cancel-btn"
                    data-act="cancel"
                    data-id="${esc(item.item_id)}"
                >
                    ยกเลิกรายการ
                </button>
            </div>
        `
    }

    if (item.item_status === 'ready') {
        actions = `
            <div class="ticket-actions single-action">
                <button
                    type="button"
                    class="served-btn"
                    data-act="served"
                    data-id="${esc(item.item_id)}"
                >
                    🍽️ เสิร์ฟแล้ว
                </button>
            </div>
        `
    }

    return `
        <article
            class="ticket-card status-${esc(item.item_status)}"
        >
            <div class="ticket-head">
                <div>
                    <h2>${esc(tableName(item))}</h2>

                    <div class="ticket-time">
                        ${formatTime(item.created_at)}
                    </div>

                    ${item.kitchen_station_name
                        ? `<div class="ticket-time">🍳 ${esc(item.kitchen_station_name)}</div>`
                        : ''
                    }
                </div>

                <span
                    class="status-badge ${esc(item.item_status)}"
                >
                    ${esc(statusText(item.item_status))}
                </span>
            </div>

            <div class="ticket-body">
                <div class="product-name">
                    ${esc(item.product_name)}
                </div>

                <div class="quantity">
                    × ${Number(item.quantity || 0).toLocaleString('th-TH')}
                </div>

                ${modifierHtml
            ? `
                            <div class="modifier-list">
                                ${modifierHtml}
                            </div>
                        `
            : ''
        }

                ${item.item_note
            ? `
                            <div class="note">
                                หมายเหตุ:
                                ${esc(item.item_note)}
                            </div>
                        `
            : ''
        }
            </div>

            ${actions}
        </article>
    `
}


/* ========================================
   PRINT
======================================== */

function renderPrintTicket(item) {
    const modifiers =
        Array.isArray(item.modifiers)
            ? item.modifiers
            : []

    const modifierHtml =
        modifiers
            .map(modifier => `
                <div>
                    ${esc(modifier.group_name || '')}:
                    <strong>
                        ${esc(modifier.option_name || '')}
                    </strong>
                </div>
            `)
            .join('')

    el.kitchenPrintArea.innerHTML = `
        <div class="print-ticket">
            <div class="print-center">
                <strong>JOKJUNG - ใบครัว</strong>
            </div>

            ${item.kitchen_station_name
                ? `<div class="print-center">${esc(item.kitchen_station_name)}</div>`
                : ''
            }

            <div class="print-table">
                ${esc(tableName(item))}
            </div>

            <div class="print-center">
                ${formatTime(item.created_at)}
            </div>

            <div class="print-line"></div>

            <div class="print-product">
                ${esc(item.product_name)}
            </div>

            <div class="print-qty">
                จำนวน:
                ${Number(item.quantity || 0).toLocaleString('th-TH')}
            </div>

            ${modifierHtml
            ? `
                        <div class="print-detail">
                            ${modifierHtml}
                        </div>
                    `
            : ''
        }

            ${item.item_note
            ? `
                        <div class="print-note">
                            หมายเหตุ:
                            ${esc(item.item_note)}
                        </div>
                    `
            : ''
        }

            <div class="print-line"></div>

            <div class="print-center">
                ${item.order_source === 'qr'
            ? 'QR ORDER'
            : 'POS ORDER'
        }
            </div>
        </div>
    `
}

async function markPrinted(itemId) {
    const {
        error
    } = await supabase.rpc(
        'mark_kitchen_item_printed',
        {
            p_item_id: itemId
        }
    )

    if (error) {
        console.error(
            'Mark printed error:',
            error
        )
    }
}

async function printKitchenItem(
    item,
    { auto = false } = {}
) {
    if (!item) return

    renderPrintTicket(item)

    await markPrinted(
        item.item_id
    )

    item.kitchen_printed_at =
        new Date().toISOString()

    setTimeout(
        () => window.print(),
        auto ? 150 : 50
    )
}


/* ========================================
   STATUS ACTIONS
======================================== */

async function callStatusRpc(
    rpcName,
    itemId
) {
    const {
        error
    } = await supabase.rpc(
        rpcName,
        {
            p_item_id: itemId
        }
    )

    if (error) throw error

    await loadKitchenItems({
        notifyNew: false
    })
}

async function startPreparing(itemId) {
    await callStatusRpc(
        'kitchen_start_preparing',
        itemId
    )
}

async function markReady(itemId) {
    await callStatusRpc(
        'kitchen_mark_ready',
        itemId
    )
}

async function markServed(itemId) {
    await callStatusRpc(
        'kitchen_mark_served',
        itemId
    )
}

async function cancelItem(itemId) {
    const confirmed =
        confirm(
            'ยกเลิกรายการอาหารนี้หรือไม่?'
        )

    if (!confirmed) return

    await callStatusRpc(
        'kitchen_cancel_item',
        itemId
    )
}


/* ========================================
   REALTIME
======================================== */

function clearRealtimeRetry() {

    if (state.realtimeRetryTimer) {

        clearTimeout(
            state.realtimeRetryTimer
        )

        state.realtimeRetryTimer =
            null
    }
}


function scheduleRealtimeRetry() {

    clearRealtimeRetry()

    state.realtimeRetryTimer =
        setTimeout(
            () => {

                console.warn(
                    'Retry kitchen realtime subscription...'
                )

                subscribeRealtime()

            },
            3000
        )
}


function startRealtimeFallbackPolling() {

    if (state.realtimePollTimer) {

        clearInterval(
            state.realtimePollTimer
        )
    }

    state.realtimePollTimer =
        setInterval(
            async () => {

                if (document.hidden) {
                    return
                }

                try {

                    await loadKitchenItems({
                        notifyNew: true
                    })

                } catch (error) {

                    console.warn(
                        'Kitchen fallback polling error:',
                        error
                    )
                }

            },
            5000
        )
}


function subscribeRealtime() {

    clearRealtimeRetry()

    if (state.realtimeChannel) {

        supabase.removeChannel(
            state.realtimeChannel
        )

        state.realtimeChannel =
            null
    }

    const channelName =
        `kitchen-${state.profile.branch_id}-${Date.now()}`

    console.log(
        'Subscribe kitchen realtime:',
        channelName
    )

    state.realtimeChannel =
        supabase
            .channel(
                channelName
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'restaurant_order_items'
                },
                async payload => {

                    console.log(
                        '[Kitchen Realtime] restaurant_order_items',
                        payload
                    )

                    try {

                        const notify =
                            payload.eventType ===
                            'INSERT'
                            &&
                            payload.new
                                ?.item_status ===
                                'pending'

                        await loadKitchenItems({
                            notifyNew:
                                notify
                        })

                    } catch (error) {

                        console.error(
                            'Realtime kitchen item reload error:',
                            error
                        )

                        msg(
                            el.pageMessage,
                            error.message
                            ||
                            'รับออเดอร์แบบเรียลไทม์ไม่สำเร็จ'
                        )
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'restaurant_orders'
                },
                async payload => {

                    console.log(
                        '[Kitchen Realtime] restaurant_orders',
                        payload
                    )

                    try {

                        await loadKitchenItems({
                            notifyNew:
                                false
                        })

                    } catch (error) {

                        console.error(
                            'Realtime restaurant order reload error:',
                            error
                        )
                    }
                }
            )
            .subscribe(
                status => {

                    console.log(
                        '[Kitchen Realtime Status]',
                        status
                    )

                    if (status === 'SUBSCRIBED') {

                        clearRealtimeRetry()

                        el.statusText.textContent =
                            '🟢 เชื่อมต่อครัวแบบเรียลไทม์แล้ว'

                        msg(
                            el.pageMessage,
                            ''
                        )

                        return
                    }

                    if (status === 'CHANNEL_ERROR') {

                        el.statusText.textContent =
                            '🔴 Realtime เชื่อมต่อผิดพลาด'

                        msg(
                            el.pageMessage,
                            'Realtime มีปัญหา ระบบกำลังเชื่อมต่อใหม่อัตโนมัติ'
                        )

                        scheduleRealtimeRetry()
                        return
                    }

                    if (status === 'TIMED_OUT') {

                        el.statusText.textContent =
                            '🟠 Realtime หมดเวลาการเชื่อมต่อ'

                        msg(
                            el.pageMessage,
                            'Realtime หมดเวลา ระบบกำลังเชื่อมต่อใหม่อัตโนมัติ'
                        )

                        scheduleRealtimeRetry()
                        return
                    }

                    if (status === 'CLOSED') {

                        el.statusText.textContent =
                            '🟠 Realtime ถูกตัดการเชื่อมต่อ'

                        scheduleRealtimeRetry()
                    }
                }
            )
}


/* ========================================
   INIT
======================================== */

async function init() {
    try {
        const session =
            await requireSession()

        if (!session) return

        await loadProfile(
            session.user.id
        )

        await loadBranch()

        await loadKitchenStations()

        await loadKitchenItems({
            notifyNew: false
        })

        subscribeRealtime()

        startRealtimeFallbackPolling()

    } catch (error) {
        console.error(
            'Kitchen init error:',
            error
        )

        msg(
            el.pageMessage,
            error.message
            || 'เปิดหน้าครัวไม่สำเร็จ'
        )
    }
}


/* ========================================
   EVENTS
======================================== */

el.stationSelect
    ?.addEventListener(
        'change',
        async event => {
            state.selectedStation = event.target.value || ''
            localStorage.setItem(stationStorageKey(), state.selectedStation)
            state.knownItemIds = new Set()
            renderSelectedStationText()

            try {
                await loadKitchenItems({ notifyNew: false })
                msg(el.pageMessage, '')
            } catch (error) {
                console.error('Change kitchen station error:', error)
                msg(el.pageMessage, error.message || 'เปลี่ยนครัวไม่สำเร็จ')
            }
        }
    )


el.enableSoundBtn
    ?.addEventListener(
        'click',
        () => {
            state.soundEnabled = true

            el.enableSoundBtn
                .classList
                .add('active')

            el.enableSoundBtn.textContent =
                '🔔 เสียงแจ้งเตือน: เปิดแล้ว'

            playAlertSound()
        }
    )

el.refreshBtn
    ?.addEventListener(
        'click',
        async () => {
            try {
                await loadKitchenItems({
                    notifyNew: false
                })

                msg(
                    el.pageMessage,
                    ''
                )
            } catch (error) {
                msg(
                    el.pageMessage,
                    error.message
                    || 'รีเฟรชไม่สำเร็จ'
                )
            }
        }
    )

el.backBtn
    ?.addEventListener(
        'click',
        () => {
            location.href =
                './dashboard.html'
        }
    )

document
    .querySelector('.kitchen-board')
    ?.addEventListener(
        'click',
        async event => {
            const button =
                event.target.closest(
                    '[data-act]'
                )

            if (!button) return

            const itemId =
                button.dataset.id

            const item =
                state.items.find(
                    row =>
                        row.item_id === itemId
                )

            if (!item) return

            button.disabled = true

            try {
                const action =
                    button.dataset.act

                if (action === 'print') {
                    await printKitchenItem(item)
                    return
                }

                if (action === 'start') {
                    await startPreparing(itemId)
                    return
                }

                if (action === 'ready') {
                    await markReady(itemId)
                    return
                }

                if (action === 'served') {
                    await markServed(itemId)
                    return
                }

                if (action === 'cancel') {
                    await cancelItem(itemId)
                }

            } catch (error) {
                console.error(
                    'Kitchen action error:',
                    error
                )

                msg(
                    el.pageMessage,
                    error.message
                    || 'ดำเนินการไม่สำเร็จ'
                )

            } finally {
                button.disabled = false
            }
        }
    )

document.addEventListener(
    'visibilitychange',
    async () => {

        if (document.hidden) {
            return
        }

        try {

            await loadKitchenItems({
                notifyNew: true
            })

            subscribeRealtime()

        } catch (error) {

            console.warn(
                'Kitchen visibility reconnect error:',
                error
            )
        }
    }
)


window.addEventListener(
    'beforeunload',
    () => {

        clearRealtimeRetry()

        if (state.realtimePollTimer) {

            clearInterval(
                state.realtimePollTimer
            )
        }

        if (state.realtimeChannel) {

            supabase.removeChannel(
                state.realtimeChannel
            )
        }
    }
)


init()
