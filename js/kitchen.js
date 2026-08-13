import { supabase } from './supabase.js'


/* ========================================
   STATE
======================================== */

const state = {

    session: null,

    profile: null,

    branch: null,

    items: [],

    soundEnabled: false,

    knownItemIds: new Set(),

    realtimeChannel: null
}


/* ========================================
   ELEMENTS
======================================== */

const $ = id =>
    document.getElementById(id)


const el = {

    branchText:
        $('branchText'),

    enableSoundBtn:
        $('enableSoundBtn'),

    refreshBtn:
        $('refreshBtn'),

    backBtn:
        $('backBtn'),

    pendingCount:
        $('pendingCount'),

    statusText:
        $('statusText'),

    emptyState:
        $('emptyState'),

    ticketGrid:
        $('ticketGrid'),

    pageMessage:
        $('pageMessage'),

    kitchenPrintArea:
        $('kitchenPrintArea')
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


function formatTime(
    value
) {

    try {

        return new Intl.DateTimeFormat(
            'th-TH',
            {
                hour:
                    '2-digit',

                minute:
                    '2-digit',

                second:
                    '2-digit'
            }
        ).format(
            new Date(value)
        )

    } catch {

        return '-'
    }
}


/* ========================================
   SOUND
======================================== */

function playAlertSound() {

    if (
        !state.soundEnabled
    ) {
        return
    }


    try {

        const AudioContext =
            window.AudioContext
            ||
            window.webkitAudioContext


        if (!AudioContext) {
            return
        }


        const ctx =
            new AudioContext()


        const playTone = (
            frequency,
            start,
            duration
        ) => {

            const oscillator =
                ctx.createOscillator()

            const gain =
                ctx.createGain()


            oscillator.frequency.value =
                frequency


            oscillator.type =
                'sine'


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


            oscillator.connect(
                gain
            )


            gain.connect(
                ctx.destination
            )


            oscillator.start(
                ctx.currentTime + start
            )


            oscillator.stop(
                ctx.currentTime + start + duration
            )
        }


        playTone(
            880,
            0,
            0.22
        )


        playTone(
            1100,
            0.28,
            0.22
        )


        playTone(
            880,
            0.56,
            0.28
        )


        setTimeout(
            () => {

                ctx.close()
                    .catch(
                        () => { }
                    )
            },
            1200
        )


    } catch (error) {

        console.warn(
            'Alert sound error:',
            error
        )
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


async function loadProfile(
    userId
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
                userId
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


    el.branchText.textContent =
        `สาขา: ${data.name}`
}


/* ========================================
   LOAD KITCHEN ITEMS
======================================== */

async function loadKitchenItems(
    {
        notifyNew = false
    } = {}
) {

    const {
        data,
        error
    } =
        await supabase.rpc(
            'get_kitchen_pending_items'
        )


    if (error) {
        throw error
    }


    const list =
        Array.isArray(data)

            ? data

            : []


    const newItems =
        list.filter(
            item =>
                !state.knownItemIds
                    .has(
                        item.item_id
                    )
        )


    state.items =
        list


    for (
        const item
        of
        list
    ) {

        state.knownItemIds.add(
            item.item_id
        )
    }


    renderKitchenItems()


    if (
        notifyNew
        &&
        newItems.length >
        0
    ) {

        playAlertSound()


        /*
         * พิมพ์อัตโนมัติทีละใบ
         *
         * หมายเหตุ:
         * Browser ทั่วไปอาจเปิด Print Dialog
         * ถ้าใช้ Chrome Kiosk Printing
         * สามารถพิมพ์ออกเครื่องพิมพ์ได้ทันที
         */
        for (
            const item
            of
            newItems
        ) {

            await printKitchenItem(
                item,
                {
                    auto:
                        true
                }
            )


            /*
             * เว้นเล็กน้อยก่อนใบถัดไป
             */
            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        400
                    )
            )
        }
    }
}


/* ========================================
   RENDER
======================================== */

function renderKitchenItems() {

    const list =
        state.items


    el.pendingCount.textContent =
        list.length.toLocaleString(
            'th-TH'
        )


    el.statusText.textContent =
        list.length

            ? 'มีออเดอร์รอครัว'

            : 'รอออเดอร์ใหม่...'


    el.emptyState
        .classList
        .toggle(
            'hidden',
            list.length >
            0
        )


    el.ticketGrid
        .classList
        .toggle(
            'hidden',
            list.length ===
            0
        )


    el.ticketGrid.innerHTML =
        list
            .map(
                item => {

                    const modifiers =
                        Array.isArray(
                            item.modifiers
                        )

                            ? item.modifiers

                            : []


                    const modifierText =
                        modifiers
                            .map(
                                modifier =>
                                    `${esc(
                                        modifier.group_name
                                        ||
                                        ''
                                    )}: ${esc(
                                        modifier.option_name
                                        ||
                                        ''
                                    )}`
                            )
                            .join(
                                '<br>'
                            )


                    const tableName =
                        item.table_name
                        ||
                        (
                            item.table_no
                                ? `โต๊ะ ${item.table_no}`
                                : 'ไม่ระบุโต๊ะ'
                        )


                    return `
                        <article class="ticket-card">

                            <div class="ticket-head">

                                <div>

                                    <h2>
                                        ${esc(
                        tableName
                    )}
                                    </h2>

                                    <div class="ticket-time">
                                        ${formatTime(
                        item.created_at
                    )}
                                    </div>

                                </div>

                                <span class="new-badge">
                                    QR ใหม่
                                </span>

                            </div>


                            <div class="ticket-body">

                                <div class="product-name">
                                    ${esc(
                        item.product_name
                    )}
                                </div>

                                <div class="quantity">
                                    ×
                                    ${Number(
                        item.quantity
                        ||
                        0
                    ).toLocaleString(
                        'th-TH'
                    )}
                                </div>


                                ${modifierText

                            ? `
                                            <div class="modifier-list">
                                                ${modifierText}
                                            </div>
                                        `

                            : ''
                        }


                                ${item.item_note

                            ? `
                                            <div class="note">
                                                หมายเหตุ:
                                                ${esc(
                                item.item_note
                            )}
                                            </div>
                                        `

                            : ''
                        }

                            </div>


                            <div class="ticket-actions">

                                <button
                                    type="button"
                                    class="print-btn"
                                    data-act="print"
                                    data-id="${esc(
                            item.item_id
                        )}"
                                >
                                    🖨️ พิมพ์
                                </button>

                                <button
                                    type="button"
                                    class="ack-btn"
                                    data-act="ack"
                                    data-id="${esc(
                            item.item_id
                        )}"
                                >
                                    รับออเดอร์
                                </button>

                            </div>

                        </article>
                    `
                }
            )
            .join('')
}


/* ========================================
   PRINT
======================================== */

function renderPrintTicket(
    item
) {

    const modifiers =
        Array.isArray(
            item.modifiers
        )

            ? item.modifiers

            : []


    const modifierHtml =
        modifiers
            .map(
                modifier =>
                    `
                    <div>
                        ${esc(
                        modifier.group_name
                        ||
                        ''
                    )}:
                        <strong>
                            ${esc(
                        modifier.option_name
                        ||
                        ''
                    )}
                        </strong>
                    </div>
                    `
            )
            .join('')


    const tableName =
        item.table_name
        ||
        (
            item.table_no
                ? `โต๊ะ ${item.table_no}`
                : 'ไม่ระบุโต๊ะ'
        )


    el.kitchenPrintArea.innerHTML =
        `
        <div class="print-ticket">

            <div class="print-center">
                <strong>
                    JOKJUNG - ใบครัว
                </strong>
            </div>

            <div class="print-table">
                ${esc(
            tableName
        )}
            </div>

            <div class="print-center">
                ${formatTime(
            item.created_at
        )}
            </div>

            <div class="print-line"></div>

            <div class="print-product">
                ${esc(
            item.product_name
        )}
            </div>

            <div class="print-qty">
                จำนวน:
                ${Number(
            item.quantity
            ||
            0
        ).toLocaleString(
            'th-TH'
        )}
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
                            ${esc(
                item.item_note
            )}
                        </div>
                    `

            : ''
        }

            <div class="print-line"></div>

            <div class="print-center">
                QR ORDER
            </div>

        </div>
        `
}


async function markPrinted(
    itemId
) {

    const {
        error
    } =
        await supabase.rpc(
            'mark_kitchen_item_printed',
            {
                p_item_id:
                    itemId
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
    {
        auto = false
    } = {}
) {

    if (!item) {
        return
    }


    renderPrintTicket(
        item
    )


    /*
     * อัปเดตสถานะก่อนสั่งพิมพ์
     */
    await markPrinted(
        item.item_id
    )


    /*
     * Browser ปกติจะเปิด Print Dialog
     * Chrome ที่เปิด --kiosk-printing
     * จะพิมพ์ออก Default Printer โดยไม่ถาม
     */
    setTimeout(
        () => {

            window.print()

        },
        auto
            ? 150
            : 50
    )
}


/* ========================================
   ACKNOWLEDGE
======================================== */

async function acknowledgeItem(
    itemId
) {

    const {
        error
    } =
        await supabase.rpc(
            'acknowledge_kitchen_item',
            {
                p_item_id:
                    itemId
            }
        )


    if (error) {
        throw error
    }


    state.items =
        state.items.filter(
            item =>
                item.item_id !==
                itemId
        )


    renderKitchenItems()
}


/* ========================================
   REALTIME
======================================== */

function subscribeRealtime() {

    if (
        state.realtimeChannel
    ) {

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
                    event:
                        'INSERT',

                    schema:
                        'public',

                    table:
                        'restaurant_order_items'
                },
                async payload => {

                    /*
                     * สนใจเฉพาะรายการจาก QR
                     */
                    if (
                        payload.new
                            ?.order_source !==
                        'qr'
                    ) {
                        return
                    }


                    try {

                        await loadKitchenItems({
                            notifyNew:
                                true
                        })


                    } catch (error) {

                        console.error(
                            'Realtime kitchen reload error:',
                            error
                        )
                    }
                }
            )
            .subscribe(
                status => {

                    if (
                        status ===
                        'SUBSCRIBED'
                    ) {

                        el.statusText.textContent =
                            'เชื่อมต่อแจ้งเตือนแบบเรียลไทม์แล้ว'
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


        if (!session) {
            return
        }


        await loadProfile(
            session.user.id
        )


        await loadBranch()


        /*
         * โหลดครั้งแรกโดยไม่เปิดเสียง
         * ป้องกันเสียงดังจากรายการเก่าทันทีที่เข้าหน้า
         */
        await loadKitchenItems({
            notifyNew:
                false
        })


        subscribeRealtime()


    } catch (error) {

        console.error(
            'Kitchen init error:',
            error
        )


        msg(
            el.pageMessage,
            error.message
            ||
            'เปิดหน้าครัวไม่สำเร็จ'
        )
    }
}


/* ========================================
   EVENTS
======================================== */

el.enableSoundBtn
    ?.addEventListener(
        'click',
        async () => {

            state.soundEnabled =
                true


            el.enableSoundBtn
                .classList
                .add(
                    'active'
                )


            el.enableSoundBtn.textContent =
                '🔔 เสียงแจ้งเตือน: เปิดแล้ว'


            /*
             * เล่นเสียงสั้นหนึ่งครั้ง
             * เพื่อปลด Browser Autoplay Restriction
             */
            playAlertSound()
        }
    )


el.refreshBtn
    ?.addEventListener(
        'click',
        async () => {

            try {

                await loadKitchenItems({
                    notifyNew:
                        false
                })

            } catch (error) {

                msg(
                    el.pageMessage,
                    error.message
                    ||
                    'รีเฟรชไม่สำเร็จ'
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


el.ticketGrid
    ?.addEventListener(
        'click',
        async event => {

            const button =
                event.target.closest(
                    '[data-act]'
                )


            if (!button) {
                return
            }


            const itemId =
                button.dataset.id


            const item =
                state.items.find(
                    row =>
                        row.item_id ===
                        itemId
                )


            try {

                if (
                    button.dataset.act ===
                    'print'
                ) {

                    await printKitchenItem(
                        item
                    )


                    return
                }


                if (
                    button.dataset.act ===
                    'ack'
                ) {

                    await acknowledgeItem(
                        itemId
                    )
                }


            } catch (error) {

                console.error(
                    'Kitchen action error:',
                    error
                )


                msg(
                    el.pageMessage,
                    error.message
                    ||
                    'ดำเนินการไม่สำเร็จ'
                )
            }
        }
    )


window.addEventListener(
    'beforeunload',
    () => {

        if (
            state.realtimeChannel
        ) {

            supabase.removeChannel(
                state.realtimeChannel
            )
        }
    }
)


init()
