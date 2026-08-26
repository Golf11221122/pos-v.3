import { supabase } from './supabase.js'
import { applyRoleGuard } from './role-guard.js?v=3.12.0'

const $ = id => document.getElementById(id)
const el = {
  branchText:$('branchText'), backBtn:$('backBtn'), dateFrom:$('dateFrom'), dateTo:$('dateTo'),
  staffFilter:$('staffFilter'), reasonFilter:$('reasonFilter'), searchBtn:$('searchBtn'),
  itemCount:$('itemCount'), lineCount:$('lineCount'), amountTotal:$('amountTotal'),
  historyBody:$('historyBody'), emptyState:$('emptyState'), pageMessage:$('pageMessage')
}
const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")
const money = v => new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format(Number(v||0))
const localDate = d => {
  const x=new Date(d), y=x.getFullYear(), m=String(x.getMonth()+1).padStart(2,'0'), day=String(x.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
const dateTime = v => v ? new Intl.DateTimeFormat('th-TH',{dateStyle:'short',timeStyle:'medium'}).format(new Date(v)) : '-'
function orderLabel(r){
  if(r.order_type==='takeaway') return r.queue_no ? `กลับบ้าน • คิว ${String(r.queue_no).padStart(3,'0')}` : 'กลับบ้าน'
  return r.table_name || (r.table_no ? `โต๊ะ ${r.table_no}` : '-')
}
async function requireUser(){
  const guard = await applyRoleGuard()

  if(!guard){
    throw new Error('ไม่มีสิทธิ์เข้าหน้านี้')
  }

  if(guard.role !== 'admin'){
    window.location.replace('./dashboard.html')
    throw new Error('หน้านี้สำหรับผู้ดูแลระบบเท่านั้น')
  }

  const {data,error}=await supabase
    .from('branches')
    .select('id,name')
    .eq('id',guard.profile.branch_id)
    .maybeSingle()

  if(error) throw error

  el.branchText.textContent =
    data?.name
      ? `สาขา ${data.name} • ผู้ดูแลระบบเท่านั้น`
      : 'ผู้ดูแลระบบเท่านั้น'
}

async function loadStaff(){
  const {data,error}=await supabase.rpc('get_cancellation_staff')
  if(error) throw error
  for(const p of data||[]){
    const o=document.createElement('option'); o.value=p.id; o.textContent=`${p.full_name||'-'} (${p.role||'-'})`; el.staffFilter.appendChild(o)
  }
}
function render(payload){
  const s=payload?.summary||{}, rows=payload?.items||[]
  el.itemCount.textContent=Number(s.cancelled_items||0).toLocaleString('th-TH')
  el.lineCount.textContent=Number(s.cancelled_lines||0).toLocaleString('th-TH')
  el.amountTotal.textContent=money(s.cancelled_amount)
  el.historyBody.innerHTML=rows.map(r=>`<tr>
    <td>${esc(dateTime(r.cancelled_at))}</td>
    <td>${esc(orderLabel(r))}</td>
    <td>${esc(r.product_name)}</td>
    <td>${Number(r.quantity||0).toLocaleString('th-TH')}</td>
    <td>${money(r.unit_price)}</td>
    <td class="amount">${money(r.cancelled_amount)}</td>
    <td class="reason">${esc(r.cancel_reason||'-')}</td>
    <td>${esc(r.cancelled_by_name||'-')}<br><small>${esc(r.cancelled_by_role||'')}</small></td>
  </tr>`).join('')
  el.emptyState.style.display=rows.length?'none':'block'
}
async function loadHistory(){
  el.searchBtn.disabled=true; el.pageMessage.textContent='กำลังโหลด...'
  try{
    const {data,error}=await supabase.rpc('get_cancellation_history',{
      p_date_from:el.dateFrom.value, p_date_to:el.dateTo.value,
      p_cancelled_by:el.staffFilter.value||null, p_reason:el.reasonFilter.value||null
    })
    if(error) throw error
    render(data); el.pageMessage.textContent=''
  }catch(e){ console.error(e); el.pageMessage.textContent=e.message||'โหลดข้อมูลไม่สำเร็จ' }
  finally{el.searchBtn.disabled=false}
}
async function init(){
  try{
    await requireUser()
    const today=localDate(new Date()); el.dateFrom.value=today; el.dateTo.value=today
    await loadStaff(); await loadHistory()
  }catch(e){console.error(e);el.pageMessage.textContent=e.message||'เปิดรายงานไม่สำเร็จ'}
}
el.searchBtn.addEventListener('click',loadHistory)
el.backBtn.addEventListener('click',()=>history.back())
init()
