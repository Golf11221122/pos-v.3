import { supabase } from './supabase.js'

const $ = id => document.getElementById(id)

const el = {
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),
    branchText: $('branchText'),
    userName: $('userName'),
    refreshBtn: $('refreshBtn'),
    dateFrom: $('dateFrom'),
    dateTo: $('dateTo'),
    actionFilter: $('actionFilter'),
    entityFilter: $('entityFilter'),
    loadBtn: $('loadBtn'),
    todayBtn: $('todayBtn'),
    weekBtn: $('weekBtn'),
    message: $('message'),
    auditList: $('auditList'),
    emptyState: $('emptyState'),
    sumTotal: $('sumTotal'),
    sumVoid: $('sumVoid'),
    sumDiscount: $('sumDiscount'),
    sumUpdate: $('sumUpdate'),
    sumStock: $('sumStock'),
    detailModal: $('detailModal'),
    detailTitle: $('detailTitle'),
    detailMeta: $('detailMeta'),
    beforeData: $('beforeData'),
    afterData: $('afterData'),
    closeDetailBtn: $('closeDetailBtn')
}

const state = {
    session: null,
    profile: null,
    branch: null,
    rows: [],
    profileNames: {}
}

function esc(v) {
    return String(v ?? '')
        .replaceAll('&','&amp;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;')
        .replaceAll('"','&quot;')
        .replaceAll("'",'&#039;')
}

function ymd(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth()+1).padStart(2,'0')
    const d = String(date.getDate()).padStart(2,'0')
    return `${y}-${m}-${d}`
}

function formatDateTime(v) {
    if (!v) return '-'
    return new Intl.DateTimeFormat('th-TH',{
        dateStyle:'short',
        timeStyle:'medium'
    }).format(new Date(v))
}

function actionLabel(v) {
    const map = {
        insert:'เพิ่ม',
        update:'แก้ไข',
        delete:'ลบ',
        discount:'ส่วนลด',
        void:'VOID',
        refund:'Refund',
        refund_reverse:'Reverse Refund'
    }
    return map[v] || v || '-'
}

function entityLabel(v) {
    const map = {
        sale:'การขาย',
        products:'สินค้า',
        categories:'หมวดหมู่',
        ingredients:'วัตถุดิบ',
        recipes:'สูตร',
        restaurant_tables:'โต๊ะ',
        profiles:'พนักงาน / สิทธิ์',
        ingredient_stock_movements:'Stock Movement'
    }
    return map[v] || v || '-'
}


function money(v) {
    const n = Number(v || 0)
    return new Intl.NumberFormat('th-TH',{
        style:'currency',
        currency:'THB',
        minimumFractionDigits:2
    }).format(n)
}

function cleanText(v) {
    return String(v ?? '')
        .replaceAll('â€¢','•')
        .replaceAll('â–','')
        .replaceAll('�','')
        .trim()
}

function getInvoiceNo(row) {
    return (
        row?.after_data?.invoice_no
        ||
        row?.before_data?.invoice_no
        ||
        row?.metadata?.invoice_no
        ||
        ''
    )
}


function personNameById(userId) {
    if (!userId) {
        return '-'
    }

    return (
        state.profileNames?.[String(userId)]
        ||
        String(userId)
    )
}

async function loadProfileNames() {
    if (!state.profile?.branch_id) {
        state.profileNames = {}
        return
    }

    const {
        data,
        error
    } = await supabase
        .from('profiles')
        .select('id,full_name')
        .eq(
            'branch_id',
            state.profile.branch_id
        )

    if (error) {
        console.warn(
            'Load profile names error:',
            error
        )

        state.profileNames = {}
        return
    }

    state.profileNames =
        Object.fromEntries(
            (data || []).map(
                row => [
                    String(row.id),
                    row.full_name || row.id
                ]
            )
        )
}

function auditTitle(row) {
    const invoice = getInvoiceNo(row)

    if (row.entity_type === 'sale' && invoice) {
        return `${invoice} • ${actionLabel(row.action_type)}`
    }

    const label = entityLabel(row.entity_type)
    const action = actionLabel(row.action_type)

    return `${label} • ${action}`
}

