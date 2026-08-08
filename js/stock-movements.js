import { supabase } from './supabase.js'


const state = {
    session: null,
    profile: null,
    branch: null,

    ingredients: [],
    movements: [],
    filteredMovements: []
}


const $ = id =>
    document.getElementById(id)


const el = {
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),

    branchText: $('branchText'),
    userName: $('userName'),

    newMovementBtn:
        $('newMovementBtn'),

    todayMovementCount:
        $('todayMovementCount'),

    todayStockIn:
        $('todayStockIn'),

    todayStockOut:
        $('todayStockOut'),

    searchInput:
        $('searchInput'),

    movementFilter:
        $('movementFilter'),

    dateFrom:
        $('dateFrom'),

    dateTo:
        $('dateTo'),

    todayBtn:
        $('todayBtn'),

    clearFilterBtn:
        $('clearFilterBtn'),

    refreshBtn:
        $('refreshBtn'),

    pageMessage:
        $('pageMessage'),

    resultCount:
        $('resultCount'),

    loadingState:
        $('loadingState'),

    emptyState:
        $('emptyState'),

    tableWrap:
        $('tableWrap'),

    movementTableBody:
        $('movementTableBody'),

    movementModal:
        $('movementModal'),

    closeModalBtn:
        $('closeModalBtn'),

    cancelBtn:
        $('cancelBtn'),

    movementForm:
        $('movementForm'),

    ingredientSelect:
        $('ingredientSelect'),

    currentStockBox:
        $('currentStockBox'),

    currentStockText:
        $('currentStockText'),

    movementType:
        $('movementType'),

    quantityInput:
        $('quantityInput'),

    unitText:
        $('unitText'),

    costField:
        $('costField'),

    unitCostInput:
        $('unitCostInput'),

    noteInput:
        $('noteInput'),

    formMessage:
        $('formMessage'),

    saveMovementBtn:
        $('saveMovementBtn')
}


/* HELPERS */

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}


function number(value) {
    return Number(value || 0)
        .toLocaleString(
            'th-TH',
            {
                maximumFractionDigits: 3
            }
        )
}


function money(value) {
    return new Intl.NumberFormat(
        'th-TH',
        {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }
    ).format(
        Number(value || 0)
    )
}


function formatDateTime(value) {
    if (!value) return '-'

    return new Intl.DateTimeFormat(
        'th-TH',
        {
            dateStyle: 'short',
            timeStyle: 'medium'
        }
    ).format(
        new Date(value)
    )
}


function message(
    target,
    text = '',
    type = 'error'
) {
    if (!target) return

    target.textContent = text

    target.style.color =
        type === 'success'
            ? '#188038'
            : '#d93025'
}


function movementLabel(type) {
    const labels = {
        stock_in:
            'รับเข้า',

        adjust_in:
            'ปรับเพิ่ม',

        adjust_out:
            'ปรับลด',

        waste:
            'ของเสีย',

        sale:
            'ขาย'
    }

    return labels[type]
        || type
        || '-'
}


function isPositiveMovement(type) {
    return (
        type === 'stock_in'
        ||
        type === 'adjust_in'
    )
}


/* SESSION */

