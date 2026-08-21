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
    timerInterval: null,
    realtimePollTimer: null
}

const $ = id => document.getElementById(id)

// เวลามาตรฐานครัว (วินาที)
// ปรับตัวเลขตรงนี้ได้ภายหลัง
const KITCHEN_TIME_LIMITS = {
    pending: 5 * 60,      // รอรับออเดอร์เกิน 5 นาที = แดง
    preparing: 15 * 60,  // กำลังทำเกิน 15 นาที = แดง
    ready: 5 * 60        // พร้อมเสิร์ฟเกิน 5 นาที = แดง
}

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

function padQueue(value) {
    const queueNo =
        Number(value || 0)

    if (!Number.isFinite(queueNo) || queueNo <= 0) {
        return '-'
    }

    return String(
        Math.trunc(queueNo)
    ).padStart(3, '0')
}


function orderName(item) {

    if (
        item.order_type ===
        'takeaway'
    ) {

        return item.queue_no
            ? `กลับบ้าน • คิว ${padQueue(item.queue_no)}`
            : 'กลับบ้าน'
    }


    return item.table_name
        || (
            item.table_no
                ? `โต๊ะ ${item.table_no}`
                : 'ไม่ระบุโต๊ะ'
        )
}


function statusText(
    status,
    item = null
) {

    const takeaway =
        item?.order_type ===
        'takeaway'

    return {
        pending:
            'ออเดอร์ใหม่',

        preparing:
            'กำลังทำ',

        ready:
            takeaway
                ? 'พร้อมรับ'
                : 'พร้อมเสิร์ฟ'

    }[status] || status
}


function elapsedText(
    startedAt
) {

    if (!startedAt) {
        return '00:00'
    }


    const start =
        new Date(
            startedAt
        )
            .getTime()


    if (!Number.isFinite(start)) {
        return '00:00'
    }


    const totalSeconds =
        Math.max(
            0,
            Math.floor(
                (
                    Date.now()
                    -
                    start
                )
                /
                1000
            )
        )


    const hours =
        Math.floor(
            totalSeconds
            /
            3600
        )


    const minutes =
        Math.floor(
            (
                totalSeconds
                %
                3600
            )
            /
            60
        )


    const seconds =
        totalSeconds
        %
        60


    if (hours > 0) {

        return [
            hours,
            String(minutes)
                .padStart(2, '0'),
            String(seconds)
                .padStart(2, '0')
        ].join(':')
    }


    return [
        String(minutes)
            .padStart(2, '0'),
        String(seconds)
            .padStart(2, '0')
    ].join(':')
}


function timerInfo(item) {

    if (
        item.item_status ===
        'preparing'
    ) {

        return {
            label:
                'กำลังทำ',

            startedAt:
                item.kitchen_started_at
                ||
                item.created_at
        }
    }


    if (
        item.item_status ===
        'ready'
    ) {

        return {
            label:
                item.order_type ===
                'takeaway'
                    ? 'พร้อมรับแล้ว'
                    : 'พร้อมเสิร์ฟแล้ว',

            startedAt:
                item.kitchen_ready_at
                ||
                item.created_at
        }
    }


    return {
        label:
            'รอมาแล้ว',

        startedAt:
            item.created_at
    }
}


