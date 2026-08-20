import { supabase } from './supabase.js'


/* ========================================
   STATE
======================================== */

const state = {

    session:
        null,

    profile:
        null,

    branch:
        null,

    shift:
        null,

    liveSummary:
    {
        totalSales:
            0,

        cashSales:
            0,

        qrSales:
            0,

        discount:
            0,

        billCount:
            0,

        voidCount:
            0,

        voidAmount:
            0,

        expectedCash:
            0
    }
}


/* ========================================
   ELEMENTS
======================================== */

const $ = id =>
    document.getElementById(
        id
    )


const el = {

    backBtn:
        $('backBtn'),

    logoutBtn:
        $('logoutBtn'),

    branchText:
        $('branchText'),

    userName:
        $('userName'),

    userRole:
        $('userRole'),

    pageMessage:
        $('pageMessage'),

    loadingState:
        $('loadingState'),


    /* OPEN SHIFT */

    openShiftPanel:
        $('openShiftPanel'),

    openingCashInput:
        $('openingCashInput'),

    openingNoteInput:
        $('openingNoteInput'),

    openShiftBtn:
        $('openShiftBtn'),


    /* ACTIVE SHIFT */

    activeShiftPanel:
        $('activeShiftPanel'),

    shiftOpenedText:
        $('shiftOpenedText'),

    shiftOpenedBy:
        $('shiftOpenedBy'),

    shiftOpenedAt:
        $('shiftOpenedAt'),

    shiftOpeningCash:
        $('shiftOpeningCash'),

    shiftDuration:
        $('shiftDuration'),

    openingNoteWrap:
        $('openingNoteWrap'),

    openingNoteText:
        $('openingNoteText'),


    /* LIVE SUMMARY */

    liveTotalSales:
        $('liveTotalSales'),

    liveBillCount:
        $('liveBillCount'),

    liveCashSales:
        $('liveCashSales'),

    liveQrSales:
        $('liveQrSales'),

    liveDiscount:
        $('liveDiscount'),

    liveVoidCount:
        $('liveVoidCount'),

    liveVoidAmount:
        $('liveVoidAmount'),


    /* EXPECTED CASH */

    calcOpeningCash:
        $('calcOpeningCash'),

    calcCashSales:
        $('calcCashSales'),

    expectedCashText:
        $('expectedCashText'),


    /* CLOSE SHIFT */

    countedCashInput:
        $('countedCashInput'),

    cashDifferenceBox:
        $('cashDifferenceBox'),

    cashDifferenceText:
        $('cashDifferenceText'),

    closingNoteInput:
        $('closingNoteInput'),

    refreshShiftBtn:
        $('refreshShiftBtn'),

    closeShiftBtn:
        $('closeShiftBtn'),


    /* CLOSED */

    closedShiftPanel:
        $('closedShiftPanel'),

    closedTotalSales:
        $('closedTotalSales'),

    closedCashSales:
        $('closedCashSales'),

    closedQrSales:
        $('closedQrSales'),

    closedBillCount:
        $('closedBillCount'),

    closedExpectedCash:
        $('closedExpectedCash'),

    closedCountedCash:
        $('closedCountedCash'),

    closedDifferenceBox:
        $('closedDifferenceBox'),

    closedDifferenceText:
        $('closedDifferenceText'),

    newShiftBtn:
        $('newShiftBtn')
}


/* ========================================
   HELPERS
======================================== */

