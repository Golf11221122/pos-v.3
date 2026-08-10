import { supabase } from './supabase.js'


/* ========================================
   STATE
======================================== */

const state = {
    session: null,
    profile: null,
    branch: null,

    employees: [],
    filteredEmployees: [],

    selectedEmployee: null
}


/* ========================================
   ELEMENTS
======================================== */

const $ = id =>
    document.getElementById(id)


const el = {

    // HEADER
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),

    branchText: $('branchText'),
    userName: $('userName'),


    // SUMMARY
    summaryAll: $('summaryAll'),
    summaryManagers: $('summaryManagers'),
    summaryStaff: $('summaryStaff'),
    summaryInactive: $('summaryInactive'),


    // FILTER
    searchInput: $('searchInput'),
    roleFilter: $('roleFilter'),
    statusFilter: $('statusFilter'),

    clearFilterBtn: $('clearFilterBtn'),
    refreshBtn: $('refreshBtn'),


    // TABLE
    resultCount: $('resultCount'),
    loadingState: $('loadingState'),
    emptyState: $('emptyState'),

    employeeTableWrap: $('employeeTableWrap'),
    employeeTableBody: $('employeeTableBody'),


    // =====================================
    // ADD EMPLOYEE
    // =====================================

    addEmployeeBtn: $('addEmployeeBtn'),

    addEmployeeModal: $('addEmployeeModal'),

    closeAddEmployeeBtn:
        $('closeAddEmployeeBtn'),

    cancelAddEmployeeBtn:
        $('cancelAddEmployeeBtn'),

    addFullName:
        $('addFullName'),

    addEmail:
        $('addEmail'),

    addPassword:
        $('addPassword'),

    addRole:
        $('addRole'),

    addManagerPinWrap:
        $('addManagerPinWrap'),

    addManagerPin:
        $('addManagerPin'),

    addEmployeeMessage:
        $('addEmployeeMessage'),

    saveNewEmployeeBtn:
        $('saveNewEmployeeBtn'),


    // =====================================
    // EDIT EMPLOYEE
    // =====================================

    editModal:
        $('editModal'),

    editUserId:
        $('editUserId'),

    closeEditBtn:
        $('closeEditBtn'),

    cancelEditBtn:
        $('cancelEditBtn'),

    editFullName:
        $('editFullName'),

    editRole:
        $('editRole'),

    editIsActive:
        $('editIsActive'),

    editMessage:
        $('editMessage'),

    saveEmployeeBtn:
        $('saveEmployeeBtn'),


    // =====================================
    // MANAGER PIN
    // =====================================

    pinModal:
        $('pinModal'),

    pinEmployeeName:
        $('pinEmployeeName'),

    closePinBtn:
        $('closePinBtn'),

    cancelPinBtn:
        $('cancelPinBtn'),

    managerPinInput:
        $('managerPinInput'),

    managerPinConfirm:
        $('managerPinConfirm'),

    pinMessage:
        $('pinMessage'),

    savePinBtn:
        $('savePinBtn')
}


/* ========================================
   HELPERS
======================================== */

