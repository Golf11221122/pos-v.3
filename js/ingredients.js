import { supabase } from './supabase.js'
import { applyRoleGuard } from './role-guard.js'


const state = {
    session: null,
    profile: null,
    branch: null,

    ingredients: [],
    filteredIngredients: []
}


const $ = id =>
    document.getElementById(id)


const el = {
    logoutBtn: $('logoutBtn'),

    branchName: $('branchName'),

    addIngredientBtn:
        $('addIngredientBtn'),

    totalIngredients:
        $('totalIngredients'),

    lowStockCount:
        $('lowStockCount'),

    outOfStockCount:
        $('outOfStockCount'),

    searchInput:
        $('searchInput'),

    stockFilter:
        $('stockFilter'),

    pageMessage:
        $('pageMessage'),

    ingredientList:
        $('ingredientList'),

    ingredientModal:
        $('ingredientModal'),

    modalTitle:
        $('modalTitle'),

    closeModalBtn:
        $('closeModalBtn'),

    cancelBtn:
        $('cancelBtn'),

    ingredientForm:
        $('ingredientForm'),

    ingredientId:
        $('ingredientId'),

    ingredientName:
        $('ingredientName'),

    ingredientUnit:
        $('ingredientUnit'),

    ingredientCost:
        $('ingredientCost'),

    ingredientStock:
        $('ingredientStock'),

    ingredientMinStock:
        $('ingredientMinStock'),

    ingredientActive:
        $('ingredientActive'),

    formMessage:
        $('formMessage'),

    saveIngredientBtn:
        $('saveIngredientBtn')
}


/* ========================================
   HELPERS
======================================== */

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}