function money(value) {

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


function message(
    text = '',
    type = 'error'
) {

    if (
        !el.pageMessage
    ) {
        return
    }


    el.pageMessage.textContent =
        text


    el.pageMessage.style.color =
        type ===
            'success'

            ? '#188038'

            : '#d93025'
}


function formatRole(
    role
) {

    const map = {

        admin:
            'ผู้ดูแลระบบ',

        manager:
            'ผู้จัดการ',

        staff:
            'พนักงาน'
    }


    return (
        map[
        String(
            role || ''
        )
            .toLowerCase()
        ]
        ||
        role
        ||
        '-'
    )
}


function formatDateTime(
    value
) {

    if (!value) {

        return '-'
    }


    return new Intl.DateTimeFormat(
        'th-TH',
        {
            dateStyle:
                'medium',

            timeStyle:
                'medium'
        }
    ).format(
        new Date(
            value
        )
    )
}


function formatDuration(
    openedAt
) {

    if (!openedAt) {

        return '-'
    }


    const start =
        new Date(
            openedAt
        )


    const now =
        new Date()


    let seconds =
        Math.max(
            Math.floor(
                (
                    now -
                    start
                )
                /
                1000
            ),
            0
        )


    const hours =
        Math.floor(
            seconds /
            3600
        )


    seconds -=
        hours *
        3600


    const minutes =
        Math.floor(
            seconds /
            60
        )


    if (
        hours > 0
    ) {

        return (
            `${hours} ชม. ${minutes} นาที`
        )
    }


    return (
        `${minutes} นาที`
    )
}


function parseNumber(
    value
) {

    const number =
        Number(
            value
        )


    return Number.isFinite(
        number
    )
        ? number
        : 0
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
                `
                id,
                full_name,
                role,
                branch_id,
                is_active
                `
            )
            .eq(
                'id',
                userId
            )
            .maybeSingle()


    if (error) {

        throw error
    }


    if (!data) {

        throw new Error(
            'ไม่พบข้อมูลผู้ใช้งาน'
        )
    }


    if (
        data.is_active ===
        false
    ) {

        throw new Error(
            'บัญชีนี้ถูกปิดใช้งาน'
        )
    }


    if (
        !data.branch_id
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
            'ไม่พบข้อมูลสาขา'
        )
    }


    state.branch =
        data
}


/* ========================================
   USER DISPLAY
======================================== */

function renderUser() {

    const name =
        state.profile.full_name
        ||
        state.session
            .user
            .email
            ?.split('@')[0]
        ||
        'ผู้ใช้งาน'


    el.userName.textContent =
        name


    el.userRole.textContent =
        formatRole(
            state.profile.role
        )


    el.branchText.textContent =
        `สาขา: ${state.branch.name}`
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
            'Get current shift error:',
            error
        )

        throw error
    }


    /*
     * สำคัญ
     *
     * PostgreSQL function ที่ RETURNS public.shifts
     * ตอน return null อาจส่งกลับมาเป็น object
     * ที่ทุก column เป็น null
     *
     * เราจึงต้องตรวจ id จริง
     */
    if (
        !data
        ||
        !data.id
        ||
        !data.branch_id
        ||
        !data.opened_at
    ) {

        state.shift =
            null

        return null
    }


    state.shift =
        data


    return state.shift
}


/* ========================================
   LOAD LIVE SALES
======================================== */

async function loadLiveSummary() {

    const shift =
        state.shift


    /*
     * ไม่มีกะ หรือข้อมูลกะไม่สมบูรณ์
     * ห้าม query sales ด้วย UUID null
     */
    if (
        !shift
        ||
        !shift.id
        ||
        !shift.branch_id
        ||
        !shift.opened_at
    ) {

        return
    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                'sales'
            )
            .select(
                `
                id,
                total,
                discount,
                payment_method,
                status,
                created_at
                `
            )
            .eq(
                'branch_id',
                shift.branch_id
            )
            .gte(
                'created_at',
                shift.opened_at
            )


    if (error) {

        console.error(
            'Load shift sales error:',
            error
        )


        throw error
    }


    const sales =
        data || []


    const completed =
        sales.filter(
            sale =>
                sale.status !==
                'cancelled'
        )


    const voided =
        sales.filter(
            sale =>
                sale.status ===
                'cancelled'
        )


    const totalSales =
        completed.reduce(
            (
                sum,
                sale
            ) =>
                sum +
                parseNumber(
                    sale.total
                ),
            0
        )


    const cashSales =
        completed
            .filter(
                sale =>
                    sale.payment_method ===
                    'cash'
            )
            .reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    parseNumber(
                        sale.total
                    ),
                0
            )


    const qrSales =
        completed
            .filter(
                sale =>
                    sale.payment_method ===
                    'qr'
            )
            .reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    parseNumber(
                        sale.total
                    ),
                0
            )


    const discount =
        completed.reduce(
            (
                sum,
                sale
            ) =>
                sum +
                parseNumber(
                    sale.discount
                ),
            0
        )


    const voidAmount =
        voided.reduce(
            (
                sum,
                sale
            ) =>
                sum +
                parseNumber(
                    sale.total
                ),
            0
        )


    const expectedCash =
        parseNumber(
            shift.opening_cash
        )
        +
        cashSales


    state.liveSummary = {

        totalSales,

        cashSales,

        qrSales,

        discount,

        billCount:
            completed.length,

        voidCount:
            voided.length,

        voidAmount,

        expectedCash
    }


    renderLiveSummary()
}


