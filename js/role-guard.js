import { supabase } from './supabase.js'


/* ========================================
   PAGE PERMISSIONS
======================================== */

const PAGE_PERMISSIONS = {

    'dashboard.html': ['admin','manager','cashier','staff'],
    'pos.html': ['admin','manager','cashier','staff'],
    'shift.html': ['admin','manager','cashier'],
    'sales-history.html': ['admin','manager','cashier'],
    'sales-report.html': ['admin','manager'],
    'products.html': ['admin','manager'],
    'categories.html': ['admin','manager'],
    'ingredients.html': ['admin','manager','stock'],
    'recipes.html': ['admin','manager'],
    'stock-movements.html': ['admin','manager','stock'],
    'inventory-report.html': ['admin','manager','stock'],
    'tables.html': ['admin','manager','cashier','staff'],
    'kitchen.html': ['admin','manager','kitchen'],
    'kitchen-stations.html': ['admin','manager'],
    'employees.html': ['admin'],
    'audit-log.html': ['admin','manager']
}


/* ========================================
   MENU PERMISSIONS
======================================== */

const MENU_PERMISSIONS = {

    dashboard: ['admin','manager','cashier','staff'],
    pos: ['admin','manager','cashier','staff'],
    shift: ['admin','manager','cashier'],
    sales: ['admin','manager','cashier'],
    salesReport: ['admin','manager'],
    products: ['admin','manager'],
    categories: ['admin','manager'],
    ingredients: ['admin','manager','stock'],
    recipes: ['admin','manager'],
    stockMovements: ['admin','manager','stock'],
    inventoryReport: ['admin','manager','stock'],
    tables: ['admin','manager','cashier','staff'],
    kitchen: ['admin','manager','kitchen'],
    kitchenStations: ['admin','manager'],
    auditLog: ['admin','manager'],
    employees: ['admin'],
    settings: ['admin']
}


/* ========================================
   HELPERS
======================================== */

function getCurrentPageName() {

    const path =
        window.location.pathname


    const parts =
        path.split('/')


    return (
        parts.pop()
        ||
        'dashboard.html'
    )
}


function normalizeRole(role) {

    const value =
        String(
            role || ''
        )
            .trim()
            .toLowerCase()


    /*
     * รองรับ role เก่าชั่วคราว
     */
    if (
        value ===
        'cashier'
    ) {
        return 'staff'
    }


    return value
}


function isAllowed(
    role,
    allowedRoles
) {

    if (
        !Array.isArray(
            allowedRoles
        )
    ) {
        return false
    }


    return allowedRoles
        .includes(
            role
        )
}


/* ========================================
   SESSION
======================================== */

async function getSession() {

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

        window.location
            .replace(
                './index.html'
            )


        return null
    }


    return session
}


/* ========================================
   PROFILE
======================================== */

async function getProfile(
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
                branch_id,
                is_active
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
            'PROFILE_NOT_FOUND'
        )
    }


    return data
}


/* ========================================
   HIDE ELEMENT
======================================== */

function hideElement(
    selector
) {

    const element =
        document.querySelector(
            selector
        )


    if (!element) {
        return
    }


    element.style.display =
        'none'
}


/* ========================================
   SHOW ELEMENT
======================================== */

function showElement(
    selector
) {

    const element =
        document.querySelector(
            selector
        )


    if (!element) {
        return
    }


    element.style.display =
        ''
}


/* ========================================
   MENU VISIBILITY
======================================== */

function setMenuVisibility(
    selector,
    role,
    allowedRoles
) {

    if (
        isAllowed(
            role,
            allowedRoles
        )
    ) {

        showElement(
            selector
        )

    } else {

        hideElement(
            selector
        )
    }
}


/* ========================================
   APPLY SIDEBAR PERMISSIONS
======================================== */

function applySidebarPermissions(
    role
) {

    setMenuVisibility(
        'a[href="./dashboard.html"]',
        role,
        MENU_PERMISSIONS.dashboard
    )


    setMenuVisibility(
        'a[href="./pos.html"]',
        role,
        MENU_PERMISSIONS.pos
    )

    setMenuVisibility(
        'a[href="./shift.html"]',
        role,
        MENU_PERMISSIONS.shift
    )


    setMenuVisibility(
        'a[href="./products.html"]',
        role,
        MENU_PERMISSIONS.products
    )


    setMenuVisibility(
        'a[href="./categories.html"]',
        role,
        MENU_PERMISSIONS.categories
    )


    setMenuVisibility(
        'a[href="./sales-history.html"]',
        role,
        MENU_PERMISSIONS.sales
    )

    setMenuVisibility(
        'a[href="./sales-report.html"]',
        role,
        MENU_PERMISSIONS.salesReport
    )


    setMenuVisibility(
        'a[href="./ingredients.html"]',
        role,
        MENU_PERMISSIONS.ingredients
    )


    setMenuVisibility(
        'a[href="./recipes.html"]',
        role,
        MENU_PERMISSIONS.recipes
    )


    setMenuVisibility(
        'a[href="./stock-movements.html"]',
        role,
        MENU_PERMISSIONS.stockMovements
    )


    setMenuVisibility(
        'a[href="./inventory-report.html"]',
        role,
        MENU_PERMISSIONS.inventoryReport
    )


    setMenuVisibility(
        'a[href="./tables.html"]',
        role,
        MENU_PERMISSIONS.tables
    )


    setMenuVisibility(
        'a[href="./kitchen-stations.html"]',
        role,
        MENU_PERMISSIONS.kitchenStations
    )


    setMenuVisibility(
        'a[href="./audit-log.html"]',
        role,
        MENU_PERMISSIONS.auditLog
    )


    setMenuVisibility(
        'a[href="./employees.html"]',
        role,
        MENU_PERMISSIONS.employees
    )


    setMenuVisibility(
        '#settingsMenu',
        role,
        MENU_PERMISSIONS.settings
    )
}