function money(value) {
    return new Intl.NumberFormat(
        'th-TH',
        {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }
    ).format(Number(value || 0))
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


function message(
    target,
    text = '',
    type = 'error'
) {
    if (!target) {
        return
    }

    target.textContent =
        text

    target.style.color =
        type === 'success'
            ? '#188038'
            : '#d93025'
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


    if (!data) {
        throw new Error(
            'ไม่พบข้อมูลผู้ใช้งาน'
        )
    }


    if (!data.branch_id) {
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
            .from('branches')
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


    el.branchName.textContent =
        `สาขา: ${data.name}`
}


/* ========================================
   LOAD INGREDIENTS
======================================== */

async function loadIngredients() {
    el.ingredientList.innerHTML = `
        <div class="loading">
            กำลังโหลดวัตถุดิบ...
        </div>
    `

    try {
        const {
            data,
            error
        } =
            await supabase
                .from('ingredients')
                .select(`
                    id,
                    branch_id,
                    name,
                    unit,
                    cost_per_unit,
                    current_stock,
                    min_stock,
                    is_active,
                    created_at,
                    updated_at
                `)
                .eq(
                    'branch_id',
                    state.profile.branch_id
                )
                .order(
                    'name',
                    {
                        ascending: true
                    }
                )


        if (error) {
            throw error
        }


        state.ingredients =
            data || []


        applyFilters()

        renderSummary()

    } catch (error) {
        console.error(
            'Load ingredients error:',
            error
        )


        el.ingredientList.innerHTML = `
            <div class="empty-state">
                โหลดข้อมูลวัตถุดิบไม่สำเร็จ
            </div>
        `


        message(
            el.pageMessage,
            error.message ||
            'โหลดข้อมูลไม่สำเร็จ'
        )
    }
}


/* ========================================
   STOCK STATUS
======================================== */

function getStockStatus(
    ingredient
) {
    const stock =
        Number(
            ingredient.current_stock ||
            0
        )


    const min =
        Number(
            ingredient.min_stock ||
            0
        )


    if (
        ingredient.is_active ===
        false
    ) {
        return {
            key: 'inactive',
            text: 'ปิดใช้งาน',
            className: 'status-off'
        }
    }


    if (stock <= 0) {
        return {
            key: 'out',
            text: 'หมดสต็อก',
            className: 'status-out'
        }
    }


    if (
        min > 0 &&
        stock <= min
    ) {
        return {
            key: 'low',
            text: 'ใกล้หมด',
            className: 'status-low'
        }
    }


    return {
        key: 'normal',
        text: 'ปกติ',
        className: 'status-normal'
    }
}


/* ========================================
   FILTER
======================================== */

function applyFilters() {
    const keyword =
        el.searchInput.value
            .trim()
            .toLowerCase()


    const filter =
        el.stockFilter.value


    state.filteredIngredients =
        state.ingredients.filter(
            ingredient => {

                const searchMatch =
                    !keyword
                    ||
                    String(
                        ingredient.name ||
                        ''
                    )
                        .toLowerCase()
                        .includes(keyword)


                const status =
                    getStockStatus(
                        ingredient
                    )


                const stockMatch =
                    filter === 'all'
                    ||
                    status.key === filter


                return (
                    searchMatch
                    &&
                    stockMatch
                )
            }
        )


    renderIngredients()
}


/* ========================================
   SUMMARY
======================================== */

function renderSummary() {
    const active =
        state.ingredients.filter(
            item =>
                item.is_active !==
                false
        )


    const low =
        active.filter(
            item => {

                const stock =
                    Number(
                        item.current_stock ||
                        0
                    )

                const min =
                    Number(
                        item.min_stock ||
                        0
                    )


                return (
                    stock > 0
                    &&
                    min > 0
                    &&
                    stock <= min
                )
            }
        )


    const out =
        active.filter(
            item =>
                Number(
                    item.current_stock ||
                    0
                )
                <= 0
        )


    el.totalIngredients.textContent =
        active.length
            .toLocaleString(
                'th-TH'
            )


    el.lowStockCount.textContent =
        low.length
            .toLocaleString(
                'th-TH'
            )


    el.outOfStockCount.textContent =
        out.length
            .toLocaleString(
                'th-TH'
            )
}


/* ========================================
   RENDER
======================================== */

function renderIngredients() {

    const list =
        state.filteredIngredients


    if (!list.length) {

        el.ingredientList.innerHTML = `
            <div class="empty-state">
                ไม่พบวัตถุดิบ
            </div>
        `

        return
    }


    el.ingredientList.innerHTML = `

        <div class="ingredient-table-wrap">

            <table class="ingredient-table">

                <thead>

                    <tr>

                        <th class="col-number text-center">
                            #
                        </th>

                        <th>
                            วัตถุดิบ
                        </th>

                        <th>
                            หน่วย
                        </th>

                        <th class="text-right">
                            สต๊อกปัจจุบัน
                        </th>

                        <th class="text-right">
                            จุดแจ้งเตือน
                        </th>

                        <th class="text-right">
                            ต้นทุนต่อหน่วย
                        </th>

                        <th class="text-right">
                            มูลค่าสต๊อก
                        </th>

                        <th class="text-center">
                            สถานะ
                        </th>

                        <th class="text-center col-actions">
                            จัดการ
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${list.map(
                        (
                            ingredient,
                            index
                        ) => {

                            const status =
                                getStockStatus(
                                    ingredient
                                )


                            const stock =
                                Number(
                                    ingredient.current_stock ||
                                    0
                                )


                            const minStock =
                                Number(
                                    ingredient.min_stock ||
                                    0
                                )


                            const cost =
                                Number(
                                    ingredient.cost_per_unit ||
                                    0
                                )


                            const stockValue =
                                stock * cost


                            let rowClass =
                                ''


                            if (
                                status.key ===
                                'low'
                            ) {

                                rowClass =
                                    'row-low'
                            }


                            if (
                                status.key ===
                                'out'
                            ) {

                                rowClass =
                                    'row-out'
                            }


                            if (
                                status.key ===
                                'inactive'
                            ) {

                                rowClass =
                                    'row-inactive'
                            }


                            return `

                                <tr class="${rowClass}">

                                    <td
                                        class="
                                            col-number
                                            text-center
                                        "
                                    >
                                        ${index + 1}
                                    </td>


                                    <td>

                                        <strong
                                            class="ingredient-table-name"
                                        >
                                            ${esc(
                                                ingredient.name
                                            )}
                                        </strong>

                                    </td>


                                    <td>
                                        ${esc(
                                            ingredient.unit
                                        )}
                                    </td>


                                    <td
                                        class="
                                            text-right
                                            stock-number
                                        "
                                    >
                                        ${number(
                                            stock
                                        )}
                                    </td>


                                    <td
                                        class="
                                            text-right
                                            warning-number
                                        "
                                    >
                                        ≤ ${number(
                                            minStock
                                        )}
                                    </td>


                                    <td class="text-right">
                                        ${money(
                                            cost
                                        )}
                                    </td>


                                    <td class="text-right">

                                        <strong>
                                            ${money(
                                                stockValue
                                            )}
                                        </strong>

                                    </td>


                                    <td class="text-center">

                                        <span
                                            class="
                                                status-badge
                                                ${status.className}
                                            "
                                        >
                                            ${status.text}
                                        </span>

                                    </td>


                                    <td class="text-center">

                                        <div class="table-actions">

                                            <button
                                                type="button"
                                                class="
                                                    table-action-btn
                                                    edit
                                                "
                                                data-action="edit"
                                                data-id="${esc(
                                                    ingredient.id
                                                )}"
                                            >
                                                ✏️ แก้ไข
                                            </button>


                                            <button
                                                type="button"
                                                class="
                                                    table-action-btn
                                                    toggle
                                                "
                                                data-action="toggle"
                                                data-id="${esc(
                                                    ingredient.id
                                                )}"
                                            >
                                                ${
                                                    ingredient.is_active
                                                        ? '⏸ ปิดใช้งาน'
                                                        : '▶ เปิดใช้งาน'
                                                }
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            `
                        }
                    ).join('')}

                </tbody>

            </table>

        </div>


        <div class="ingredient-table-footer">

            แสดง

            <strong>
                ${list.length.toLocaleString(
                    'th-TH'
                )}
            </strong>

            รายการ

        </div>

    `
}