/* ========================================
   RENDER LIVE SUMMARY
======================================== */

function renderLiveSummary() {

    const summary =
        state.liveSummary


    el.liveTotalSales.textContent =
        money(
            summary.totalSales
        )


    el.liveBillCount.textContent =
        summary.billCount
            .toLocaleString(
                'th-TH'
            )


    el.liveCashSales.textContent =
        money(
            summary.cashSales
        )


    el.liveQrSales.textContent =
        money(
            summary.qrSales
        )


    el.liveDiscount.textContent =
        money(
            summary.discount
        )


    el.liveVoidCount.textContent =
        summary.voidCount
            .toLocaleString(
                'th-TH'
            )


    el.liveVoidAmount.textContent =
        money(
            summary.voidAmount
        )


    el.calcOpeningCash.textContent =
        money(
            state.shift
                ?.opening_cash
        )


    el.calcCashSales.textContent =
        money(
            summary.cashSales
        )


    el.expectedCashText.textContent =
        money(
            summary.expectedCash
        )


    updateDifference()
}


/* ========================================
   RENDER SHIFT
======================================== */

function renderShift() {

    el.loadingState
        .classList
        .add(
            'hidden'
        )


    el.closedShiftPanel
        .classList
        .add(
            'hidden'
        )


    if (
        !state.shift
    ) {

        el.openShiftPanel
            .classList
            .remove(
                'hidden'
            )


        el.activeShiftPanel
            .classList
            .add(
                'hidden'
            )


        return
    }


    el.openShiftPanel
        .classList
        .add(
            'hidden'
        )


    el.activeShiftPanel
        .classList
        .remove(
            'hidden'
        )


    el.shiftOpenedText.textContent =
        `เปิดกะเมื่อ ${formatDateTime(
            state.shift.opened_at
        )}`


    el.shiftOpenedBy.textContent =
        state.profile.full_name
        ||
        '-'


    el.shiftOpenedAt.textContent =
        formatDateTime(
            state.shift.opened_at
        )


    el.shiftOpeningCash.textContent =
        money(
            state.shift.opening_cash
        )


    el.shiftDuration.textContent =
        formatDuration(
            state.shift.opened_at
        )


    if (
        state.shift.opening_note
    ) {

        el.openingNoteText.textContent =
            state.shift.opening_note


        el.openingNoteWrap
            .classList
            .remove(
                'hidden'
            )

    } else {

        el.openingNoteText.textContent =
            '-'


        el.openingNoteWrap
            .classList
            .add(
                'hidden'
            )
    }
}


/* ========================================
   OPEN SHIFT
======================================== */

async function openShift() {

    const openingCash =
        parseNumber(
            el.openingCashInput.value
        )


    const openingNote =
        el.openingNoteInput.value
            .trim()


    if (
        openingCash < 0
    ) {

        message(
            'เงินสดตั้งต้นต้องไม่ติดลบ'
        )


        return
    }


    const confirmed =
        confirm(
            `ยืนยันเปิดกะด้วยเงินสดตั้งต้น ${money(
                openingCash
            )} หรือไม่?`
        )


    if (!confirmed) {

        return
    }


    el.openShiftBtn.disabled =
        true


    el.openShiftBtn.textContent =
        'กำลังเปิดกะ...'


    message('')


    try {

        const {
            data,
            error
        } =
            await supabase.rpc(
                'open_shift',
                {
                    p_opening_cash:
                        openingCash,

                    p_opening_note:
                        openingNote
                        ||
                        null
                }
            )


        if (error) {

            throw error
        }


        state.shift =
            data


        el.openingCashInput.value =
            '0'


        el.openingNoteInput.value =
            ''


        renderShift()


        await loadLiveSummary()


        message(
            'เปิดกะสำเร็จ',
            'success'
        )


    } catch (error) {

        console.error(
            'Open shift error:',
            error
        )


        let text =
            error.message
            ||
            'เปิดกะไม่สำเร็จ'


        if (
            text.includes(
                'SHIFT_ALREADY_OPEN'
            )
        ) {

            text =
                'บัญชีนี้มีกะที่เปิดอยู่แล้ว'
        }


        if (
            text.includes(
                'INVALID_OPENING_CASH'
            )
        ) {

            text =
                'จำนวนเงินสดตั้งต้นไม่ถูกต้อง'
        }


        message(
            text
        )


    } finally {

        el.openShiftBtn.disabled =
            false


        el.openShiftBtn.textContent =
            'เปิดกะ'
    }
}


