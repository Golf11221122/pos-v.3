import { supabase } from './supabase.js'
const $=id=>document.getElementById(id)
const el={branch:$('branchText'),refresh:$('refreshBtn'),search:$('searchInput'),tabs:$('filterTabs'),list:$('orderList'),empty:$('emptyState'),message:$('message'),pending:$('pendingCount'),kitchen:$('kitchenCount'),ready:$('readyCount'),problem:$('problemCount')}
const state={rows:[],filter:'active',timer:null,profile:null}
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
const money=v=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format(Number(v||0))
const time=v=>{if(!v)return '-';try{return new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return '-'}}
const padQueue=v=>{const n=Number(v||0);return n>0?String(Math.trunc(n)).padStart(3,'0'):'-'}
function msg(t='',bad=false){el.message.textContent=t;el.message.classList.toggle('error',bad)}
async function requireStaff(){
 const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;if(!session){location.replace('./index.html');return false}
 const {data,error:pe}=await supabase.from('profiles').select('id,full_name,role,branch_id').eq('id',session.user.id).maybeSingle();if(pe)throw pe;if(!data?.branch_id)throw new Error('บัญชียังไม่ได้กำหนดสาขา')
 state.profile=data;const {data:b}=await supabase.from('branches').select('name').eq('id',data.branch_id).maybeSingle();el.branch.textContent=`สาขา: ${b?.name||'-'}`;return true
}
function bucket(r){
 if(r.sale_stock_status==='blocked'||r.kitchen_dispatch_status==='blocked'||r.cancellation_status==='requested'||['pending','pending_approval'].includes(r.refund_status))return 'problem'
 if(r.status==='completed'||r.status==='picked_up')return 'completed'
 if(r.status==='ready_for_pickup')return 'ready_for_pickup'
 if(r.payment_status!=='paid')return 'payment_pending'
 return 'kitchen'
}
function matchesFilter(r){const b=bucket(r);if(state.filter==='all')return true;if(state.filter==='active')return b!=='completed'&&r.status!=='cancelled';return b===state.filter}
function render(){
 const k=el.search.value.trim().toLowerCase()
 const rows=state.rows.filter(r=>matchesFilter(r)&&(!k||[r.order_no,r.pickup_code,String(r.queue_no??''),r.customer_name,r.customer_phone].some(v=>String(v||'').toLowerCase().includes(k))))
 const c={payment_pending:0,kitchen:0,ready_for_pickup:0,problem:0};for(const r of state.rows){const b=bucket(r);if(c[b]!=null)c[b]++}
 el.pending.textContent=c.payment_pending;el.kitchen.textContent=c.kitchen;el.ready.textContent=c.ready_for_pickup;el.problem.textContent=c.problem
 el.empty.classList.toggle('hidden',rows.length>0)
 el.list.innerHTML=rows.map(r=>{const b=bucket(r),cls=b==='problem'?'problem':b==='ready_for_pickup'?'ready':'',kitchenLabel=r.status==='ready_for_pickup'?'พร้อมรับ':r.status==='dispatched'?'กำลังทำ':r.status==='paid'?'รอเข้าครัว':r.status||'-',saleLabel=r.sale_stock_status||'pending',canPickup=b==='ready_for_pickup'&&r.pickup_code
 return `<article class="order-card ${cls}"><div class="card-top"><div class="queue"><small>คิว</small>${esc(padQueue(r.queue_no))}</div><div class="order-meta"><strong>${esc(r.order_no)}</strong><small>${esc(time(r.created_at))}</small></div></div><div class="status-row"><span class="badge ${r.payment_status==='paid'?'green':'orange'}">Payment: ${esc(r.payment_status||'-')}</span><span class="badge ${b==='ready_for_pickup'?'green':'blue'}">Kitchen: ${esc(kitchenLabel)}</span><span class="badge ${saleLabel==='blocked'?'red':''}">Sale/Stock: ${esc(saleLabel)}</span>${b==='problem'?'<span class="badge red">⚠️ ต้องตรวจสอบ</span>':''}</div><div class="detail-grid"><div><span>รหัสรับอาหาร</span><strong>${esc(r.pickup_code||'-')}</strong></div><div><span>ยอด</span><strong>${esc(money(r.total))}</strong></div><div><span>ลูกค้า</span><strong>${esc(r.customer_name||'-')}</strong></div></div><div class="card-actions">${canPickup?`<a class="action-btn pickup" href="./pickup.html?code=${encodeURIComponent(r.pickup_code)}">🛍️ ตรวจรับอาหาร</a>`:''}<button class="action-btn secondary" type="button" data-copy="${esc(r.order_no)}">คัดลอกเลขออเดอร์</button></div></article>`}).join('')
}
async function load(){msg('กำลังอัปเดต...');const {data,error}=await supabase.rpc('self_order_live_center_v1');if(error){msg(error.message||'โหลดออเดอร์ไม่สำเร็จ',true);return}state.rows=Array.isArray(data)?data:[];msg('');render()}
el.tabs.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.filter=b.dataset.filter;el.tabs.querySelectorAll('.filter-tab').forEach(x=>x.classList.toggle('active',x===b));render()})
el.search.addEventListener('input',render);el.refresh.addEventListener('click',load)
el.list.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;try{await navigator.clipboard.writeText(b.dataset.copy);msg('คัดลอกเลขออเดอร์แล้ว')}catch{msg('คัดลอกไม่สำเร็จ',true)}})
async function init(){try{if(!await requireStaff())return;await load();state.timer=setInterval(()=>{if(!document.hidden)load()},5000)}catch(error){console.error(error);msg(error.message||'เปิดหน้า QR Self Order Live ไม่สำเร็จ',true)}}init()
