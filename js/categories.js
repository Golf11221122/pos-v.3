import { supabase } from './supabase.js'


const state = {
    session: null,
    profile: null,
    branch: null,

    categories: [],
    filteredCategories: []
}


const $ = id =>
    document.getElementById(id)


const el = {
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),

    branchText: $('branchText'),
    userName: $('userName'),

    addCategoryBtn: $('addCategoryBtn'),

    totalCategoryCount:
        $('totalCategoryCount'),

    activeCategoryCount:
        $('activeCategoryCount'),

    inactiveCategoryCount:
        $('inactiveCategoryCount'),

    searchInput:
        $('searchInput'),

    statusFilter:
        $('statusFilter'),

    refreshBtn:
        $('refreshBtn'),

    resultCount:
        $('resultCount'),

    loadingState:
        $('loadingState'),

    emptyState:
        $('emptyState'),

    tableWrap:
        $('tableWrap'),

    categoryTableBody:
        $('categoryTableBody'),

    pageMessage:
        $('pageMessage'),

    categoryModal:
        $('categoryModal'),

    modalTitle:
        $('modalTitle'),

    closeModalBtn:
        $('closeModalBtn'),

    cancelBtn:
        $('cancelBtn'),

    categoryForm:
        $('categoryForm'),

    categoryId:
        $('categoryId'),

    categoryName:
        $('categoryName'),

    displayOrder:
        $('displayOrder'),

    categoryActive:
        $('categoryActive'),

    formMessage:
        $('formMessage'),

    saveCategoryBtn:
        $('saveCategoryBtn')
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


function message(
    target,
    text = '',
    type = 'error'
) {
    if (!target) {
        return
    }

    target.textContent = text

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
}


/* ========================================
   USER
======================================== */

function renderUser() {
    const name =
        state.profile.full_name
        ||
        state.session.user.email
            ?.split('@')[0]
        ||
        'ผู้ใช้งาน'


    el.userName.textContent =
        name


    el.branchText.textContent =
        `สาขา: ${state.branch.name}`
}


/* ========================================
   LOAD CATEGORIES
======================================== */