/* ========================================
   OPEN ADD
======================================== */

function openAddIngredient() {
    el.modalTitle.textContent =
        'เพิ่มวัตถุดิบ'


    el.ingredientForm.reset()


    el.ingredientId.value =
        ''


    el.ingredientCost.value =
        '0'


    el.ingredientStock.value =
        '0'


    el.ingredientMinStock.value =
        '0'


    el.ingredientActive.checked =
        true


    message(
        el.formMessage,
        ''
    )


    el.ingredientModal
        .classList
        .add('show')


    el.ingredientModal
        .setAttribute(
            'aria-hidden',
            'false'
        )


    setTimeout(
        () => {
            el.ingredientName.focus()
        },
        50
    )
}


/* ========================================
   OPEN EDIT
======================================== */

function openEditIngredient(
    ingredientId
) {
    const ingredient =
        state.ingredients.find(
            item =>
                item.id ===
                ingredientId
        )


    if (!ingredient) {
        return
    }


    el.modalTitle.textContent =
        'แก้ไขวัตถุดิบ'


    el.ingredientId.value =
        ingredient.id


    el.ingredientName.value =
        ingredient.name || ''


    el.ingredientUnit.value =
        ingredient.unit || ''


    el.ingredientCost.value =
        Number(
            ingredient.cost_per_unit ||
            0
        )


    el.ingredientStock.value =
        Number(
            ingredient.current_stock ||
            0
        )


    el.ingredientMinStock.value =
        Number(
            ingredient.min_stock ||
            0
        )


    el.ingredientActive.checked =
        ingredient.is_active !==
        false


    message(
        el.formMessage,
        ''
    )


    el.ingredientModal
        .classList
        .add('show')


    el.ingredientModal
        .setAttribute(
            'aria-hidden',
            'false'
        )
}


/* ========================================
   CLOSE MODAL
======================================== */

function closeModal() {
    el.ingredientModal
        .classList
        .remove('show')


    el.ingredientModal
        .setAttribute(
            'aria-hidden',
            'true'
        )


    message(
        el.formMessage,
        ''
    )
}


/* ========================================
   SAVE
======================================== */

async function saveIngredient(
    event
) {
    event.preventDefault()


    const id =
        el.ingredientId.value


    const name =
        el.ingredientName.value
            .trim()


    const unit =
        el.ingredientUnit.value


    const cost =
        Number(
            el.ingredientCost.value ||
            0
        )


    const stock =
        Number(
            el.ingredientStock.value ||
            0
        )


    const minStock =
        Number(
            el.ingredientMinStock.value ||
            0
        )


    const isActive =
        el.ingredientActive.checked


    if (!name) {
        message(
            el.formMessage,
            'กรุณากรอกชื่อวัตถุดิบ'
        )

        return
    }


    if (!unit) {
        message(
            el.formMessage,
            'กรุณาเลือกหน่วยนับ'
        )

        return
    }


    if (
        cost < 0
        ||
        stock < 0
        ||
        minStock < 0
    ) {
        message(
            el.formMessage,
            'จำนวนและต้นทุนต้องไม่ติดลบ'
        )

        return
    }


    const duplicate =
        state.ingredients.find(
            item =>
                item.name
                    ?.trim()
                    .toLowerCase()
                ===
                name.toLowerCase()

                &&

                item.id !== id
        )


    if (duplicate) {
        message(
            el.formMessage,
            'มีวัตถุดิบชื่อนี้อยู่แล้ว'
        )

        return
    }


    el.saveIngredientBtn.disabled =
        true


    el.saveIngredientBtn.textContent =
        'กำลังบันทึก...'


    try {
        const payload = {
            branch_id:
                state.profile.branch_id,

            name:
                name,

            unit:
                unit,

            cost_per_unit:
                cost,

            current_stock:
                stock,

            min_stock:
                minStock,

            is_active:
                isActive,

            updated_at:
                new Date()
                    .toISOString()
        }


        if (id) {
            const {
                error
            } =
                await supabase
                    .from('ingredients')
                    .update({
                        name:
                            payload.name,

                        unit:
                            payload.unit,

                        cost_per_unit:
                            payload.cost_per_unit,

                        current_stock:
                            payload.current_stock,

                        min_stock:
                            payload.min_stock,

                        is_active:
                            payload.is_active,

                        updated_at:
                            payload.updated_at
                    })
                    .eq(
                        'id',
                        id
                    )
                    .eq(
                        'branch_id',
                        state.profile.branch_id
                    )


            if (error) {
                throw error
            }

        } else {
            const {
                error
            } =
                await supabase
                    .from('ingredients')
                    .insert(
                        payload
                    )


            if (error) {
                throw error
            }
        }


        closeModal()


        await loadIngredients()


        message(
            el.pageMessage,

            id
                ? 'แก้ไขวัตถุดิบสำเร็จ'
                : 'เพิ่มวัตถุดิบสำเร็จ',

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
            'Save ingredient error:',
            error
        )


        message(
            el.formMessage,
            error.message ||
            'บันทึกวัตถุดิบไม่สำเร็จ'
        )

    } finally {
        el.saveIngredientBtn.disabled =
            false


        el.saveIngredientBtn.textContent =
            id
                ? 'บันทึกการแก้ไข'
                : 'บันทึกวัตถุดิบ'
    }
}


