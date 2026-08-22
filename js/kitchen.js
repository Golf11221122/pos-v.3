import { supabase } from './supabase.js'

/* PRINT QUEUE V2 READY - DB queue, no automatic browser print */

const state = {
    session: null,
    profile: null,
    branch: null,
    stations: [],
    selectedStation: '',
    items: [],
    soundEnabled: false,
    knownItemIds: new Set(),
    addOnItemIds: new Set(),
    realtimeChannel: null,
    timerInterval: null,
    realtimePollTimer: null,
    autoPrintIds: new Set(),
    autoPrintTimer: null
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


function itemIsAddOn(item) {
    if (!item) return false

    // ค่าหลักจาก RPC: ตรวจ history ของ order_id เดิม
    if (item.is_add_on === true) return true

    // รองรับกรณี Supabase/JSON คืนค่าเป็น string
    if (String(item.is_add_on).toLowerCase() === 'true') return true

    // fallback: ถ้ามีรายการก่อนหน้าของ order เดิมแล้ว
    if (Number(item.previous_item_count || 0) > 0) return true

    // fallback ฝั่ง browser สำหรับรายการที่เพิ่งเข้า realtime
    if (state?.addOnItemIds?.has?.(item.item_id)) return true

    return false
}

function statusText(
    status,
    item = null
) {

    const takeaway =
        item?.order_type ===
        'takeaway'

    // รายการ pending ของ order เดิมที่เคยมีรายการมาก่อน
    // ให้แสดงเป็น "สั่งเพิ่ม" แทน "ออเดอร์ใหม่"
    if (status === 'pending' && itemIsAddOn(item)) {
        return '🆕 สั่งเพิ่ม'
    }

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
                    5 * 60
            }


            else if (
                item.item_status ===
                'preparing'
            ) {

                limitSeconds =
                    15 * 60
            }


            else if (
                item.item_status ===
                'ready'
            ) {

                limitSeconds =
                    5 * 60
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



/* ========================================
   GROUP ORDER BY TABLE / QUEUE + STATUS
   โต๊ะ/คิวเดียวกันรวมกันเฉพาะรายการที่มีสถานะเดียวกัน
   จึงสามารถแสดงโต๊ะเดียวกันคนละคอลัมน์พร้อมกันได้
   การพิมพ์ยังใช้ระบบรวมตามโต๊ะ/คิว + ครัว
======================================== */

function kitchenGroupKey(item) {
    if (!item) return ''

    // ใช้ order_id เป็นตัวหลักเสมอ
    // ทำให้โต๊ะเดิมแต่คนละบิลไม่ถูกนำมารวมกัน
    // และรายการสั่งเพิ่มในบิลเดิมยังผูกกับออเดอร์เดิมได้แม่นยำ
    const orderId = String(item.order_id || '').trim()
    if (orderId) {
        return `order:${orderId}`
    }

    // fallback สำหรับข้อมูลเก่าที่ไม่มี order_id
    if (item.order_type === 'takeaway') {
        const queue = String(item.queue_no ?? '').trim()
        return queue
            ? `takeaway:${queue}`
            : `takeaway:item:${item.item_id}`
    }

    const table = String(
        item.table_name
        || item.table_no
        || ''
    ).trim()

    return table
        ? `dinein:${table}`
        : `dinein:item:${item.item_id}`
}

function groupKitchenItems(list) {
    const map = new Map()

    for (const item of list) {
        // สำคัญ: รวมตามโต๊ะ/คิว "และสถานะ"
        // โต๊ะเดียวกันจึงสามารถมีรายการอยู่คนละคอลัมน์พร้อมกันได้
        // เช่น บะหมี่กำลังทำ แต่ข้าวที่สั่งเพิ่มยังอยู่ออเดอร์ใหม่
        const baseKey = kitchenGroupKey(item)
        const status = item.item_status || 'pending'
        const key = `${baseKey}|status:${status}`

        if (!map.has(key)) {
            map.set(key, {
                key,
                baseKey,
                status,
                items: []
            })
        }

        map.get(key).items.push(item)
    }

    const groups = [...map.values()]

    for (const group of groups) {
        group.items.sort((a, b) =>
            new Date(a.created_at).getTime()
            - new Date(b.created_at).getTime()
        )

        group.firstItem = group.items[0]

        // สถานะการ์ดมาจากรายการในกลุ่มนี้โดยตรง
        // ไม่ดึงสถานะของเมนูอื่นในโต๊ะเดียวกันมาบังคับทั้งบิล
        group.status = group.firstItem?.item_status || group.status || 'pending'
    }

    return groups.sort((a, b) =>
        new Date(a.firstItem?.created_at).getTime()
        - new Date(b.firstItem?.created_at).getTime()
    )
}

function isLikelyAddOn(item, groupItems) {
    // ใช้ helper เดียวกับข้อความสถานะ เพื่อให้ป้ายและสถานะตรงกันเสมอ
    if (itemIsAddOn(item)) {
        return true
    }

    if (!Array.isArray(groupItems) || groupItems.length <= 1) {
        return false
    }

    const times = groupItems
        .map(row => new Date(row.created_at).getTime())
        .filter(Number.isFinite)

    const itemTime = new Date(item.created_at).getTime()

    if (!Number.isFinite(itemTime) || !times.length) {
        return false
    }

    const firstTime = Math.min(...times)

    return itemTime - firstTime > 15 * 1000
}

function renderItemActions(item) {
    if (item.item_status === 'pending') {
        return `
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
        return `
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
                        : '✅ พร้อมเสิร์ฟ'}
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
        return `
            <div class="ticket-actions single-action">
                <button
                    type="button"
                    class="served-btn"
                    data-act="served"
                    data-id="${esc(item.item_id)}"
                >
                    ${item.order_type === 'takeaway'
                        ? '🛍️ รับแล้ว'
                        : '🍽️ เสิร์ฟแล้ว'}
                </button>
            </div>
        `
    }

    return ''
}

function renderGroupedItem(item, groupItems) {
    const modifiers =
        Array.isArray(item.modifiers)
            ? item.modifiers
            : []

    const modifierHtml = renderModifierBadges(modifiers)
    const timer = timerInfo(item)
    const addOn = isLikelyAddOn(item, groupItems)

    return `
        <section class="group-ticket-item status-${esc(item.item_status)}">
            <div class="group-item-head">
                <div class="group-item-title-row">
                    <div class="product-name">
                        ${esc(item.product_name)}
                    </div>

                    <div class="quantity">
                        × ${Number(item.quantity || 0).toLocaleString('th-TH')}
                    </div>
                </div>

                <div class="group-item-badges">
                    <span class="status-badge ${esc(item.item_status)} ${addOn ? 'addon-status-badge' : ''}">
                        ${esc(statusText(item.item_status, item))}
                    </span>
                </div>
            </div>

            <div class="group-item-meta">
                <span>${formatTime(item.created_at)}</span>
                <span
                    class="ticket-time"
                    data-kitchen-timer="${esc(item.item_id)}"
                >
                    ${esc(`${timer.label} ${elapsedText(timer.startedAt)}`)}
                </span>
            </div>

            ${modifierHtml}

            ${item.item_note
                ? `
                    <div class="note">
                        ⚠️ ${esc(item.item_note)}
                    </div>
                `
                : ''}

            ${renderItemActions(item)}
        </section>
    `
}

function renderGroupTicket(group) {
    const firstItem = group.firstItem || group.items[0]
    const stationNames = [
        ...new Set(
            group.items
                .map(item => item.kitchen_station_name)
                .filter(Boolean)
        )
    ]

    return `
        <article class="ticket-card grouped-ticket status-${esc(group.status)}">
            <div class="ticket-head grouped-ticket-head">
                <div>
                    <h2>${esc(orderName(firstItem))}</h2>

                    <div class="ticket-time">
                        เริ่ม ${formatTime(firstItem.created_at)}
                    </div>

                    ${stationNames.length
                        ? `<div class="ticket-time">🍳 ${esc(stationNames.join(' • '))}</div>`
                        : ''}
                </div>

                <div class="group-summary">
                    <span class="group-count">
                        ${group.items.length.toLocaleString('th-TH')} รายการ
                    </span>

                    <span class="status-badge ${esc(group.status)}">
                        ${esc(statusText(group.status, firstItem))}
                    </span>
                </div>
            </div>

            <div class="ticket-body grouped-ticket-body">
                ${group.items
                    .map(item => renderGroupedItem(item, group.items))
                    .join('')}
            </div>
        </article>
    `
}

function ensureKitchenGroupStyle() {
    if (document.getElementById('kitchenGroupStyle')) return

    const style = document.createElement('style')
    style.id = 'kitchenGroupStyle'
    style.textContent = `
        .grouped-ticket-head {
            align-items: flex-start;
        }

        .group-summary {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
        }

        .group-count {
            padding: 5px 9px;
            border-radius: 999px;
            background: #f1f3f4;
            color: #5f6368;
            font-size: 11px;
            font-weight: 900;
        }

        .grouped-ticket-body {
            padding: 0;
        }

        .group-ticket-item {
            padding: 14px 13px;
            border-bottom: 2px dashed #e1e4e8;
        }

        .group-ticket-item:last-child {
            border-bottom: 0;
        }

        .group-ticket-item.status-pending {
            background: #fffdf7;
        }

        .group-ticket-item.status-preparing {
            background: #f8fbff;
        }

        .group-ticket-item.status-ready {
            background: #f8fff9;
        }

        .group-item-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
        }

        .group-item-title-row {
            min-width: 0;
            flex: 1 1 auto;
        }

        .group-item-title-row .quantity {
            margin-top: 7px;
        }

        .group-item-badges {
            display: flex;
            flex: 0 0 auto;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
        }

        .status-badge.addon-status-badge {
            border: 2px solid #f5b400;
            background: #fff4c7;
            color: #7a5600;
            font-weight: 900;
        }

        .addon-badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 10px;
            border: 2px solid #f5b400;
            border-radius: 999px;
            background: #fff4c7;
            color: #7a5600;
            font-size: 12px;
            font-weight: 900;
            white-space: nowrap;
        }

        .group-item-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 9px;
            color: #70757a;
            font-size: 11px;
        }

        .group-ticket-item .ticket-time {
            display: inline-flex;
            width: fit-content;
        }

        .group-ticket-item .ticket-actions {
            padding: 12px 0 0;
        }

        @media (max-width: 720px) {
            .group-item-head {
                gap: 8px;
            }

            .group-item-badges {
                gap: 5px;
            }

            .addon-badge {
                font-size: 11px;
                padding: 5px 8px;
            }
        }
    `

    document.head.appendChild(style)
}

async function enrichOrderAddOnFlags(list) {
    if (!Array.isArray(list) || !list.length) {
        return list || []
    }

    /*
     * FIX:
     * is_add_on มาจาก get_kitchen_display_context() ที่คำนวณจาก
     * history ของ order_id ทั้งหมดในฐานข้อมูล รวม served แล้ว
     *
     * จึงไม่ query restaurant_order_items ซ้ำจาก Browser อีก
     * และไม่เสีย flag เมื่อรายการเก่าหายออกจาก active board
     */
    return list.map(item => ({
        ...item,
        is_add_on:
            item.is_add_on === true
            || item.is_add_on === 'true'
    }))
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


    const contextList =
        await enrichKitchenContext(
            rawList
        )

    // เติม flag สั่งเพิ่มจากประวัติของ order เดิม
    // จึงยังรู้ว่าเป็นสั่งเพิ่ม แม้รายการเก่าจะ served และหายจาก active board แล้ว
    const list =
        await enrichOrderAddOnFlags(
            contextList
        )


    const newPending =
        list.filter(item =>
            item.item_status === 'pending'
            && !state.knownItemIds.has(item.item_id)
        )

    // เก็บ add-on flag ของรายการ active ไว้สำหรับ render/realtime fallback
    const existingGroupKeys = new Set(
        state.items.map(kitchenGroupKey)
    )

    for (const item of newPending) {
        if (
            item.is_add_on === true
            || existingGroupKeys.has(kitchenGroupKey(item))
        ) {
            state.addOnItemIds.add(item.item_id)
        }
    }

    // รายการที่โหลดมาพร้อม flag จาก history ให้ลง set ด้วย
    for (const item of list) {
        if (item.is_add_on === true) {
            state.addOnItemIds.add(item.item_id)
        }
    }

    // ล้าง id ที่ไม่อยู่บนบอร์ดแล้ว ป้องกัน set โตขึ้นเรื่อย ๆ
    const activeIds = new Set(list.map(item => item.item_id))
    state.addOnItemIds = new Set(
        [...state.addOnItemIds].filter(id => activeIds.has(id))
    )

    state.items = list

    for (const item of list) {
        state.knownItemIds.add(item.item_id)
    }

    renderBoard()

    if (notifyNew && newPending.length > 0) {
        playAlertSound()

        /*
         * PRINT QUEUE V2
         * -----------------------------
         * ไม่สั่ง window.print() อัตโนมัติจากหน้าครัวแล้ว
         *
         * restaurant_order_items INSERT
         * จะถูก Trigger ใน Supabase สร้าง kitchen_print_jobs ให้อัตโนมัติ
         *
         * - มี Printer Mapping แล้ว  -> status = pending
         * - ยังไม่มี Printer          -> status = waiting_printer
         *
         * ปุ่ม "พิมพ์" บนการ์ดยังใช้ Browser Print แบบ manual
         * สำหรับดูตัวอย่าง/ทดสอบใบครัวได้ตามเดิม
         */
    }
}

function setCount(target, value) {
    if (target) {
        target.textContent =
            Number(value).toLocaleString('th-TH')
    }
}

function renderBoard() {
    const pendingItems =
        state.items.filter(
            item => item.item_status === 'pending'
        )

    const preparingItems =
        state.items.filter(
            item => item.item_status === 'preparing'
        )

    const readyItems =
        state.items.filter(
            item => item.item_status === 'ready'
        )

    // ตัวเลขสรุปยังนับเป็น "จำนวนรายการอาหาร" ไม่ใช่จำนวนโต๊ะ
    setCount(el.pendingCount, pendingItems.length)
    setCount(el.preparingCount, preparingItems.length)
    setCount(el.readyCount, readyItems.length)

    setCount(el.pendingBadge, pendingItems.length)
    setCount(el.preparingBadge, preparingItems.length)
    setCount(el.readyBadge, readyItems.length)

    const groups = groupKitchenItems(state.items)

    const pendingGroups = groups.filter(group => group.status === 'pending')
    const preparingGroups = groups.filter(group => group.status === 'preparing')
    const readyGroups = groups.filter(group => group.status === 'ready')

    const selectedStation = state.stations.find(
        station => station.id === state.selectedStation
    )
    const stationName = selectedStation?.name || 'ทุกครัว'

    el.statusText.textContent =
        state.items.length
            ? `${stationName} • ${groups.length.toLocaleString('th-TH')} โต๊ะ/คิว • ${state.items.length.toLocaleString('th-TH')} รายการ`
            : `${stationName} • รอออเดอร์ใหม่...`

    renderColumn(
        el.pendingGrid,
        el.pendingEmpty,
        pendingGroups
    )

    renderColumn(
        el.preparingGrid,
        el.preparingEmpty,
        preparingGroups
    )

    renderColumn(
        el.readyGrid,
        el.readyEmpty,
        readyGroups
    )

    refreshLiveTimers()
}

function renderColumn(grid, empty, groups) {
    if (!grid || !empty) return

    empty.classList.toggle(
        'hidden',
        groups.length > 0
    )

    grid.classList.toggle(
        'hidden',
        groups.length === 0
    )

    grid.innerHTML =
        groups.map(renderGroupTicket).join('')
}


/* ========================================
   PRINT
======================================== */

function printStationKey(item) {
    const stationId = String(
        item?.kitchen_station_id
        || item?.station_id
        || ''
    ).trim()

    if (stationId) return `id:${stationId}`

    const stationName = String(
        item?.kitchen_station_name
        || 'ไม่ระบุครัว'
    ).trim()

    return `name:${stationName}`
}

function printGroupKey(item) {
    // 1 ใบ = 1 โต๊ะ/คิว + 1 ครัว
    // รายการที่เข้ามาในรอบใหม่จะถูก queue แยกจากของเดิมอยู่แล้ว
    return `${kitchenGroupKey(item)}|${printStationKey(item)}`
}

function groupItemsForKitchenPrint(items) {
    const map = new Map()

    for (const item of items || []) {
        if (!item) continue

        const key = printGroupKey(item)

        if (!map.has(key)) {
            map.set(key, [])
        }

        map.get(key).push(item)
    }

    return [...map.values()]
        .map(group => group.sort((a, b) =>
            new Date(a.created_at).getTime()
            - new Date(b.created_at).getTime()
        ))
        .sort((a, b) =>
            new Date(a[0]?.created_at).getTime()
            - new Date(b[0]?.created_at).getTime()
        )
}

function renderPrintModifierRows(item) {
    const modifiers =
        Array.isArray(item.modifiers)
            ? item.modifiers
            : []

    return modifiers
        .map(modifier => {
            const group = String(
                modifier.group_name || ''
            ).trim()

            const option = String(
                modifier.option_name || ''
            ).trim()

            if (!option) return ''

            return `
                <div class="print-modifier-row">
                    <span>${group ? esc(group) : 'ตัวเลือก'}</span>
                    <strong class="print-modifier-value">
                        ${modifierIcon(modifier)} ${esc(option)}
                    </strong>
                </div>
            `
        })
        .join('')
}

function renderPrintGroupTicket(items, index, total) {
    const firstItem = items[0]
    if (!firstItem) return ''

    const stationName =
        firstItem.kitchen_station_name
        || 'ไม่ระบุครัว'

    const isAddOnRound = items.some(item =>
        state.addOnItemIds.has(item.item_id)
    )

    const itemHtml = items
        .map(item => {
            const modifierHtml = renderPrintModifierRows(item)

            return `
                <div class="print-divider"></div>

                <div class="print-item-row">
                    <div class="print-product">
                        ${esc(item.product_name)}
                    </div>
                    <div class="print-qty-big">
                        ×${Number(item.quantity || 0).toLocaleString('th-TH')}
                    </div>
                </div>

                ${modifierHtml
                    ? `<div class="print-options">${modifierHtml}</div>`
                    : ''}

                ${item.item_note
                    ? `
                        <div class="print-note">
                            ⚠️ หมายเหตุ: ${esc(item.item_note)}
                        </div>
                    `
                    : ''}
            `
        })
        .join('')

    return `
        <div
            class="print-ticket"
            style="${index < total - 1
                ? 'page-break-after:always;break-after:page;margin-bottom:3mm!important;'
                : ''}"
        >
            <div class="print-brand">JOKJUNG</div>
            <div class="print-kitchen-title">ใบครัว</div>
            <div class="print-station">🍳 ${esc(stationName)}</div>

            <div class="print-order-box">
                <div class="print-order-name">
                    ${esc(orderName(firstItem))}
                </div>
                <div class="print-order-time">
                    ${formatTime(firstItem.created_at)}
                </div>
                ${isAddOnRound
                    ? '<div class="print-wait-time">🆕 รายการสั่งเพิ่ม</div>'
                    : ''}
            </div>

            ${itemHtml}

            <div class="print-divider"></div>
            <div class="print-footer">
                ${firstItem.order_source === 'qr'
                    ? 'QR ORDER'
                    : 'POS ORDER'}
                • ${items.length.toLocaleString('th-TH')} รายการ
            </div>
        </div>
    `
}

function renderPrintGroups(groups) {
    const safeGroups = (groups || []).filter(group => group?.length)

    el.kitchenPrintArea.innerHTML = safeGroups
        .map((group, index) =>
            renderPrintGroupTicket(
                group,
                index,
                safeGroups.length
            )
        )
        .join('')
}

async function markPrinted(itemId) {
    const { error } = await supabase.rpc(
        'mark_kitchen_item_printed',
        { p_item_id: itemId }
    )

    if (error) {
        console.error('Mark printed error:', error)
    }
}

async function printKitchenGroups(
    groups,
    { auto = false } = {}
) {
    const safeGroups = (groups || []).filter(group => group?.length)
    if (!safeGroups.length) return

    renderPrintGroups(safeGroups)

    const printedItems = safeGroups.flat()

    for (const item of printedItems) {
        await markPrinted(item.item_id)
        item.kitchen_printed_at = new Date().toISOString()
    }

    setTimeout(
        () => window.print(),
        auto ? 150 : 50
    )
}

async function printKitchenItem(
    item,
    { auto = false } = {}
) {
    if (!item) return

    await printKitchenGroups(
        [[item]],
        { auto }
    )
}

function queueAutoKitchenPrint(items) {
    for (const item of items || []) {
        if (item?.item_id && !item.kitchen_printed_at) {
            state.autoPrintIds.add(item.item_id)
        }
    }

    if (!state.autoPrintIds.size) return

    if (state.autoPrintTimer) {
        clearTimeout(state.autoPrintTimer)
    }

    // หน่วงสั้น ๆ เพื่อรวมหลาย INSERT ในบิลเดียวกัน
    // ไม่ให้ Realtime สั่งพิมพ์ทีละเมนู
    state.autoPrintTimer = setTimeout(
        async () => {
            state.autoPrintTimer = null

            const ids = new Set(state.autoPrintIds)
            state.autoPrintIds.clear()

            const candidates = state.items.filter(item =>
                ids.has(item.item_id)
                && !item.kitchen_printed_at
            )

            if (!candidates.length) return

            const groups = groupItemsForKitchenPrint(candidates)

            try {
                await printKitchenGroups(
                    groups,
                    { auto: true }
                )
            } catch (error) {
                // ถ้าพิมพ์ไม่สำเร็จ คืนรายการเข้าคิวเพื่อไม่ให้หาย
                for (const item of candidates) {
                    if (!item.kitchen_printed_at) {
                        state.autoPrintIds.add(item.item_id)
                    }
                }

                console.error(
                    'Grouped kitchen auto print error:',
                    error
                )
            }
        },
        900
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

async function init() {
    try {
        ensureKitchenModifierStyle()
        ensureKitchenGroupStyle()

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

        if (state.autoPrintTimer) {
            clearTimeout(
                state.autoPrintTimer
            )
        }
    }
)

init()