function refreshLiveTimers() {

    document
        .querySelectorAll(
            '[data-kitchen-timer]'
        )
        .forEach(node => {

            const item =
                state.items.find(
                    row =>
                        row.item_id ===
                        node.dataset.kitchenTimer
                )

            if (!item) {
                return
            }


            const timer =
                timerInfo(item)


            const startTime =
                new Date(
                    timer.startedAt
                ).getTime()


            const elapsedSeconds =
                Number.isFinite(startTime)
                    ? Math.max(
                        0,
                        Math.floor(
                            (
                                Date.now()
                                -
                                startTime
                            )
                            /
                            1000
                        )
                    )
                    : 0


            let limitSeconds = 0


            if (
                item.item_status ===
                'pending'
            ) {

                limitSeconds =
                    KITCHEN_TIME_LIMITS.pending
            }


            else if (
                item.item_status ===
                'preparing'
            ) {

                limitSeconds =
                    KITCHEN_TIME_LIMITS.preparing
            }


            else if (
                item.item_status ===
                'ready'
            ) {

                limitSeconds =
                    KITCHEN_TIME_LIMITS.ready
            }


            node.textContent =
                `${timer.label} ${elapsedText(timer.startedAt)}`


            const overdue =
                limitSeconds > 0
                &&
                elapsedSeconds >
                    limitSeconds


            node.classList.toggle(
                'timer-overdue',
                overdue
            )

        })
}

function startLiveTimers() {

    if (state.timerInterval) {
        clearInterval(
            state.timerInterval
        )
    }

    refreshLiveTimers()

    state.timerInterval =
        setInterval(
            refreshLiveTimers,
            1000
        )
}


/* ========================================
   MODIFIER HIGHLIGHT
======================================== */

function modifierIcon(modifier) {
    const group =
        String(
            modifier?.group_name
            ||
            ''
        ).toLowerCase()

    if (
        group.includes('เผ็ด')
        ||
        group.includes('พริก')
    ) {
        return '🌶️'
    }

    if (
        group.includes('ขนาด')
        ||
        group.includes('ธรรมดา')
        ||
        group.includes('พิเศษ')
    ) {
        return '🍜'
    }

    if (
        group.includes('เส้น')
    ) {
        return '🍜'
    }

    if (
        group.includes('เพิ่ม')
        ||
        group.includes('ท็อป')
    ) {
        return '➕'
    }

    return '•'
}

function modifierIsImportant(modifier) {
    const option =
        String(
            modifier?.option_name
            ||
            ''
        ).toLowerCase()

    return [
        'พิเศษ',
        'เผ็ดมาก',
        'ไม่ใส่',
        'งด',
        'เพิ่ม',
        'ไม่เอา'
    ].some(
        keyword =>
            option.includes(
                keyword
            )
    )
}

function renderModifierBadges(modifiers) {
    if (
        !Array.isArray(modifiers)
        ||
        !modifiers.length
    ) {
        return ''
    }

    return `
        <div class="modifier-badges">
            ${modifiers.map(modifier => {
                const option =
                    String(
                        modifier.option_name
                        ||
                        ''
                    ).trim()

                if (!option) {
                    return ''
                }

                const important =
                    modifierIsImportant(
                        modifier
                    )

                return `
                    <div
                        class="modifier-badge ${
                            important
                                ? 'modifier-important'
                                : ''
                        }"
                    >
                        <span class="modifier-badge-icon">
                            ${modifierIcon(modifier)}
                        </span>

                        <strong>
                            ${esc(option)}
                        </strong>
                    </div>
                `
            }).join('')}
        </div>
    `
}