/* ========================================
   TOGGLE
======================================== */

async function toggleIngredient(
    ingredientId
) {
    const ingredient =
        state.ingredients.find(
            item =>
                item.id ===
                ingredientId
        )


    if (!ingredient) {
        return
    }


    const newStatus =
        !ingredient.is_active


    if (
        !confirm(
            `${newStatus
                ? 'เปิดใช้งาน'
                : 'ปิดใช้งาน'
            } "${ingredient.name}" หรือไม่?`
        )
    ) {
        return
    }


    try {
        const {
            error
        } =
            await supabase
                .from('ingredients')
                .update({
                    is_active:
                        newStatus,

                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    'id',
                    ingredient.id
                )
                .eq(
                    'branch_id',
                    state.profile.branch_id
                )


        if (error) {
            throw error
        }


        await loadIngredients()


        message(
            el.pageMessage,
            'เปลี่ยนสถานะสำเร็จ',
            'success'
        )


    } catch (error) {
        console.error(
            'Toggle ingredient error:',
            error
        )


        message(
            el.pageMessage,
            error.message ||
            'เปลี่ยนสถานะไม่สำเร็จ'
        )
    }
}


/* ========================================
   LOGOUT
======================================== */

async function logout() {
    await supabase.auth.signOut()

    location.replace(
        './index.html'
    )
}


/* ========================================
   INIT
======================================== */

async function init() {

    try {

        /*
         * ROLE GUARD
         *
         * Admin   = เข้าได้
         * Manager = เข้าได้
         * Staff   = เข้าไม่ได้
         */
        const guard =
            await applyRoleGuard()

        if (!guard) {
            return
        }


        /*
         * ตรวจสอบ Session
         */
        const session =
            await requireSession()

        if (!session) {
            return
        }


        /*
         * โหลด Profile ผู้ใช้งาน
         */
        await loadProfile(
            session.user.id
        )


        /*
         * โหลดข้อมูลสาขา
         */
        await loadBranch()


        /*
         * โหลดรายการวัตถุดิบ
         */
        await loadIngredients()


    } catch (error) {

        console.error(
            'Ingredients init error:',
            error
        )

        message(
            el.pageMessage,
            error.message ||
            'โหลดข้อมูลวัตถุดิบไม่สำเร็จ'
        )
    }
}

/* ========================================
   EVENTS
======================================== */

el.logoutBtn.onclick =
    logout


el.addIngredientBtn.onclick =
    openAddIngredient


el.closeModalBtn.onclick =
    closeModal


el.cancelBtn.onclick =
    closeModal


el.ingredientForm.onsubmit =
    saveIngredient


el.searchInput.oninput =
    applyFilters


el.stockFilter.onchange =
    applyFilters


el.ingredientList.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-action]'
            )


        if (!button) {
            return
        }


        const action =
            button.dataset.action


        const id =
            button.dataset.id


        if (
            action === 'edit'
        ) {
            openEditIngredient(
                id
            )
        }


        if (
            action === 'toggle'
        ) {
            toggleIngredient(
                id
            )
        }
    }


el.ingredientModal.onclick =
    event => {

        if (
            event.target
                .classList
                .contains(
                    'modal-backdrop'
                )
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
            event === 'SIGNED_OUT'
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