function esc(value) {

    return String(
        value ?? ''
    )
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
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


function roleLabel(role) {

    if (
        role ===
        'admin'
    ) {
        return 'Admin'
    }

    if (
        role ===
        'manager'
    ) {
        return 'Manager'
    }

    if (
        role ===
        'staff'
    ) {
        return 'Staff'
    }

    return role || '-'
}


function roleClass(role) {

    if (
        role ===
        'admin'
    ) {
        return 'badge-admin'
    }

    if (
        role ===
        'manager'
    ) {
        return 'badge-manager'
    }

    return 'badge-staff'
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
            .select(`
                id,
                full_name,
                role,
                is_active,
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


    if (
        data.role !==
        'admin'
    ) {

        throw new Error(
            'เฉพาะ Admin เท่านั้นที่สามารถจัดการพนักงานได้'
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
   HEADER
======================================== */

function renderUser() {

    el.userName.textContent =
        state.profile.full_name
        ||
        state.session.user.email
            .split('@')[0]


    el.branchText.textContent =
        `สาขา: ${state.branch.name}`
}


/* ========================================
   LOAD EMPLOYEES
======================================== */

async function loadEmployees() {

    el.loadingState
        .classList
        .remove(
            'hidden'
        )


    el.emptyState
        .classList
        .add(
            'hidden'
        )


    el.employeeTableWrap
        .classList
        .add(
            'hidden'
        )


    try {

        const {
            data,
            error
        } =
            await supabase
                .from(
                    'profiles'
                )
                .select(`
                    id,
                    full_name,
                    role,
                    is_active,
                    branch_id,
                    created_at
                `)
                .eq(
                    'branch_id',
                    state.profile.branch_id
                )
                .order(
                    'created_at',
                    {
                        ascending: true
                    }
                )


        if (error) {
            throw error
        }


        state.employees =
            data || []


        applyFilters()


    } catch (error) {

        console.error(
            'Load employees error:',
            error
        )


        el.emptyState.textContent =
            error.message
            ||
            'โหลดข้อมูลพนักงานไม่สำเร็จ'


        el.emptyState
            .classList
            .remove(
                'hidden'
            )


    } finally {

        el.loadingState
            .classList
            .add(
                'hidden'
            )
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


    const role =
        el.roleFilter.value


    const status =
        el.statusFilter.value


    state.filteredEmployees =
        state.employees
            .filter(
                employee => {

                    const name =
                        String(
                            employee.full_name
                            ||
                            ''
                        )
                            .toLowerCase()


                    const keywordMatch =
                        !keyword
                        ||
                        name.includes(
                            keyword
                        )


                    const roleMatch =
                        !role
                        ||
                        employee.role ===
                        role


                    let statusMatch =
                        true


                    if (
                        status ===
                        'active'
                    ) {

                        statusMatch =
                            employee.is_active
                            !==
                            false
                    }


                    if (
                        status ===
                        'inactive'
                    ) {

                        statusMatch =
                            employee.is_active
                            ===
                            false
                    }


                    return (
                        keywordMatch
                        &&
                        roleMatch
                        &&
                        statusMatch
                    )
                }
            )


    renderEmployees()

    renderSummary()
}


/* ========================================
   SUMMARY
======================================== */

function renderSummary() {

    const list =
        state.employees


    const managers =
        list.filter(
            employee =>
                employee.role ===
                'manager'
        )


    const staff =
        list.filter(
            employee =>
                employee.role ===
                'staff'
        )


    const inactive =
        list.filter(
            employee =>
                employee.is_active ===
                false
        )


    el.summaryAll.textContent =
        list.length
            .toLocaleString(
                'th-TH'
            )


    el.summaryManagers.textContent =
        managers.length
            .toLocaleString(
                'th-TH'
            )


    el.summaryStaff.textContent =
        staff.length
            .toLocaleString(
                'th-TH'
            )


    el.summaryInactive.textContent =
        inactive.length
            .toLocaleString(
                'th-TH'
            )
}


/* ========================================
   EMPLOYEE TABLE
======================================== */

function renderEmployees() {

    const list =
        state.filteredEmployees


    el.resultCount.textContent =
        `${list.length.toLocaleString(
            'th-TH'
        )} รายการ`


    if (!list.length) {

        el.emptyState.textContent =
            'ไม่พบพนักงาน'


        el.emptyState
            .classList
            .remove(
                'hidden'
            )


        el.employeeTableWrap
            .classList
            .add(
                'hidden'
            )


        return
    }


    el.emptyState
        .classList
        .add(
            'hidden'
        )


    el.employeeTableWrap
        .classList
        .remove(
            'hidden'
        )


    el.employeeTableBody.innerHTML =
        list.map(
            employee => {

                const isSelf =
                    employee.id ===
                    state.profile.id


                const active =
                    employee.is_active
                    !==
                    false


                const pinText =
                    employee.role ===
                    'manager'
                        ? 'ตั้ง PIN ได้'
                        : '-'


                return `

                    <tr>

                        <td>

                            <span
                                class="employee-name"
                            >

                                ${
                                    esc(
                                        employee.full_name
                                        ||
                                        'ยังไม่ได้ระบุชื่อ'
                                    )
                                }

                            </span>


                            <small
                                class="employee-id"
                            >

                                ${
                                    esc(
                                        employee.id
                                    )
                                }

                            </small>

                        </td>


                        <td>

                            <span
                                class="
                                    badge
                                    ${
                                        roleClass(
                                            employee.role
                                        )
                                    }
                                "
                            >

                                ${
                                    roleLabel(
                                        employee.role
                                    )
                                }

                            </span>

                        </td>


                        <td>

                            <span
                                class="
                                    badge
                                    ${
                                        active
                                            ? 'badge-active'
                                            : 'badge-inactive'
                                    }
                                "
                            >

                                ${
                                    active
                                        ? 'เปิดใช้งาน'
                                        : 'ปิดใช้งาน'
                                }

                            </span>

                        </td>


                        <td>

                            <span
                                class="
                                    badge
                                    ${
                                        employee.role
                                        ===
                                        'manager'
                                            ? 'badge-pin'
                                            : 'badge-no-pin'
                                    }
                                "
                            >

                                ${pinText}

                            </span>

                        </td>


                        <td>

                            <div
                                class="row-actions"
                            >

                                ${
                                    employee.role
                                    ===
                                    'manager'
                                    &&
                                    !isSelf

                                        ? `

                                            <button
                                                type="button"
                                                class="
                                                    action-btn
                                                    pin
                                                "
                                                data-pin-id="${
                                                    esc(
                                                        employee.id
                                                    )
                                                }"
                                            >
                                                ตั้ง PIN
                                            </button>

                                        `

                                        : ''
                                }


                                ${
                                    !isSelf

                                        ? `

                                            <button
                                                type="button"
                                                class="action-btn"
                                                data-edit-id="${
                                                    esc(
                                                        employee.id
                                                    )
                                                }"
                                            >
                                                แก้ไข
                                            </button>

                                        `

                                        : `

                                            <span
                                                style="
                                                    color:#999;
                                                    font-size:12px;
                                                "
                                            >
                                                บัญชีของคุณ
                                            </span>

                                        `
                                }

                            </div>

                        </td>

                    </tr>

                `
            }
        )
        .join('')
}


/* ========================================
   OPEN EDIT EMPLOYEE
======================================== */

function openEditModal(
    employeeId
) {

    const employee =
        state.employees
            .find(
                item =>
                    item.id ===
                    employeeId
            )


    if (!employee) {
        return
    }


    if (
        employee.id ===
        state.profile.id
    ) {

        alert(
            'ไม่สามารถแก้ไขบัญชี Admin ของตัวเองจากหน้านี้ได้'
        )

        return
    }


    state.selectedEmployee =
        employee


    el.editUserId.textContent =
        employee.id


    el.editFullName.value =
        employee.full_name
        ||
        ''


    el.editRole.value =
        employee.role ===
        'manager'
            ? 'manager'
            : 'staff'


    el.editIsActive.checked =
        employee.is_active
        !==
        false


    message(
        el.editMessage,
        ''
    )


    el.editModal
        .classList
        .remove(
            'hidden'
        )


    setTimeout(
        () => {

            el.editFullName
                .focus()

        },
        100
    )
}


/* ========================================
   CLOSE EDIT
======================================== */

function closeEditModal() {

    el.editModal
        .classList
        .add(
            'hidden'
        )


    state.selectedEmployee =
        null


    message(
        el.editMessage,
        ''
    )
}


/* ========================================
   SAVE EMPLOYEE
======================================== */

async function saveEmployee() {

    const employee =
        state.selectedEmployee


    if (!employee) {
        return
    }


    const fullName =
        el.editFullName.value
            .trim()


    const role =
        el.editRole.value


    const isActive =
        el.editIsActive.checked


    if (!fullName) {

        message(
            el.editMessage,
            'กรุณากรอกชื่อพนักงาน'
        )


        el.editFullName
            .focus()


        return
    }


    if (
        ![
            'staff',
            'manager'
        ].includes(
            role
        )
    ) {

        message(
            el.editMessage,
            'ตำแหน่งไม่ถูกต้อง'
        )


        return
    }


    el.saveEmployeeBtn.disabled =
        true


    el.saveEmployeeBtn.textContent =
        'กำลังบันทึก...'


    message(
        el.editMessage,
        ''
    )


    try {

        const {
            data,
            error
        } =
            await supabase.rpc(
                'admin_update_staff',
                {

                    p_user_id:
                        employee.id,

                    p_full_name:
                        fullName,

                    p_role:
                        role,

                    p_is_active:
                        isActive
                }
            )


        if (error) {
            throw error
        }


        console.log(
            'Update employee:',
            data
        )


        closeEditModal()


        await loadEmployees()


        alert(
            'บันทึกข้อมูลพนักงานสำเร็จ'
        )


    } catch (error) {

        console.error(
            'Update employee error:',
            error
        )


        let text =
            error.message
            ||
            'บันทึกข้อมูลไม่สำเร็จ'


        if (
            text.includes(
                'ADMIN_REQUIRED'
            )
        ) {

            text =
                'เฉพาะ Admin เท่านั้นที่สามารถแก้ไขพนักงานได้'
        }


        if (
            text.includes(
                'INVALID_ROLE'
            )
        ) {

            text =
                'ตำแหน่งไม่ถูกต้อง'
        }


        if (
            text.includes(
                'CANNOT_EDIT_SELF'
            )
        ) {

            text =
                'ไม่สามารถแก้ไขบัญชีตัวเองจากหน้านี้ได้'
        }


        if (
            text.includes(
                'USER_NOT_FOUND'
            )
        ) {

            text =
                'ไม่พบพนักงาน'
        }


        if (
            text.includes(
                'BRANCH_NOT_ALLOWED'
            )
        ) {

            text =
                'ไม่สามารถแก้ไขพนักงานต่างสาขาได้'
        }


        message(
            el.editMessage,
            text
        )


    } finally {

        el.saveEmployeeBtn.disabled =
            false


        el.saveEmployeeBtn.textContent =
            'บันทึก'
    }
}


/* ========================================
   OPEN MANAGER PIN
======================================== */

function openPinModal(
    employeeId
) {

    const employee =
        state.employees
            .find(
                item =>
                    item.id ===
                    employeeId
            )


    if (!employee) {
        return
    }


    if (
        employee.role !==
        'manager'
    ) {

        alert(
            'สามารถตั้ง PIN ได้เฉพาะ Manager'
        )

        return
    }


    state.selectedEmployee =
        employee


    el.pinEmployeeName.textContent =
        employee.full_name
        ||
        employee.id


    el.managerPinInput.value =
        ''


    el.managerPinConfirm.value =
        ''


    message(
        el.pinMessage,
        ''
    )


    el.pinModal
        .classList
        .remove(
            'hidden'
        )


    setTimeout(
        () => {

            el.managerPinInput
                .focus()

        },
        100
    )
}


/* ========================================
   CLOSE PIN
======================================== */

function closePinModal() {

    el.pinModal
        .classList
        .add(
            'hidden'
        )


    state.selectedEmployee =
        null


    el.managerPinInput.value =
        ''


    el.managerPinConfirm.value =
        ''


    message(
        el.pinMessage,
        ''
    )
}


/* ========================================
   SAVE MANAGER PIN
======================================== */

async function saveManagerPin() {

    const employee =
        state.selectedEmployee


    if (!employee) {
        return
    }


    const pin =
        el.managerPinInput.value
            .trim()


    const confirmPin =
        el.managerPinConfirm.value
            .trim()


    if (
        !/^\d{6}$/.test(
            pin
        )
    ) {

        message(
            el.pinMessage,
            'PIN ต้องเป็นตัวเลข 6 หลัก'
        )


        el.managerPinInput
            .focus()


        return
    }


    if (
        pin !==
        confirmPin
    ) {

        message(
            el.pinMessage,
            'PIN ทั้งสองช่องไม่ตรงกัน'
        )


        el.managerPinConfirm
            .focus()


        return
    }


    el.savePinBtn.disabled =
        true


    el.savePinBtn.textContent =
        'กำลังบันทึก...'


    message(
        el.pinMessage,
        ''
    )


    try {

        const {
            data,
            error
        } =
            await supabase.rpc(
                'admin_set_manager_pin',
                {

                    p_user_id:
                        employee.id,

                    p_manager_pin:
                        pin
                }
            )


        if (error) {
            throw error
        }


        console.log(
            'Set manager PIN:',
            data
        )


        closePinModal()


        alert(
            'ตั้ง PIN Manager สำเร็จ'
        )


    } catch (error) {

        console.error(
            'Set manager PIN error:',
            error
        )


        let text =
            error.message
            ||
            'ตั้ง PIN ไม่สำเร็จ'


        if (
            text.includes(
                'ADMIN_REQUIRED'
            )
        ) {

            text =
                'เฉพาะ Admin เท่านั้นที่ตั้ง PIN ได้'
        }


        if (
            text.includes(
                'INVALID_PIN_FORMAT'
            )
        ) {

            text =
                'PIN ต้องเป็นตัวเลข 6 หลัก'
        }


        if (
            text.includes(
                'CANNOT_EDIT_SELF'
            )
        ) {

            text =
                'ไม่สามารถตั้ง PIN ให้บัญชีตัวเองจากหน้านี้ได้'
        }


        if (
            text.includes(
                'USER_NOT_FOUND'
            )
        ) {

            text =
                'ไม่พบ Manager'
        }


        if (
            text.includes(
                'BRANCH_NOT_ALLOWED'
            )
        ) {

            text =
                'ไม่สามารถตั้ง PIN ให้ Manager ต่างสาขาได้'
        }


        if (
            text.includes(
                'MANAGER_REQUIRED'
            )
        ) {

            text =
                'ผู้ใช้นี้ไม่ได้เป็น Manager'
        }


        message(
            el.pinMessage,
            text
        )


    } finally {

        el.savePinBtn.disabled =
            false


        el.savePinBtn.textContent =
            'บันทึก PIN'
    }
}


/* ========================================
   OPEN ADD EMPLOYEE
======================================== */

function openAddEmployeeModal() {

    el.addFullName.value =
        ''


    el.addEmail.value =
        ''


    el.addPassword.value =
        ''


    el.addRole.value =
        'staff'


    el.addManagerPin.value =
        ''


    el.addManagerPinWrap
        .classList
        .add(
            'hidden'
        )


    message(
        el.addEmployeeMessage,
        ''
    )


    el.addEmployeeModal
        .classList
        .remove(
            'hidden'
        )


    setTimeout(
        () => {

            el.addFullName
                .focus()

        },
        100
    )
}


/* ========================================
   CLOSE ADD EMPLOYEE
======================================== */

function closeAddEmployeeModal() {

    el.addEmployeeModal
        .classList
        .add(
            'hidden'
        )


    el.addFullName.value =
        ''


    el.addEmail.value =
        ''


    el.addPassword.value =
        ''


    el.addRole.value =
        'staff'


    el.addManagerPin.value =
        ''


    el.addManagerPinWrap
        .classList
        .add(
            'hidden'
        )


    message(
        el.addEmployeeMessage,
        ''
    )
}


/* ========================================
   ADD ROLE CHANGE
======================================== */

function handleAddRoleChange() {

    if (
        el.addRole.value ===
        'manager'
    ) {

        el.addManagerPinWrap
            .classList
            .remove(
                'hidden'
            )

    } else {

        el.addManagerPinWrap
            .classList
            .add(
                'hidden'
            )


        el.addManagerPin.value =
            ''
    }
}

/* ========================================
   CREATE NEW EMPLOYEE
======================================== */

async function createNewEmployee() {

    const fullName =
        el.addFullName.value
            .trim()

    const email =
        el.addEmail.value
            .trim()
            .toLowerCase()

    const password =
        el.addPassword.value

    const role =
        el.addRole.value

    const managerPin =
        el.addManagerPin.value
            .trim()


    /* =====================================
       VALIDATION
    ===================================== */

    if (!fullName) {

        message(
            el.addEmployeeMessage,
            'กรุณากรอกชื่อพนักงาน'
        )

        el.addFullName.focus()

        return
    }


    if (!email) {

        message(
            el.addEmployeeMessage,
            'กรุณากรอก Email'
        )

        el.addEmail.focus()

        return
    }


    if (
        !email.includes('@')
    ) {

        message(
            el.addEmployeeMessage,
            'รูปแบบ Email ไม่ถูกต้อง'
        )

        el.addEmail.focus()

        return
    }


    if (
        password.length <
        8
    ) {

        message(
            el.addEmployeeMessage,
            'Password ต้องมีอย่างน้อย 8 ตัวอักษร'
        )

        el.addPassword.focus()

        return
    }


    if (
        ![
            'staff',
            'manager'
        ].includes(
            role
        )
    ) {

        message(
            el.addEmployeeMessage,
            'ตำแหน่งไม่ถูกต้อง'
        )

        return
    }


    if (
        role ===
        'manager'
        &&
        !/^\d{6}$/.test(
            managerPin
        )
    ) {

        message(
            el.addEmployeeMessage,
            'PIN Manager ต้องเป็นตัวเลข 6 หลัก'
        )

        el.addManagerPin.focus()

        return
    }


    /* =====================================
       BUTTON LOADING
    ===================================== */

    el.saveNewEmployeeBtn.disabled =
        true

    el.saveNewEmployeeBtn.textContent =
        'กำลังสร้าง...'


    message(
        el.addEmployeeMessage,
        ''
    )


    try {

        /* =================================
           1. CREATE AUTH USER
           ผ่าน Edge Function
        ================================= */

        const {
            data,
            error
        } =
            await supabase
                .functions
                .invoke(
                    'create-employee',
                    {
                        body: {

                            full_name:
                                fullName,

                            email,

                            password,

                            role,

                            manager_pin:
                                role ===
                                    'manager'
                                    ? managerPin
                                    : ''
                        }
                    }
                )


        if (error) {

            /*
             * Edge Function อาจส่งรายละเอียด
             * อยู่ใน error context
             */
            let functionMessage =
                error.message

            try {

                if (
                    error.context
                    &&
                    typeof error.context.json ===
                    'function'
                ) {

                    const body =
                        await error.context.json()

                    functionMessage =
                        body?.error
                        ||
                        body?.message
                        ||
                        functionMessage
                }

            } catch (
            contextError
            ) {

                console.warn(
                    'Cannot read function error context:',
                    contextError
                )
            }


            throw new Error(
                functionMessage
                ||
                'CREATE_EMPLOYEE_FAILED'
            )
        }


        if (
            !data?.success
        ) {

            throw new Error(
                data?.error
                ||
                'CREATE_EMPLOYEE_FAILED'
            )
        }


        const newUserId =
            data?.user?.id


        if (!newUserId) {

            throw new Error(
                'NEW_USER_ID_NOT_FOUND'
            )
        }


        /* =================================
           2. ถ้าเป็น MANAGER
           ตั้ง PIN ด้วย Admin session
        ================================= */

        if (
            role ===
            'manager'
        ) {

            const {
                error:
                pinError
            } =
                await supabase.rpc(
                    'admin_set_manager_pin',
                    {

                        p_user_id:
                            newUserId,

                        p_manager_pin:
                            managerPin
                    }
                )


            if (pinError) {

                console.error(
                    'Set new manager PIN error:',
                    pinError
                )


                /*
                 * User ถูกสร้างแล้ว
                 * แต่ PIN ยังตั้งไม่สำเร็จ
                 *
                 * ไม่ลบ User อัตโนมัติ
                 * เพราะบัญชีถูกสร้างสำเร็จแล้ว
                 * Admin สามารถตั้ง PIN จากปุ่ม
                 * "ตั้ง PIN" ภายหลังได้
                 */
                closeAddEmployeeModal()

                await loadEmployees()

                alert(
                    `สร้าง Manager สำเร็จแล้ว\nแต่ตั้ง PIN ไม่สำเร็จ\nกรุณากด "ตั้ง PIN" ที่รายชื่อ Manager อีกครั้ง`
                )

                return
            }
        }


        /* =================================
           3. SUCCESS
        ================================= */

        closeAddEmployeeModal()


        await loadEmployees()


        alert(
            role ===
                'manager'
                ? 'สร้าง Manager และตั้ง PIN สำเร็จ'
                : 'สร้างพนักงานสำเร็จ'
        )


    } catch (error) {

        console.error(
            'Create employee error:',
            error
        )


        let text =
            error.message
            ||
            'สร้างพนักงานไม่สำเร็จ'


        /* =================================
           EDGE FUNCTION ERRORS
        ================================= */

        if (
            text.includes(
                'NOT_AUTHENTICATED'
            )
        ) {

            text =
                'กรุณาเข้าสู่ระบบใหม่'
        }


        if (
            text.includes(
                'ADMIN_REQUIRED'
            )
        ) {

            text =
                'เฉพาะ Admin เท่านั้นที่สามารถเพิ่มพนักงานได้'
        }


        if (
            text.includes(
                'ADMIN_INACTIVE'
            )
        ) {

            text =
                'บัญชี Admin ถูกปิดใช้งาน'
        }


        if (
            text.includes(
                'ADMIN_BRANCH_REQUIRED'
            )
        ) {

            text =
                'บัญชี Admin ยังไม่ได้กำหนดสาขา'
        }


        if (
            text.includes(
                'FULL_NAME_REQUIRED'
            )
        ) {

            text =
                'กรุณากรอกชื่อพนักงาน'
        }


        if (
            text.includes(
                'EMAIL_REQUIRED'
            )
        ) {

            text =
                'กรุณากรอก Email'
        }


        if (
            text.includes(
                'PASSWORD_TOO_SHORT'
            )
        ) {

            text =
                'Password ต้องมีอย่างน้อย 8 ตัวอักษร'
        }


        if (
            text.includes(
                'INVALID_ROLE'
            )
        ) {

            text =
                'ตำแหน่งไม่ถูกต้อง'
        }


        if (
            text.includes(
                'INVALID_MANAGER_PIN'
            )
        ) {

            text =
                'PIN Manager ต้องเป็นตัวเลข 6 หลัก'
        }


        if (
            text.toLowerCase()
                .includes(
                    'already registered'
                )
            ||
            text.toLowerCase()
                .includes(
                    'already been registered'
                )
            ||
            text.toLowerCase()
                .includes(
                    'email address is already'
                )
        ) {

            text =
                'Email นี้ถูกใช้งานในระบบแล้ว'
        }


        if (
            text.includes(
                'NEW_USER_ID_NOT_FOUND'
            )
        ) {

            text =
                'สร้างบัญชีแล้ว แต่ไม่พบรหัสผู้ใช้ กรุณาตรวจสอบ Supabase Auth'
        }


        if (
            text.includes(
                'Failed to send a request'
            )
            ||
            text.includes(
                'Failed to fetch'
            )
        ) {

            text =
                'เชื่อมต่อ Edge Function ไม่สำเร็จ กรุณาตรวจสอบ create-employee'
        }


        message(
            el.addEmployeeMessage,
            text
        )


    } finally {

        el.saveNewEmployeeBtn.disabled =
            false


        el.saveNewEmployeeBtn.textContent =
            'สร้างพนักงาน'
    }
}
/* ========================================
   CLEAR FILTER
======================================== */

function clearFilters() {

    el.searchInput.value =
        ''


    el.roleFilter.value =
        ''


    el.statusFilter.value =
        ''


    applyFilters()
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


        /*
         * รีเซ็ตตัวกรอง
         * ทุกครั้งที่เปิดหน้า
         */
        el.searchInput.value =
            ''

        el.roleFilter.value =
            ''

        el.statusFilter.value =
            ''


        await loadEmployees()


    } catch (error) {

        console.error(
            'Employees init error:',
            error
        )


        el.loadingState
            .classList
            .add(
                'hidden'
            )


        el.emptyState
            .classList
            .remove(
                'hidden'
            )


        el.emptyState.textContent =
            error.message
            ||
            'โหลดข้อมูลไม่สำเร็จ'
    }
}


/* ========================================
   EVENTS
======================================== */


/* BACK */

el.backBtn.onclick =
    () => {

        location.href =
            './dashboard.html'
    }


/* LOGOUT */

el.logoutBtn.onclick =
    logout


/* FILTER */

el.searchInput.oninput =
    applyFilters


el.roleFilter.onchange =
    applyFilters


el.statusFilter.onchange =
    applyFilters


el.clearFilterBtn.onclick =
    clearFilters


el.refreshBtn.onclick =
    loadEmployees


/* ========================================
   ADD EMPLOYEE EVENTS
======================================== */

el.addEmployeeBtn.onclick =
    openAddEmployeeModal


el.closeAddEmployeeBtn.onclick =
    closeAddEmployeeModal


el.cancelAddEmployeeBtn.onclick =
    closeAddEmployeeModal


el.addRole.onchange =
    handleAddRoleChange


/*
 * ตอนนี้ปุ่มนี้ยังไม่สร้าง User จริง
 * ขั้นต่อไปเราจะผูก Edge Function
 * create-employee
 */
el.saveNewEmployeeBtn.onclick =
    createNewEmployee


/* ========================================
   EMPLOYEE TABLE EVENTS
======================================== */

el.employeeTableBody.onclick =
    event => {

        const editButton =
            event.target.closest(
                '[data-edit-id]'
            )


        if (editButton) {

            openEditModal(
                editButton.dataset.editId
            )

            return
        }


        const pinButton =
            event.target.closest(
                '[data-pin-id]'
            )


        if (pinButton) {

            openPinModal(
                pinButton.dataset.pinId
            )
        }
    }


/* ========================================
   EDIT EVENTS
======================================== */

el.closeEditBtn.onclick =
    closeEditModal


el.cancelEditBtn.onclick =
    closeEditModal


el.saveEmployeeBtn.onclick =
    saveEmployee


/* ========================================
   PIN EVENTS
======================================== */

el.closePinBtn.onclick =
    closePinModal


el.cancelPinBtn.onclick =
    closePinModal


el.savePinBtn.onclick =
    saveManagerPin


/* ========================================
   CLICK BACKDROP
======================================== */

el.addEmployeeModal.onclick =
    event => {

        if (
            event.target ===
            el.addEmployeeModal
        ) {

            closeAddEmployeeModal()
        }
    }


el.editModal.onclick =
    event => {

        if (
            event.target ===
            el.editModal
        ) {

            closeEditModal()
        }
    }


el.pinModal.onclick =
    event => {

        if (
            event.target ===
            el.pinModal
        ) {

            closePinModal()
        }
    }


/* ========================================
   ESC
======================================== */

document.addEventListener(
    'keydown',
    event => {

        if (
            event.key !==
            'Escape'
        ) {
            return
        }


        /*
         * ADD EMPLOYEE
         */
        if (
            !el.addEmployeeModal
                .classList
                .contains(
                    'hidden'
                )
        ) {

            closeAddEmployeeModal()

            return
        }


        /*
         * PIN
         */
        if (
            !el.pinModal
                .classList
                .contains(
                    'hidden'
                )
        ) {

            closePinModal()

            return
        }


        /*
         * EDIT
         */
        if (
            !el.editModal
                .classList
                .contains(
                    'hidden'
                )
        ) {

            closeEditModal()
        }
    }
)


/* ========================================
   AUTH
======================================== */

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


/* ========================================
   START
======================================== */

init()