/* ========================================
   UPDATE DIFFERENCE
======================================== */

function updateDifference() {

    const counted =
        parseNumber(
            el.countedCashInput.value
        )


    const expected =
        parseNumber(
            state.liveSummary
                .expectedCash
        )


    const difference =
        counted -
        expected


    el.cashDifferenceText.textContent =
        money(
            difference
        )


    el.cashDifferenceBox
        .classList
        .remove(
            'over',
            'short',
            'neutral'
        )


    if (
        difference > 0
    ) {

        el.cashDifferenceBox
            .classList
            .add(
                'over'
            )


        return
    }


    if (
        difference < 0
    ) {

        el.cashDifferenceBox
            .classList
            .add(
                'short'
            )


        return
    }


    el.cashDifferenceBox
        .classList
        .add(
            'neutral'
        )
}


/* ========================================
   REFRESH SHIFT
======================================== */

async function refreshShift() {

    if (
        !state.shift
    ) {

        return
    }


    el.refreshShiftBtn.disabled =
        true


    message('')


    try {

        await loadLiveSummary()


        el.shiftDuration.textContent =
            formatDuration(
                state.shift.opened_at
            )


        message(
            'อัปเดตยอดแล้ว',
            'success'
        )


    } catch (error) {

        console.error(
            'Refresh shift error:',
            error
        )


        message(
            error.message
            ||
            'รีเฟรชยอดไม่สำเร็จ'
        )


    } finally {

        el.refreshShiftBtn.disabled =
            false
    }
}


/* ========================================
   CLOSE SHIFT
======================================== */

async function closeShift() {

    if (
        !state.shift
    ) {

        return
    }


    if (
        el.countedCashInput.value ===
        ''
    ) {

        message(
            'กรุณากรอกเงินสดที่นับได้จริง'
        )


        el.countedCashInput
            .focus()


        return
    }


    const countedCash =
        parseNumber(
            el.countedCashInput.value
        )


    if (
        countedCash < 0
    ) {

        message(
            'เงินสดที่นับได้ต้องไม่ติดลบ'
        )


        return
    }


    const expected =
        state.liveSummary
            .expectedCash


    const difference =
        countedCash -
        expected


    const confirmed =
        confirm(
            [
                'ยืนยันปิดกะหรือไม่?',
                '',
                `เงินสดที่ควรมี: ${money(
                    expected
                )}`,
                `เงินสดที่นับจริง: ${money(
                    countedCash
                )}`,
                `ผลต่าง: ${money(
                    difference
                )}`
            ]
                .join(
                    '\n'
                )
        )


    if (!confirmed) {

        return
    }


    el.closeShiftBtn.disabled =
        true


    el.closeShiftBtn.textContent =
        'กำลังปิดกะ...'


    message('')


    try {

        /*
         * รีเฟรชยอดล่าสุดก่อนปิด
         */
        await loadLiveSummary()


        const {
            data,
            error
        } =
            await supabase.rpc(
                'close_shift',
                {
                    p_counted_cash:
                        countedCash,

                    p_closing_note:
                        el.closingNoteInput
                            .value
                            .trim()
                        ||
                        null
                }
            )


        if (error) {

            throw error
        }


        state.shift =
            null


        renderClosedShift(
            data
        )


        message(
            'ปิดกะสำเร็จ',
            'success'
        )


    } catch (error) {

        console.error(
            'Close shift error:',
            error
        )


        let text =
            error.message
            ||
            'ปิดกะไม่สำเร็จ'


        if (
            text.includes(
                'OPEN_SHIFT_NOT_FOUND'
            )
        ) {

            text =
                'ไม่พบกะที่กำลังเปิดอยู่'
        }


        if (
            text.includes(
                'COUNTED_CASH_REQUIRED'
            )
        ) {

            text =
                'กรุณากรอกเงินสดที่นับได้จริง'
        }


        if (
            text.includes(
                'INVALID_COUNTED_CASH'
            )
        ) {

            text =
                'จำนวนเงินสดที่นับได้ไม่ถูกต้อง'
        }


        message(
            text
        )


    } finally {

        el.closeShiftBtn.disabled =
            false


        el.closeShiftBtn.textContent =
            'ปิดกะ'
    }
}