async function loadCategories() {
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
                .from('categories')
                .select(`
                    id,
                    branch_id,
                    name,
                    display_order,
                    is_active
                `)
                .eq(
                    'branch_id',
                    state.profile.branch_id
                )
                .order(
                    'display_order',
                    {
                        ascending: true
                    }
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


        state.categories =
            data || []


        applyFilters()
        renderSummary()

    } catch (error) {
        console.error(
            'Load categories error:',
            error
        )

        message(
            el.pageMessage,
            error.message ||
            'โหลดหมวดหมู่ไม่สำเร็จ'
        )

    } finally {
        el.loadingState
            .classList
            .add('hidden')
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


    const status =
        el.statusFilter.value


    state.filteredCategories =
        state.categories.filter(
            category => {

                const searchMatch =
                    !keyword
                    ||
                    String(
                        category.name || ''
                    )
                        .toLowerCase()
                        .includes(keyword)


                let statusMatch =
                    true


                if (
                    status === 'active'
                ) {
                    statusMatch =
                        category.is_active ===
                        true
                }


                if (
                    status === 'inactive'
                ) {
                    statusMatch =
                        category.is_active ===
                        false
                }


                return (
                    searchMatch
                    &&
                    statusMatch
                )
            }
        )


    renderCategories()
}


/* ========================================
   SUMMARY
======================================== */

function renderSummary() {
    const total =
        state.categories.length


    const active =
        state.categories.filter(
            item =>
                item.is_active === true
        ).length


    const inactive =
        total - active


    el.totalCategoryCount.textContent =
        total.toLocaleString(
            'th-TH'
        )


    el.activeCategoryCount.textContent =
        active.toLocaleString(
            'th-TH'
        )


    el.inactiveCategoryCount.textContent =
        inactive.toLocaleString(
            'th-TH'
        )
}


/* ========================================
   RENDER TABLE
======================================== */

function renderCategories() {
    const list =
        state.filteredCategories


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


    el.categoryTableBody.innerHTML =
        list.map(category => {

            const active =
                category.is_active ===
                true


            return `
                <tr>

                    <td>

                        <span
                            class="order-badge"
                        >
                            ${Number(
                category.display_order ||
                0
            )
                }
                        </span>

                    </td>


                    <td>

                        <span
                            class="category-name"
                        >
                            ${esc(category.name)}
                        </span>

                    </td>


                    <td>

                        <span
                            class="
                                badge
                                ${active
                    ? 'badge-active'
                    : 'badge-inactive'
                }
                            "
                        >
                            ${active
                    ? 'เปิดใช้งาน'
                    : 'ปิดใช้งาน'
                }
                        </span>

                    </td>


                    <td>

                        <div
                            class="action-buttons"
                        >

                            <button
                                type="button"
                                class="action-button"
                                data-action="edit"
                                data-id="${esc(category.id)}"
                            >
                                ✏️ แก้ไข
                            </button>


                            <button
                                type="button"
                                class="action-button"
                                data-action="toggle"
                                data-id="${esc(category.id)}"
                            >
                                ${active
                    ? '⏸ ปิด'
                    : '▶ เปิด'
                }
                            </button>

                        </div>

                    </td>

                </tr>
            `

        }).join('')
}


/* ========================================
   OPEN ADD
======================================== */

function openAddCategory() {
    el.modalTitle.textContent =
        'เพิ่มหมวดหมู่'


    el.categoryId.value =
        ''


    el.categoryName.value =
        ''


    const nextOrder =
        state.categories.length
            ? Math.max(
                ...state.categories.map(
                    item =>
                        Number(
                            item.display_order ||
                            0
                        )
                )
            ) + 1
            : 1


    el.displayOrder.value =
        String(nextOrder)


    el.categoryActive.checked =
        true


    message(
        el.formMessage,
        ''
    )


    el.categoryModal
        .classList
        .remove('hidden')


    setTimeout(
        () => {
            el.categoryName.focus()
        },
        50
    )
}


/* ========================================
   OPEN EDIT
======================================== */

function openEditCategory(
    categoryId
) {
    const category =
        state.categories.find(
            item =>
                item.id ===
                categoryId
        )


    if (!category) {
        return
    }


    el.modalTitle.textContent =
        'แก้ไขหมวดหมู่'


    el.categoryId.value =
        category.id


    el.categoryName.value =
        category.name || ''


    el.displayOrder.value =
        Number(
            category.display_order ||
            0
        )


    el.categoryActive.checked =
        category.is_active ===
        true


    message(
        el.formMessage,
        ''
    )


    el.categoryModal
        .classList
        .remove('hidden')
}


/* ========================================
   CLOSE MODAL
======================================== */

function closeModal() {
    el.categoryModal
        .classList
        .add('hidden')


    el.categoryForm.reset()


    el.categoryId.value =
        ''


    message(
        el.formMessage,
        ''
    )
}


/* ========================================
   SAVE CATEGORY
======================================== */

async function saveCategory(
    event
) {
    event.preventDefault()


    const id =
        el.categoryId.value


    const name =
        el.categoryName.value
            .trim()


    const displayOrder =
        Number(
            el.displayOrder.value ||
            0
        )


    const isActive =
        el.categoryActive.checked


    if (!name) {
        message(
            el.formMessage,
            'กรุณากรอกชื่อหมวดหมู่'
        )

        el.categoryName.focus()

        return
    }


    if (
        !Number.isFinite(
            displayOrder
        )
        ||
        displayOrder < 0
    ) {
        message(
            el.formMessage,
            'ลำดับการแสดงผลไม่ถูกต้อง'
        )

        return
    }


    const duplicate =
        state.categories.find(
            category =>

                category.name
                    ?.trim()
                    .toLowerCase()
                ===
                name.toLowerCase()

                &&

                category.id !== id
        )


    if (duplicate) {
        message(
            el.formMessage,
            'มีชื่อหมวดหมู่นี้อยู่แล้ว'
        )

        return
    }


    el.saveCategoryBtn.disabled =
        true


    el.saveCategoryBtn.textContent =
        'กำลังบันทึก...'


    try {
        const payload = {
            name:
                name,

            branch_id:
                state.profile.branch_id,

            display_order:
                displayOrder,

            is_active:
                isActive
        }


        if (id) {
            const {
                error
            } =
                await supabase
                    .from('categories')
                    .update({
                        name:
                            payload.name,

                        display_order:
                            payload.display_order,

                        is_active:
                            payload.is_active
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
                    .from('categories')
                    .insert(
                        payload
                    )


            if (error) {
                throw error
            }
        }


        closeModal()


        await loadCategories()


        message(
            el.pageMessage,
            id
                ? 'แก้ไขหมวดหมู่สำเร็จ'
                : 'เพิ่มหมวดหมู่สำเร็จ',
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
            'Save category error:',
            error
        )


        let text =
            error.message ||
            'บันทึกหมวดหมู่ไม่สำเร็จ'


        if (
            error.code ===
            '23505'
        ) {
            text =
                'มีหมวดหมู่นี้อยู่แล้ว'
        }


        message(
            el.formMessage,
            text
        )

    } finally {
        el.saveCategoryBtn.disabled =
            false


        el.saveCategoryBtn.textContent =
            id
                ? 'บันทึกการแก้ไข'
                : 'บันทึกหมวดหมู่'
    }
}


/* ========================================
   TOGGLE ACTIVE
======================================== */

async function toggleCategory(
    categoryId
) {
    const category =
        state.categories.find(
            item =>
                item.id ===
                categoryId
        )


    if (!category) {
        return
    }


    const newStatus =
        !category.is_active


    const text =
        newStatus
            ? 'เปิดใช้งาน'
            : 'ปิดใช้งาน'


    if (
        !confirm(
            `${text}หมวดหมู่ "${category.name}" หรือไม่?`
        )
    ) {
        return
    }


    try {
        const {
            error
        } =
            await supabase
                .from('categories')
                .update({
                    is_active:
                        newStatus
                })
                .eq(
                    'id',
                    category.id
                )
                .eq(
                    'branch_id',
                    state.profile.branch_id
                )


        if (error) {
            throw error
        }


        await loadCategories()


        message(
            el.pageMessage,
            `${text}หมวดหมู่สำเร็จ`,
            'success'
        )


        setTimeout(
            () => {
                message(
                    el.pageMessage,
                    ''
                )
            },
            2000
        )

    } catch (error) {
        console.error(
            'Toggle category error:',
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


        await loadCategories()

    } catch (error) {
        console.error(
            'Categories init error:',
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


/* ========================================
   EVENTS
======================================== */

el.backBtn.onclick =
    () => {
        location.href =
            './dashboard.html'
    }


el.logoutBtn.onclick =
    logout


el.addCategoryBtn.onclick =
    openAddCategory


el.closeModalBtn.onclick =
    closeModal


el.cancelBtn.onclick =
    closeModal


el.categoryForm.onsubmit =
    saveCategory


el.searchInput.oninput =
    applyFilters


el.statusFilter.onchange =
    applyFilters


el.refreshBtn.onclick =
    loadCategories


el.categoryTableBody.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-action]'
            )


        if (!button) {
            return
        }


        const id =
            button.dataset.id


        const action =
            button.dataset.action


        if (
            action === 'edit'
        ) {
            openEditCategory(id)
        }


        if (
            action === 'toggle'
        ) {
            toggleCategory(id)
        }
    }


el.categoryModal.onclick =
    event => {

        if (
            event.target ===
            el.categoryModal
        ) {
            closeModal()
        }
    }


document.addEventListener(
    'keydown',
    event => {

        if (
            event.key === 'Escape'
            &&
            !el.categoryModal
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