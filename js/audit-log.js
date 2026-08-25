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
    rows: []
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
                <strong>${esc(row.description || row.entity_type)}</strong>
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

    el.detailTitle.textContent=`${actionLabel(row.action_type)} • ${entityLabel(row.entity_type)}`
    el.detailMeta.textContent=`${formatDateTime(row.created_at)} • ${row.actor_name || 'System'}`
    el.beforeData.textContent=row.before_data
        ? JSON.stringify(row.before_data,null,2)
        : '-'
    el.afterData.textContent=row.after_data
        ? JSON.stringify(row.after_data,null,2)
        : '-'
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
        await loadData()
    } catch(error) {
        showError(error)
    }
}

init()
