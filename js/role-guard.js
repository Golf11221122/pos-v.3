import { supabase } from './supabase.js'


/* ========================================
   PAGE PERMISSIONS
======================================== */

const PAGE_PERMISSIONS = {

    'dashboard.html': [
        'admin',
        'manager',
        'cashier',
        'staff'
    ],

    'pos.html': [
        'admin',
        'manager',
        'cashier',
        'staff'
    ],

    'shift.html': [
        'admin',
        'manager',
        'cashier',
        'staff'
    ],

    'sales-history.html': [
        'admin',
        'manager',
        'cashier'
    ],
    /* เพิ่มใน PAGE_PERMISSIONS */

    'sales-report.html': [
        'admin',
        'manager'
    ],

    'products.html': [
        'admin',
        'manager'
    ],

    'categories.html': [
        'admin',
        'manager'
    ],

    'ingredients.html': [
        'admin',
        'manager',
        'stock'
    ],

    'recipes.html': [
        'admin',
        'manager'
    ],

    'stock-movements.html': [
        'admin',
        'manager',
        'stock'
    ],

    'inventory-report.html': [
        'admin',
        'manager',
        'stock'
    ],

    'tables.html': [
        'admin',
        'manager',
        'cashier',
        'staff'
    ],

    

    'kitchen-stations.html': [
        'admin',
        'manager'
    ],

    'kitchen.html': [
        'admin',
        'manager',
        'kitchen'
    ],


    'modifier-options.html': [
        'admin',
        'manager'
    ],

    'marketing.html': [
        'admin',
        'manager'
    ],

    'cost-control.html': [
        'admin',
        'manager'
    ],

    'employees.html': [
        'admin'
    ],

    'order-history.html': [
        'admin',
        'manager'
    ],

    'promotions.html': [
        'admin',
        'manager'
    ],

    'audit-log.html': [
        'admin',
        'manager'
    ],

    'employee-activity.html': [
        'admin'
    ],

    'cancellation-history.html': [
        'admin'
    ]
}


/* ========================================
   MENU PERMISSIONS
======================================== */

const MENU_PERMISSIONS = {

    dashboard: [
        'admin',
        'manager',
        'cashier',
        'staff'
    ],

    pos: [
        'admin',
        'manager',
        'cashier',
        'staff'
    ],

    shift: [
        'admin',
        'manager',
        'cashier',
        'staff'
    ],

    sales: [
        'admin',
        'manager',
        'cashier'
    ],

    salesReport: [
        'admin',
        'manager'
    ],

    products: [
        'admin',
        'manager'
    ],

    categories: [
        'admin',
        'manager'
    ],

    ingredients: [
        'admin',
        'manager',
        'stock'
    ],

    recipes: [
        'admin',
        'manager'
    ],

    stockMovements: [
        'admin',
        'manager',
        'stock'
    ],

    inventoryReport: [
        'admin',
        'manager',
        'stock'
    ],

    tables: [
        'admin',
        'manager',
        'cashier',
        'staff'
    ],

    kitchenStations: [
        'admin',
        'manager'
    ],

    kitchen: [
        'admin',
        'manager',
        'kitchen'
    ],


    modifierOptions: [
        'admin',
        'manager'
    ],

    marketing: [
        'admin',
        'manager'
    ],

    costControl: [
        'admin',
        'manager'
    ],

    auditLog: [
        'admin',
        'manager'
    ],

    employees: [
        'admin'
    ],

    cancellationHistory: [
        'admin'
    ],

    settings: [
        'admin'
    ]
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
        'a[href="./kitchen.html"]',
        role,
        MENU_PERMISSIONS.kitchen
    )


    setMenuVisibility(
        'a[href="./modifier-options.html"]',
        role,
        MENU_PERMISSIONS.modifierOptions
    )


    setMenuVisibility(
        'a[href="./marketing.html"]',
        role,
        MENU_PERMISSIONS.marketing
    )


    setMenuVisibility(
        'a[href="./cost-control.html"]',
        role,
        MENU_PERMISSIONS.costControl
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
        'a[href="./cancellation-history.html"]',
        role,
        MENU_PERMISSIONS.cancellationHistory
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
    applyShiftRoleMenuV281(role)
}


/* ========================================
   REDIRECT
======================================== */

function redirectNotAllowed(
    role
) {

    const homeByRole = {
        staff: './pos.html',
        cashier: './dashboard.html',
        kitchen: './kitchen.html',
        stock: './inventory-report.html',
        manager: './dashboard.html',
        admin: './dashboard.html'
    }


    window.location
        .replace(
            homeByRole[role]
            ||
            './index.html'
        )
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
     * Security hardening V3.12:
     * guarded private pages are DENY BY DEFAULT.
     * Every page that imports applyRoleGuard()
     * must be explicitly listed in PAGE_PERMISSIONS.
     */
    if (
        !allowedRoles
    ) {

        console.error(
            'PAGE_PERMISSION_NOT_CONFIGURED:',
            pageName
        )

        redirectNotAllowed(
            role
        )

        return false
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
/* V2.8.1 Staff/Cashier menu hardening */
function applyShiftRoleMenuV281(role){
 const r=String(role||'').trim().toLowerCase()
 const allow={
  staff:new Set(['./dashboard.html','./pos.html','./shift.html','./tables.html']),
  cashier:new Set(['./dashboard.html','./pos.html','./shift.html','./sales-history.html','./tables.html'])
 }[r]
 if(!allow)return
 document.querySelectorAll('.sidebar a[href]').forEach(a=>{
  const href=a.getAttribute('href')||''
  if(!allow.has(href))a.style.display='none'
 })
 const t=document.getElementById('managementToggle')
 const m=document.getElementById('managementMenu')
 if(t)t.style.display='none'
 if(m)m.style.display='none'
}


/* ========================================
   V2.11.2 ROLE REFRESH
   อ่าน Role ใหม่เมื่อกลับเข้า tab / window
======================================== */

let roleRefreshBusyV2112 = false

async function refreshRoleGuardV2112() {

    if (roleRefreshBusyV2112) {
        return
    }

    roleRefreshBusyV2112 = true

    try {
        await applyRoleGuard()
    } catch (error) {
        console.error(
            'V2.11.2 role refresh error:',
            error
        )
    } finally {
        roleRefreshBusyV2112 = false
    }
}


document.addEventListener(
    'visibilitychange',
    () => {
        if (
            document.visibilityState ===
            'visible'
        ) {
            refreshRoleGuardV2112()
        }
    }
)


window.addEventListener(
    'focus',
    () => {
        refreshRoleGuardV2112()
    }
)