function displayValue(key, value) {
    if (value === null || value === undefined || value === '') {
        return '-'
    }

    const personIdKeys = new Set([
        'approver_id',
        'actor_id',
        'cashier_id',
        'voided_by',
        'refunded_by',
        'created_by',
        'updated_by'
    ])

    if (personIdKeys.has(key)) {
        return personNameById(value)
    }

    const moneyKeys = new Set([
        'amount',
        'subtotal',
        'discount',
        'total',
        'received_amount',
        'change_amount',
        'unit_cost',
        'cost_per_unit',
        'current_stock'
    ])

    if (moneyKeys.has(key) && !Number.isNaN(Number(value))) {
        return money(value)
    }

    if (
        key.endsWith('_at')
        ||
        key === 'created_at'
        ||
        key === 'updated_at'
    ) {
        const dt = new Date(value)
        if (!Number.isNaN(dt.getTime())) {
            return formatDateTime(value)
        }
    }

    if (typeof value === 'boolean') {
        return value ? 'ใช่' : 'ไม่ใช่'
    }

    if (typeof value === 'object') {
        return JSON.stringify(value)
    }

    return cleanText(value)
}

function fieldLabel(key) {
    const map = {
        invoice_no:'เลขบิล',
        amount:'จำนวนเงิน',
        reason:'เหตุผล',
        approver_id:'ผู้อนุมัติ',
        voided_by:'ผู้อนุมัติ VOID',
        refunded_by:'ผู้คืนเงิน',
        cashier_id:'พนักงานขาย',
        subtotal:'ยอดก่อนลด',
        discount:'ส่วนลด',
        total:'ยอดสุทธิ',
        payment_method:'วิธีชำระเงิน',
        status:'สถานะ',
        full_name:'ชื่อพนักงาน',
        role:'ตำแหน่ง',
        is_active:'สถานะบัญชี',
        name:'ชื่อ',
        price:'ราคา',
        current_stock:'สต็อกคงเหลือ',
        quantity:'จำนวน',
        movement_type:'ประเภทการเคลื่อนไหว',
        unit_cost:'ต้นทุนต่อหน่วย',
        cost_per_unit:'ต้นทุนต่อหน่วย',
        created_at:'สร้างเมื่อ',
        updated_at:'แก้ไขเมื่อ',
        voided_at:'เวลา VOID'
    }

    return map[key] || key
}

function importantEntries(data) {
    if (!data || typeof data !== 'object') {
        return []
    }

    const preferred = [
        'invoice_no',
        'amount',
        'reason',
        'approver_id',
        'subtotal',
        'discount',
        'total',
        'payment_method',
        'status',
        'full_name',
        'role',
        'is_active',
        'name',
        'price',
        'quantity',
        'current_stock',
        'movement_type',
        'unit_cost',
        'cost_per_unit',
        'created_at',
        'updated_at',
        'voided_at'
    ]

    const result = []

    preferred.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(data,key)) {
            result.push([key,data[key]])
        }
    })

    Object.keys(data).forEach(key => {
        if (
            !preferred.includes(key)
            &&
            ![
                'id',
                'branch_id',
                'actor_id',
                'cashier_id'
            ].includes(key)
        ) {
            result.push([key,data[key]])
        }
    })

    return result
}

function renderFriendlyData(target, data, emptyText='ไม่มีข้อมูลก่อนแก้ไข') {
    if (!target) return

    const entries = importantEntries(data)

    if (!entries.length) {
        target.innerHTML = `
            <div class="friendly-empty">
                ${esc(emptyText)}
            </div>
        `
        return
    }

    target.innerHTML = entries.map(([key,value]) => `
        <div class="friendly-row">
            <span>${esc(fieldLabel(key))}</span>
            <strong>${esc(displayValue(key,value))}</strong>
        </div>
    `).join('')
}

async function requireAccess() {
    const { data:{session}, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!session) {
        location.replace('./index.html')
        return false
    }
    state.session=session

    const {data:profile,error:pe}=await supabase
        .from('profiles')
        .select('id,full_name,role,branch_id')
        .eq('id',session.user.id)
        .maybeSingle()
    if (pe) throw pe

    const role=String(profile?.role||'').toLowerCase()
    if (!['admin','manager'].includes(role)) {
        alert('หน้านี้สำหรับ Admin / Manager เท่านั้น')
        location.replace('./dashboard.html')
        return false
    }

    state.profile=profile
    el.userName.textContent=profile.full_name || session.user.email

    const {data:branch,error:be}=await supabase
        .from('branches')
        .select('id,name')
        .eq('id',profile.branch_id)
        .maybeSingle()
    if (be) throw be

    state.branch=branch
    el.branchText.textContent=branch?.name || 'สาขา'
    return true
}

