import { supabase } from './supabase.js'

const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.getElementById('sidebar'),

    currentDate: document.getElementById('currentDate'),

    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userRole: document.getElementById('userRole'),
    welcomeName: document.getElementById('welcomeName'),

    userEmail: document.getElementById('userEmail'),
    profileName: document.getElementById('profileName'),
    profileRole: document.getElementById('profileRole'),
    profileBranch: document.getElementById('profileBranch'),

    productCount: document.getElementById('productCount'),
    categoryCount: document.getElementById('categoryCount'),
    branchCount: document.getElementById('branchCount'),
    branchName: document.getElementById('branchName'),

    statusMessage: document.getElementById('statusMessage'),

    openPosBtn: document.getElementById('openPosBtn'),
    openProductsBtn: document.getElementById('openProductsBtn'),
    openCategoriesBtn: document.getElementById('openCategoriesBtn'),
    openReportsBtn: document.getElementById('openReportsBtn')
}

function showStatus(message, isError = true) {
    elements.statusMessage.textContent = message
    elements.statusMessage.style.color = isError
        ? '#d93025'
        : '#188038'
}

function formatRole(role) {
    const roles = {
        admin: 'ผู้ดูแลระบบ',
        manager: 'ผู้จัดการ',
        cashier: 'พนักงานขาย',
        kitchen: 'พนักงานครัว'
    }

    return roles[role] || role || 'ผู้ใช้งาน'
}

function setCurrentDate() {
    const date = new Date()

    elements.currentDate.textContent = date.toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

async function getCurrentSession() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession()

    if (error) {
        throw error
    }

    if (!session) {
        window.location.replace('./index.html')
        return null
    }

    return session
}

async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, branch_id')
        .eq('id', userId)
        .maybeSingle()

    if (error) {
        console.error('Profile error:', error)
        throw error
    }

    if (!data) {
        throw new Error(
            'มีข้อมูลใน profiles แต่บัญชีที่ Login ยังไม่มีสิทธิ์อ่าน กรุณาตรวจสอบ RLS Policy'
        )
    }

    return data
}

async function getTableCount(tableName, branchId = null) {
    let query = supabase
        .from(tableName)
        .select('*', {
            count: 'exact',
            head: true
        })

    if (branchId) {
        query = query.eq('branch_id', branchId)
    }

    const { count, error } = await query

    if (error) {
        console.error(`${tableName} count error:`, error)
        return 0
    }

    return count || 0
}

async function getBranch(branchId) {
    if (!branchId) {
        return null
    }

    const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', branchId)
        .single()

    if (error) {
        console.error('Branch error:', error)
        return null
    }

    return data
}

function displayUser(user, profile, branch) {
    const fullName =
        profile?.full_name?.trim() ||
        user.email?.split('@')[0] ||
        'ผู้ใช้งาน'

    const roleText = formatRole(profile?.role)

    const branchFromRelation = Array.isArray(profile?.branches)
        ? profile.branches[0]
        : profile?.branches

    const branchData = branchFromRelation || branch
    const branchText = branchData?.name || 'ยังไม่ได้กำหนดสาขา'

    elements.userEmail.textContent = user.email || '-'
    elements.profileName.textContent = fullName
    elements.profileRole.textContent = roleText
    elements.profileBranch.textContent = branchText

    elements.userName.textContent = fullName
    elements.userRole.textContent = roleText
    elements.welcomeName.textContent = fullName
    elements.userAvatar.textContent = fullName.charAt(0).toUpperCase()

    elements.branchName.textContent = branchText
}

async function loadDashboard() {
    showStatus('กำลังโหลดข้อมูล...', false)

    try {
        const session = await getCurrentSession()

        if (!session) {
            return
        }

        const user = session.user
        const profile = await getProfile(user.id)
        const branch = await getBranch(profile?.branch_id)

        displayUser(user, profile, branch)

        const [
    productCount,
    categoryCount,
    branchCount
] = await Promise.all([
    getTableCount('products'),
    getTableCount('categories'),
    getTableCount('branches')
])

        elements.productCount.textContent =
            productCount.toLocaleString('th-TH')

        elements.categoryCount.textContent =
            categoryCount.toLocaleString('th-TH')

        elements.branchCount.textContent =
            branchCount.toLocaleString('th-TH')

        showStatus('โหลดข้อมูลสำเร็จ', false)

        setTimeout(() => {
            elements.statusMessage.textContent = ''
        }, 2000)

    } catch (error) {
        console.error('Dashboard load error:', error)

        showStatus(
            `โหลดข้อมูลไม่สำเร็จ: ${error.message || 'เกิดข้อผิดพลาด'}`
        )
    }
}

async function logout() {
    elements.logoutBtn.disabled = true
    elements.logoutBtn.textContent = 'กำลังออกจากระบบ...'

    const { error } = await supabase.auth.signOut()

    if (error) {
        elements.logoutBtn.disabled = false
        elements.logoutBtn.innerHTML = '<span>🚪</span> ออกจากระบบ'

        showStatus(`ออกจากระบบไม่สำเร็จ: ${error.message}`)
        return
    }

    window.location.replace('./index.html')
}

function showComingSoon(featureName) {
    alert(`${featureName} จะสร้างในขั้นตอนถัดไปครับ`)
}

elements.logoutBtn.addEventListener('click', logout)

elements.menuToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('open')
})

elements.openPosBtn.addEventListener('click', () => {
    window.location.href = './pos.html'
})

elements.openProductsBtn.addEventListener('click', () => {
    window.location.href = './products.html'
})

elements.openCategoriesBtn.addEventListener('click', () => {
    showComingSoon('หน้าจัดการหมวดหมู่')
})

elements.openReportsBtn.addEventListener('click', () => {
    showComingSoon('หน้ารายงาน')
})

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
        window.location.replace('./index.html')
    }
})

setCurrentDate()
loadDashboard()