/* ========================================
   CLOSED SHIFT
======================================== */

function renderClosedShift(
    shift
) {

    el.openShiftPanel
        .classList
        .add(
            'hidden'
        )


    el.activeShiftPanel
        .classList
        .add(
            'hidden'
        )


    el.loadingState
        .classList
        .add(
            'hidden'
        )


    el.closedShiftPanel
        .classList
        .remove(
            'hidden'
        )


    el.closedTotalSales.textContent =
        money(
            shift.total_sales
        )


    el.closedCashSales.textContent =
        money(
            shift.cash_sales
        )


    el.closedQrSales.textContent =
        money(
            shift.qr_sales
        )


    el.closedBillCount.textContent =
        Number(
            shift.bill_count ||
            0
        )
            .toLocaleString(
                'th-TH'
            )


    el.closedExpectedCash.textContent =
        money(
            shift.expected_cash
        )


    el.closedCountedCash.textContent =
        money(
            shift.counted_cash
        )


    const difference =
        parseNumber(
            shift.cash_difference
        )


    el.closedDifferenceText.textContent =
        money(
            difference
        )


    el.closedDifferenceBox
        .classList
        .remove(
            'over',
            'short',
            'neutral'
        )


    if (
        difference > 0
    ) {

        el.closedDifferenceBox
            .classList
            .add(
                'over'
            )

    } else if (
        difference < 0
    ) {

        el.closedDifferenceBox
            .classList
            .add(
                'short'
            )

    } else {

        el.closedDifferenceBox
            .classList
            .add(
                'neutral'
            )
    }


    el.countedCashInput.value =
        ''


    el.closingNoteInput.value =
        ''
}


/* ========================================
   NEW SHIFT
======================================== */

function newShift() {

    el.closedShiftPanel
        .classList
        .add(
            'hidden'
        )


    el.openShiftPanel
        .classList
        .remove(
            'hidden'
        )


    el.openingCashInput.value =
        '0'


    el.openingNoteInput.value =
        ''


    message('')
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


        await loadCurrentShift()


        renderShift()


        if (
            state.shift
        ) {

            await loadLiveSummary()
        }


    } catch (error) {

        console.error(
            'Shift init error:',
            error
        )


        el.loadingState
            .classList
            .add(
                'hidden'
            )


        message(
            error.message
            ||
            'โหลดระบบกะไม่สำเร็จ'
        )
    }
}


/* ========================================
   EVENTS
======================================== */

el.backBtn
    ?.addEventListener(
        'click',
        () => {

            location.href =
                './dashboard.html'
        }
    )


el.logoutBtn
    ?.addEventListener(
        'click',
        logout
    )


el.openShiftBtn
    ?.addEventListener(
        'click',
        openShift
    )


el.refreshShiftBtn
    ?.addEventListener(
        'click',
        refreshShift
    )


el.countedCashInput
    ?.addEventListener(
        'input',
        updateDifference
    )


el.closeShiftBtn
    ?.addEventListener(
        'click',
        closeShift
    )


el.newShiftBtn
    ?.addEventListener(
        'click',
        newShift
    )


/* ========================================
   AUTH
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
   DURATION TIMER
======================================== */

setInterval(
    () => {

        if (
            state.shift
            &&
            el.shiftDuration
        ) {

            el.shiftDuration.textContent =
                formatDuration(
                    state.shift.opened_at
                )
        }

    },
    60000
)


/* ========================================
   START
======================================== */

init()