function setDefaultWeek() {
    const to=new Date()
    const from=new Date()
    from.setDate(from.getDate()-6)
    el.dateFrom.value=ymd(from)
    el.dateTo.value=ymd(to)
}

function renderSummary(s={}) {
    el.sumTotal.textContent=Number(s.total||0).toLocaleString('th-TH')
    el.sumVoid.textContent=Number(s.void_count||0).toLocaleString('th-TH')
    el.sumDiscount.textContent=Number(s.discount_count||0).toLocaleString('th-TH')
    el.sumUpdate.textContent=Number(s.update_count||0).toLocaleString('th-TH')
    el.sumStock.textContent=Number(s.stock_count||0).toLocaleString('th-TH')
}

function renderRows(rows) {
    state.rows=rows||[]
    el.auditList.innerHTML=''

    if (!state.rows.length) {
        el.emptyState.classList.remove('hidden')
        return
    }

    el.emptyState.classList.add('hidden')

    el.auditList.innerHTML=state.rows.map(row=>`
        <article class="audit-card" data-id="${esc(row.id)}">
            <div class="audit-main">
                <div class="audit-badges">
                    <span class="badge action-${esc(row.action_type)}">${esc(actionLabel(row.action_type))}</span>
                    <span class="badge entity-badge">${esc(entityLabel(row.entity_type))}</span>
                </div>
                <strong>${esc(auditTitle(row))}</strong>
                <small>${esc(formatDateTime(row.created_at))}</small>
            </div>
            <div class="audit-side">
                <span>ผู้ทำ: <strong>${esc(row.actor_name || 'System')}</strong></span>
                ${row.entity_id ? `<span>ID: ${esc(row.entity_id)}</span>` : ''}
                <button class="detail-btn" type="button" data-detail="${esc(row.id)}">ดูรายละเอียด</button>
            </div>
        </article>
    `).join('')
}

async function loadData() {
    el.message.textContent='กำลังโหลด...'

    const args={
        p_date_from:el.dateFrom.value,
        p_date_to:el.dateTo.value,
        p_action:el.actionFilter.value || null,
        p_entity:el.entityFilter.value || null,
        p_limit:500
    }

    const [{data:rows,error},{data:summary,error:se}] = await Promise.all([
        supabase.rpc('central_audit_list_v27',args),
        supabase.rpc('central_audit_summary_v27',{
            p_date_from:el.dateFrom.value,
            p_date_to:el.dateTo.value
        })
    ])

    if (error) throw error
    if (se) throw se

    renderRows(rows||[])
    renderSummary(summary||{})
    el.message.textContent=''
}

function openDetail(id) {
    const row=state.rows.find(x=>x.id===id)
    if (!row) return

    el.detailTitle.textContent=auditTitle(row)
    el.detailMeta.textContent=
        `${formatDateTime(row.created_at)} • ผู้ทำ: ${row.actor_name || 'System'}`

    renderFriendlyData(
        el.beforeData,
        row.before_data,
        'ไม่มีข้อมูลก่อนแก้ไข'
    )

    renderFriendlyData(
        el.afterData,
        row.after_data,
        'ไม่มีข้อมูลหลังแก้ไข'
    )

    el.detailModal.classList.remove('hidden')
}

async function logout() {
    await supabase.auth.signOut()
    location.replace('./index.html')
}

el.backBtn.onclick=()=>location.href='./dashboard.html'
el.logoutBtn.onclick=logout
el.refreshBtn.onclick=()=>loadData().catch(showError)
el.loadBtn.onclick=()=>loadData().catch(showError)

el.todayBtn.onclick=()=>{
    const d=ymd(new Date())
    el.dateFrom.value=d
    el.dateTo.value=d
    loadData().catch(showError)
}

el.weekBtn.onclick=()=>{
    setDefaultWeek()
    loadData().catch(showError)
}

el.auditList.onclick=e=>{
    const btn=e.target.closest('[data-detail]')
    if (btn) openDetail(btn.dataset.detail)
}

el.closeDetailBtn.onclick=()=>el.detailModal.classList.add('hidden')
el.detailModal.onclick=e=>{
    if (e.target===el.detailModal) el.detailModal.classList.add('hidden')
}

function showError(error) {
    console.error(error)
    el.message.textContent=error?.message || 'โหลด Audit Log ไม่สำเร็จ'
}

async function init() {
    try {
        setDefaultWeek()
        const ok=await requireAccess()
        if (!ok) return

        await loadProfileNames()
        await loadData()
    } catch(error) {
        showError(error)
    }
}

init()