function ensureKitchenModifierStyle() {
    if (
        document.getElementById(
            'kitchenModifierHighlightStyle'
        )
    ) {
        return
    }

    const style =
        document.createElement(
            'style'
        )

    style.id =
        'kitchenModifierHighlightStyle'

    style.textContent = `
        .modifier-badges {
            display: grid;
            gap: 8px;
            margin-top: 14px;
        }

        .modifier-badge {
            display: flex;
            min-height: 48px;
            align-items: center;
            gap: 10px;
            padding: 9px 12px;
            border: 2px solid #e1e5ea;
            border-radius: 12px;
            background: #f7f8fa;
            color: #202124;
            line-height: 1.25;
        }

        .modifier-badge-icon {
            flex: 0 0 auto;
            font-size: 21px;
        }

        .modifier-badge strong {
            font-size: 18px;
            font-weight: 900;
        }

        .modifier-badge.modifier-important {
            border-color: #f4b400;
            background: #fff4c7;
        }

        .modifier-badge.modifier-important strong {
            font-size: 20px;
        }

        .ticket-body .note {
            margin-top: 12px;
            padding: 10px 12px;
            border: 2px solid #d93025;
            border-radius: 10px;
            background: #fff0ef;
            color: #b3261e;
            font-size: 17px;
            font-weight: 900;
            line-height: 1.35;
        }

        @media (max-width: 760px) {
            .modifier-badge {
                min-height: 54px;
                padding: 11px 13px;
            }

            .modifier-badge strong {
                font-size: 19px;
            }

            .modifier-badge.modifier-important strong {
                font-size: 21px;
            }

            .modifier-badge-icon {
                font-size: 23px;
            }
        }
    `

    document.head.appendChild(
        style
    )
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

async function enrichKitchenContext(
    list
) {

    if (!list.length) {
        return list
    }


    const itemIds =
        [
            ...new Set(
                list
                    .map(
                        item =>
                            item.item_id
                    )
                    .filter(Boolean)
            )
        ]


    if (!itemIds.length) {
        return list
    }


    const {
        data,
        error
    } =
        await supabase.rpc(
            'get_kitchen_display_context',
            {
                p_item_ids:
                    itemIds
            }
        )


    if (error) {
        throw error
    }


    const contextRows =
        Array.isArray(data)
            ? data
            : []


    const contextMap =
        new Map(
            contextRows.map(
                row => [
                    row.item_id,
                    row
                ]
            )
        )


    return list.map(
        item => ({
            ...item,
            ...(
                contextMap.get(
                    item.item_id
                )
                ||
                {}
            )
        })
    )
}


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

    const rawList =
        Array.isArray(data)
            ? data
            : []


    const list =
        await enrichKitchenContext(
            rawList
        )


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


    refreshLiveTimers()
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
        renderModifierBadges(
            modifiers
        )

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
                    ${item.order_type === 'takeaway'
                ? '✅ พร้อมรับ'
                : '✅ พร้อมเสิร์ฟ'
            }
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
                    ${item.order_type === 'takeaway'
                ? '🛍️ รับแล้ว'
                : '🍽️ เสิร์ฟแล้ว'
            }
                </button>
            </div>
        `
    }

    const timer = timerInfo(item)

    return `
        <article
            class="ticket-card status-${esc(item.item_status)}"
        >
            <div class="ticket-head">
                <div>
                    <h2>${esc(orderName(item))}</h2>

                    <div class="ticket-time">
                        ${formatTime(item.created_at)}
                    </div>

                    <div
                        class="kitchen-live-timer"
                        data-kitchen-timer="${esc(item.item_id)}"
                    >
                        ${esc(
        `${timer.label} ${elapsedText(timer.startedAt)}`
    )}
                    </div>

                    ${item.kitchen_station_name
            ? `<div class="ticket-time">🍳 ${esc(item.kitchen_station_name)}</div>`
            : ''
        }
                </div>

                <span
                    class="status-badge ${esc(item.item_status)}"
                >
                    ${esc(statusText(item.item_status, item))}
                </span>
            </div>

            <div class="ticket-body">
                <div class="product-name">
                    ${esc(item.product_name)}
                </div>

                <div class="quantity">
                    × ${Number(item.quantity || 0).toLocaleString('th-TH')}
                </div>

                ${modifierHtml}

                ${item.item_note
            ? `
                            <div class="note">
                                ⚠️ ${esc(item.item_note)}
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
            .map(modifier => {
                const group =
                    String(
                        modifier.group_name
                        ||
                        ''
                    ).trim()

                const option =
                    String(
                        modifier.option_name
                        ||
                        ''
                    ).trim()

                if (!option) {
                    return ''
                }

                return `
                    <div
                        style="
                            font-size:17px;
                            font-weight:800;
                            margin:5px 0;
                        "
                    >
                        ${modifierIcon(modifier)}
                        ${group ? `${esc(group)}: ` : ''}
                        <strong>
                            ${esc(option)}
                        </strong>
                    </div>
                `
            })
            .join('')

    const timer =
        timerInfo(item)

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
                ${esc(orderName(item))}
            </div>

            <div class="print-center">
                ${formatTime(item.created_at)}
            </div>

            <div class="print-center">
                ${esc(
            `${timer.label} ${elapsedText(timer.startedAt)}`
        )}
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
                        <div
                            class="print-note"
                            style="
                                font-size:18px;
                                font-weight:900;
                            "
                        >
                            ⚠️ หมายเหตุ:
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

function startRealtimeFallbackPolling() {

    if (
        state.realtimePollTimer
    ) {

        clearInterval(
            state.realtimePollTimer
        )
    }


    state.realtimePollTimer =
        setInterval(
            async () => {

                if (
                    document.hidden
                ) {
                    return
                }


                try {

                    await loadKitchenItems({
                        notifyNew:
                            true
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
    if (state.realtimeChannel) {
        supabase.removeChannel(
            state.realtimeChannel
        )
    }

    state.realtimeChannel =
        supabase
            .channel(
                `kitchen-${state.profile.branch_id}`
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'restaurant_order_items'
                },
                async payload => {
                    try {
                        const notify =
                            payload.eventType === 'INSERT'
                            && payload.new?.item_status === 'pending'

                        await loadKitchenItems({
                            notifyNew: notify
                        })
                    } catch (error) {
                        console.error(
                            'Realtime kitchen reload error:',
                            error
                        )
                    }
                }
            )
            .subscribe(status => {
                if (status === 'SUBSCRIBED') {
                    el.statusText.textContent =
                        'เชื่อมต่อครัวแบบเรียลไทม์แล้ว'
                }
            })
}


/* ========================================
   INIT
======================================== */


function installKitchenTimerStyle() {
    if (
        document.getElementById(
            'jokjungKitchenTimerStyle'
        )
    ) {
        return
    }

    const style =
        document.createElement(
            'style'
        )

    style.id =
        'jokjungKitchenTimerStyle'

    style.textContent = `
        /* JOKJUNG_KITCHEN_TIMER_STYLE_V1 */

        .kitchen-live-timer {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;

            width: fit-content !important;
            min-width: 165px !important;

            margin-top: 10px !important;
            padding: 8px 12px !important;

            border: 2px solid #d7d9dd !important;
            border-radius: 12px !important;

            background: #ffffff !important;
            color: #30343b !important;

            font-size: 22px !important;
            font-weight: 900 !important;
            line-height: 1.15 !important;

            font-variant-numeric:
                tabular-nums !important;
        }

        .kitchen-live-timer.timer-overdue {
            border-color: #d93025 !important;
            background: #ffffff !important;
            color: #d93025 !important;

            font-size: 25px !important;
            font-weight: 900 !important;

            box-shadow:
                0 0 0 2px
                rgba(217, 48, 37, .08) !important;
        }

        @media (max-width: 760px) {
            .kitchen-live-timer {
                min-width: 150px !important;
                font-size: 20px !important;
            }

            .kitchen-live-timer.timer-overdue {
                font-size: 23px !important;
            }
        }
    `

    document.head.appendChild(
        style
    )
}

async function init() {
    installKitchenTimerStyle()

    try {
        ensureKitchenModifierStyle()

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

        startLiveTimers()

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

window.addEventListener(
    'beforeunload',
    () => {
        if (state.realtimeChannel) {
            supabase.removeChannel(
                state.realtimeChannel
            )
        }

        if (state.timerInterval) {
            clearInterval(
                state.timerInterval
            )
        }

        if (state.realtimePollTimer) {
            clearInterval(
                state.realtimePollTimer
            )
        }
    }
)

init()