async function requireSession() {
    const {
        data: { session },
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

    state.session = session

    return session
}


/* PROFILE */

async function loadProfile(userId) {
    const {
        data,
        error
    } =
        await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                role,
                branch_id
            `)
            .eq(
                'id',
                userId
            )
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


/* BRANCH */

async function loadBranch() {
    const {
        data,
        error
    } =
        await supabase
            .from('branches')
            .select('id,name')
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

    state.branch = data

    el.branchText.textContent =
        `สาขา: ${data.name}`

    el.userName.textContent =
        state.profile.full_name
        ||
        state.session.user.email
            ?.split('@')[0]
        ||
        'ผู้ใช้งาน'
}


/* INGREDIENTS */

async function loadIngredients() {
    const {
        data,
        error
    } =
        await supabase
            .from('ingredients')
            .select(`
                id,
                name,
                unit,
                current_stock,
                cost_per_unit,
                is_active
            `)
            .eq(
                'branch_id',
                state.profile.branch_id
            )
            .eq(
                'is_active',
                true
            )
            .order('name')

    if (error) {
        throw error
    }

    state.ingredients =
        data || []

    renderIngredientOptions()
}


function renderIngredientOptions() {
    el.ingredientSelect.innerHTML =
        `
        <option value="">
            -- เลือกวัตถุดิบ --
        </option>
        `
        +
        state.ingredients
            .map(item => `
                <option
                    value="${esc(item.id)}"
                >
                    ${esc(item.name)}
                </option>
            `)
            .join('')
}


/* MOVEMENTS */

async function loadMovements() {
    el.loadingState
        .classList
        .remove('hidden')

    el.emptyState
        .classList
        .add('hidden')

    el.tableWrap
        .classList
        .add('hidden')

    try {
        const {
            data,
            error
        } =
            await supabase
                .from(
                    'ingredient_stock_movements'
                )
                .select(`
                    id,
                    branch_id,
                    ingredient_id,
                    movement_type,
                    quantity,
                    stock_before,
                    stock_after,
                    unit_cost,
                    note,
                    created_by,
                    created_at
                `)
                .eq(
                    'branch_id',
                    state.profile.branch_id
                )
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                )
                .limit(1000)

        if (error) {
            throw error
        }

        state.movements =
            (data || []).map(
                movement => ({
                    ...movement,

                    ingredient:
                        state.ingredients.find(
                            item =>
                                item.id ===
                                movement.ingredient_id
                        )
                        ||
                        null
                })
            )

        applyFilters()
        renderSummary()

    } catch (error) {
        console.error(
            'Load stock movements error:',
            error
        )

        message(
            el.pageMessage,
            error.message ||
            'โหลดประวัติสต็อกไม่สำเร็จ'
        )

    } finally {
        el.loadingState
            .classList
            .add('hidden')
    }
}


/* FILTER */

function applyFilters() {
    const keyword =
        el.searchInput.value
            .trim()
            .toLowerCase()

    const movementType =
        el.movementFilter.value

    const from =
        el.dateFrom.value

    const to =
        el.dateTo.value


    state.filteredMovements =
        state.movements.filter(
            movement => {

                const name =
                    movement
                        .ingredient
                        ?.name
                    ||
                    ''

                const searchMatch =
                    !keyword
                    ||
                    name
                        .toLowerCase()
                        .includes(keyword)


                const typeMatch =
                    !movementType
                    ||
                    movement
                        .movement_type
                    ===
                    movementType


                const created =
                    new Date(
                        movement.created_at
                    )

                let dateMatch =
                    true


                if (from) {
                    const start =
                        new Date(
                            `${from}T00:00:00`
                        )

                    if (
                        created < start
                    ) {
                        dateMatch =
                            false
                    }
                }


                if (to) {
                    const end =
                        new Date(
                            `${to}T23:59:59.999`
                        )

                    if (
                        created > end
                    ) {
                        dateMatch =
                            false
                    }
                }


                return (
                    searchMatch
                    &&
                    typeMatch
                    &&
                    dateMatch
                )
            }
        )


    renderMovements()
}


/* RENDER */

function renderMovements() {
    const list =
        state.filteredMovements

    el.resultCount.textContent =
        `${list.length.toLocaleString(
            'th-TH'
        )} รายการ`


    if (!list.length) {
        el.emptyState
            .classList
            .remove('hidden')

        el.tableWrap
            .classList
            .add('hidden')

        return
    }


    el.emptyState
        .classList
        .add('hidden')

    el.tableWrap
        .classList
        .remove('hidden')


    el.movementTableBody.innerHTML =
        list.map(
            movement => {

                const positive =
                    isPositiveMovement(
                        movement.movement_type
                    )

                const qtyClass =
                    positive
                        ? 'qty-plus'
                        : 'qty-minus'

                const sign =
                    positive
                        ? '+'
                        : '-'

                const ingredient =
                    movement.ingredient


                return `
                    <tr>

                        <td>
                            ${
                                formatDateTime(
                                    movement.created_at
                                )
                            }
                        </td>

                        <td>
                            <strong>
                                ${
                                    esc(
                                        ingredient
                                            ?.name
                                        ||
                                        'ไม่พบวัตถุดิบ'
                                    )
                                }
                            </strong>
                        </td>

                        <td>

                            <span
                                class="
                                    badge
                                    badge-${
                                        esc(
                                            movement.movement_type
                                        )
                                    }
                                "
                            >
                                ${
                                    movementLabel(
                                        movement.movement_type
                                    )
                                }
                            </span>

                        </td>

                        <td
                            class="${qtyClass}"
                        >
                            ${sign}${number(
                                movement.quantity
                            )}
                            ${
                                esc(
                                    ingredient
                                        ?.unit
                                    ||
                                    ''
                                )
                            }
                        </td>

                        <td>
                            ${
                                number(
                                    movement.stock_before
                                )
                            }
                        </td>

                        <td>
                            ${
                                number(
                                    movement.stock_after
                                )
                            }
                        </td>

                        <td>
                            ${
                                money(
                                    movement.unit_cost
                                )
                            }
                        </td>

                        <td>
                            ${
                                esc(
                                    movement.note ||
                                    '-'
                                )
                            }
                        </td>

                    </tr>
                `
            }
        ).join('')
}


/* SUMMARY */

function startOfToday() {
    const date =
        new Date()

    date.setHours(
        0,
        0,
        0,
        0
    )

    return date
}


function renderSummary() {
    const today =
        startOfToday()

    const todayMovements =
        state.movements.filter(
            item =>
                new Date(
                    item.created_at
                )
                >=
                today
        )


    const stockIn =
        todayMovements
            .filter(
                item =>
                    isPositiveMovement(
                        item.movement_type
                    )
            )
            .reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.quantity ||
                        0
                    ),
                0
            )


    const stockOut =
        todayMovements
            .filter(
                item =>
                    item.movement_type ===
                    'adjust_out'
                    ||
                    item.movement_type ===
                    'waste'
                    ||
                    item.movement_type ===
                    'sale'
            )
            .reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.quantity ||
                        0
                    ),
                0
            )


    el.todayMovementCount.textContent =
        todayMovements
            .length
            .toLocaleString(
                'th-TH'
            )

    el.todayStockIn.textContent =
        number(stockIn)

    el.todayStockOut.textContent =
        number(stockOut)
}


/* MODAL */

function openModal() {
    el.movementForm.reset()

    el.movementType.value =
        'stock_in'

    el.currentStockBox
        .classList
        .add('hidden')

    el.currentStockText.textContent =
        '0'

    el.unitText.textContent =
        'หน่วย: -'

    el.unitCostInput.value =
        ''

    updateCostVisibility()

    message(
        el.formMessage,
        ''
    )

    el.movementModal
        .classList
        .remove('hidden')
}


function closeModal() {
    el.movementModal
        .classList
        .add('hidden')

    message(
        el.formMessage,
        ''
    )
}


/* INGREDIENT CHANGE */

function updateIngredientInfo() {
    const ingredient =
        state.ingredients.find(
            item =>
                item.id ===
                el.ingredientSelect.value
        )

    if (!ingredient) {
        el.currentStockBox
            .classList
            .add('hidden')

        el.unitText.textContent =
            'หน่วย: -'

        return
    }

    el.currentStockBox
        .classList
        .remove('hidden')

    el.currentStockText.textContent =
        `${number(
            ingredient.current_stock
        )} ${ingredient.unit}`

    el.unitText.textContent =
        `หน่วย: ${ingredient.unit}`

    el.unitCostInput.value =
        Number(
            ingredient.cost_per_unit ||
            0
        )
}


/* COST FIELD */

function updateCostVisibility() {
    const type =
        el.movementType.value

    el.costField
        .classList
        .toggle(
            'hidden',
            type !== 'stock_in'
        )
}


/* SAVE MOVEMENT */

async function saveMovement(
    event
) {
    event.preventDefault()

    const ingredientId =
        el.ingredientSelect.value

    const movementType =
        el.movementType.value

    const quantity =
        Number(
            el.quantityInput.value ||
            0
        )

    let unitCost =
        null

    if (
        movementType ===
        'stock_in'
    ) {
        const rawCost =
            el.unitCostInput.value
                .trim()

        if (
            rawCost !== ''
        ) {
            unitCost =
                Number(rawCost)

            if (
                !Number.isFinite(
                    unitCost
                )
                ||
                unitCost < 0
            ) {
                message(
                    el.formMessage,
                    'ต้นทุนต่อหน่วยไม่ถูกต้อง'
                )

                return
            }
        }
    }


    if (!ingredientId) {
        message(
            el.formMessage,
            'กรุณาเลือกวัตถุดิบ'
        )

        return
    }


    if (
        !Number.isFinite(
            quantity
        )
        ||
        quantity <= 0
    ) {
        message(
            el.formMessage,
            'จำนวนต้องมากกว่า 0'
        )

        return
    }


    const ingredient =
        state.ingredients.find(
            item =>
                item.id ===
                ingredientId
        )


    if (
        (
            movementType ===
            'adjust_out'
            ||
            movementType ===
            'waste'
        )
        &&
        quantity >
        Number(
            ingredient
                ?.current_stock ||
            0
        )
    ) {
        message(
            el.formMessage,
            'จำนวนที่ลดมากกว่าสต็อกปัจจุบัน'
        )

        return
    }


    el.saveMovementBtn.disabled =
        true

    el.saveMovementBtn.textContent =
        'กำลังบันทึก...'


    try {
        const {
            data,
            error
        } =
            await supabase.rpc(
                'adjust_ingredient_stock',
                {
                    p_ingredient_id:
                        ingredientId,

                    p_movement_type:
                        movementType,

                    p_quantity:
                        quantity,

                    p_unit_cost:
                        unitCost,

                    p_note:
                        el.noteInput.value
                            .trim()
                        ||
                        null
                }
            )


        if (error) {
            throw error
        }


        console.log(
            'Stock movement:',
            data
        )


        closeModal()


        await loadIngredients()
        await loadMovements()


        message(
            el.pageMessage,
            'บันทึกการเคลื่อนไหวสต็อกสำเร็จ',
            'success'
        )


        setTimeout(
            () => {
                message(
                    el.pageMessage,
                    ''
                )
            },
            2500
        )

    } catch (error) {
        console.error(
            'Adjust stock error:',
            error
        )

        let text =
            error.message ||
            'บันทึกรายการไม่สำเร็จ'


        if (
            text.includes(
                'INSUFFICIENT_STOCK'
            )
        ) {
            text =
                'สต็อกไม่เพียงพอ'
        }


        if (
            text.includes(
                'INGREDIENT_NOT_FOUND'
            )
        ) {
            text =
                'ไม่พบวัตถุดิบ หรือวัตถุดิบไม่ได้อยู่ในสาขานี้'
        }


        message(
            el.formMessage,
            text
        )

    } finally {
        el.saveMovementBtn.disabled =
            false

        el.saveMovementBtn.textContent =
            'บันทึกรายการ'
    }
}


/* FILTER HELPERS */

function getLocalDateValue(
    date
) {
    const year =
        date.getFullYear()

    const month =
        String(
            date.getMonth() +
            1
        )
        .padStart(
            2,
            '0'
        )

    const day =
        String(
            date.getDate()
        )
        .padStart(
            2,
            '0'
        )

    return `${year}-${month}-${day}`
}


function setTodayFilter() {
    const value =
        getLocalDateValue(
            new Date()
        )

    el.dateFrom.value =
        value

    el.dateTo.value =
        value

    applyFilters()
}


function clearFilters() {
    el.searchInput.value =
        ''

    el.movementFilter.value =
        ''

    el.dateFrom.value =
        ''

    el.dateTo.value =
        ''

    applyFilters()
}


/* LOGOUT */

async function logout() {
    await supabase
        .auth
        .signOut()

    location.replace(
        './index.html'
    )
}


/* INIT */

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

        await loadIngredients()

        await loadMovements()

    } catch (error) {
        console.error(
            'Stock movements init error:',
            error
        )

        el.loadingState
            .classList
            .add('hidden')

        el.emptyState
            .classList
            .remove('hidden')

        el.emptyState.textContent =
            error.message ||
            'โหลดข้อมูลไม่สำเร็จ'
    }
}


/* EVENTS */

el.backBtn.onclick =
    () => {
        location.href =
            './dashboard.html'
    }


el.logoutBtn.onclick =
    logout


el.newMovementBtn.onclick =
    openModal


el.closeModalBtn.onclick =
    closeModal


el.cancelBtn.onclick =
    closeModal


el.ingredientSelect.onchange =
    updateIngredientInfo


el.movementType.onchange =
    updateCostVisibility


el.movementForm.onsubmit =
    saveMovement


el.searchInput.oninput =
    applyFilters


el.movementFilter.onchange =
    applyFilters


el.dateFrom.onchange =
    applyFilters


el.dateTo.onchange =
    applyFilters


el.todayBtn.onclick =
    setTodayFilter


el.clearFilterBtn.onclick =
    clearFilters


el.refreshBtn.onclick =
    async () => {
        await loadIngredients()
        await loadMovements()
    }


el.movementModal.onclick =
    event => {

        if (
            event.target ===
            el.movementModal
        ) {
            closeModal()
        }
    }


document.addEventListener(
    'keydown',
    event => {

        if (
            event.key ===
            'Escape'
            &&
            !el.movementModal
                .classList
                .contains('hidden')
        ) {
            closeModal()
        }
    }
)


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


init()