/* ========================================
   DASHBOARD QUICK ACTIONS
======================================== */

function applyDashboardQuickActions(
    role
) {

    /*
     * เปิด POS
     */
    setMenuVisibility(
        '#openPosBtn',
        role,
        MENU_PERMISSIONS.pos
    )


    /*
     * จัดการสินค้า
     */
    setMenuVisibility(
        '#openProductsBtn',
        role,
        MENU_PERMISSIONS.products
    )


    /*
     * ประวัติการขาย
     */
    setMenuVisibility(
        '#openSalesBtn',
        role,
        MENU_PERMISSIONS.sales
    )


    /*
 * ดูรายงานเต็ม
 * เฉพาะ Admin / Manager
 */
    setMenuVisibility(
        '#openReportsBtn',
        role,
        [
            'admin',
            'manager'
        ]
    )
}


/* ========================================
   ROLE SIDEBAR HARDENING V2.8
======================================== */

const ROLE_ALLOWED_HREFS_V28 = {
    staff: new Set(['./dashboard.html','./pos.html','./tables.html']),
    cashier: new Set(['./dashboard.html','./pos.html','./shift.html','./sales-history.html','./tables.html']),
    kitchen: new Set(['./kitchen.html']),
    stock: new Set(['./ingredients.html','./stock-movements.html','./inventory-report.html'])
}

function applyStrictRoleSidebarV28(role) {
    const allowed = ROLE_ALLOWED_HREFS_V28[role]
    if (!allowed) return

    document.querySelectorAll('.sidebar a[href]').forEach(link => {
        const href = link.getAttribute('href') || ''
        if (!allowed.has(href)) link.style.display = 'none'
    })

    const managementMenu = document.getElementById('managementMenu')
    const managementToggle = document.getElementById('managementToggle')

    if (role === 'staff' || role === 'cashier' || role === 'kitchen') {
        if (managementMenu) managementMenu.style.display = 'none'
        if (managementToggle) managementToggle.style.display = 'none'
    }
}

/* ========================================
   APPLY UI PERMISSIONS
======================================== */

function applyUiPermissions(
    role
) {

    applySidebarPermissions(
        role
    )


    applyDashboardQuickActions(
        role
    )


    applyStrictRoleSidebarV28(
        role
    )
}


/* ========================================
   REDIRECT
======================================== */

function redirectNotAllowed(
    role
) {

    if (role === 'staff' || role === 'cashier') {
        window.location.replace('./pos.html')
        return
    }

    if (role === 'kitchen') {
        window.location.replace('./kitchen.html')
        return
    }

    if (role === 'stock') {
        window.location.replace('./ingredients.html')
        return
    }

    window.location.replace('./dashboard.html')
}


/* ========================================
   PAGE PERMISSION
======================================== */

function checkPagePermission(
    role
) {

    const pageName =
        getCurrentPageName()


    const allowedRoles =
        PAGE_PERMISSIONS[
        pageName
        ]


    /*
     * ถ้ายังไม่ได้กำหนด permission
     * จะไม่ block หน้านั้น
     */
    if (
        !allowedRoles
    ) {

        return true
    }


    if (
        isAllowed(
            role,
            allowedRoles
        )
    ) {

        return true
    }


    redirectNotAllowed(
        role
    )


    return false
}


/* ========================================
   ROLE GUARD
======================================== */

export async function applyRoleGuard() {

    try {

        const session =
            await getSession()


        if (!session) {
            return null
        }


        const profile =
            await getProfile(
                session.user.id
            )


        /*
         * บัญชีถูกปิดใช้งาน
         */
        if (
            profile.is_active ===
            false
        ) {

            await supabase
                .auth
                .signOut()


            alert(
                'บัญชีนี้ถูกปิดใช้งาน'
            )


            window.location
                .replace(
                    './index.html'
                )


            return null
        }


        const role =
            normalizeRole(
                profile.role
            )


        /*
         * ตรวจ role
         */
        if (
            ![
                'admin',
                'manager',
                'cashier',
                'staff',
                'kitchen',
                'stock'
            ].includes(
                role
            )
        ) {

            console.error(
                'Unknown role:',
                profile.role
            )


            await supabase
                .auth
                .signOut()


            alert(
                'สิทธิ์ผู้ใช้งานไม่ถูกต้อง'
            )


            window.location
                .replace(
                    './index.html'
                )


            return null
        }


        /*
         * ตรวจสิทธิ์หน้า
         */
        const pageAllowed =
            checkPagePermission(
                role
            )


        if (
            !pageAllowed
        ) {

            return null
        }


        /*
         * ปรับ UI ตาม role
         */
        applyUiPermissions(
            role
        )


        return {
            session,
            profile,
            role
        }


    } catch (error) {

        console.error(
            'Role guard error:',
            error
        )


        alert(
            'ตรวจสอบสิทธิ์ผู้ใช้งานไม่สำเร็จ'
        )


        window.location
            .replace(
                './index.html'
            )


        return null
    }
}


/* ========================================
   AUTH CHANGE
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

                window.location
                    .replace(
                        './index.html'
                    )
            }
        }
    )