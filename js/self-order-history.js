import { supabase } from './supabase.js'

const $=id=>document.getElementById(id)
const el={
    dateFrom:$('dateFrom'),dateTo:$('dateTo'),status:$('statusFilter'),
    search:$('searchInput'),refresh:$('refreshBtn'),message:$('message'),
    list:$('orderList'),empty:$('emptyState'),count:$('resultCount'),
    sumTotal:$('sumTotal'),sumCompleted:$('sumCompleted'),sumExpired:$('sumExpired'),
    sumCancelled:$('sumCancelled'),sumBlocked:$('sumBlocked'),sumPaid:$('sumPaid'),
    drawer:$('detailDrawer'),backdrop:$('backdrop'),close:$('closeDetailBtn'),
    detailTitle:$('detailTitle'),detailSub:$('detailSub'),detailBody:$('detailBody')
}
const state={rows:[],summary:{}}

const esc=v=>String(v??'')
 .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
 .replaceAll('"','&quot;').replaceAll("'","&#039;")

const money=v=>new Intl.NumberFormat('th-TH',{
    style:'currency',currency:'THB',minimumFractionDigits:2
}).format(Number(v||0))

const dt=v=>{
    if(!v)return '-'
    return new Intl.DateTimeFormat('th-TH',{
        timeZone:'Asia/Bangkok',day:'2-digit',month:'short',year:'2-digit',
        hour:'2-digit',minute:'2-digit',second:'2-digit'
    }).format(new Date(v))
}

function ymd(date){
    const p=n=>String(n).padStart(2,'0')
    return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`
}

function initDates(){
    const now=new Date()
    const from=new Date(now)
    from.setDate(now.getDate()-6)
    el.dateFrom.value=ymd(from)
    el.dateTo.value=ymd(now)
}

function statusInfo(row){
    if(row.sale_stock_status==='blocked'||row.kitchen_dispatch_status==='blocked')
        return {key:'blocked',text:'มีปัญหา',cls:'bad'}
    if(row.status==='expired'||row.payment_status==='expired')
        return {key:'expired',text:'หมดเวลา',cls:'expired'}
    if(row.status==='cancelled'||(row.cancellation_status&&row.cancellation_status!=='none'))
        return {key:'cancelled',text:'ยกเลิก',cls:'cancelled'}
    if(row.refund_status&&row.refund_status!=='none')
        return {key:'refund',text:'คืนเงิน',cls:'refund'}
    if(row.status==='completed')
        return {key:'completed',text:'สำเร็จ',cls:'ok'}
    return {key:'other',text:row.status||'-',cls:''}
}

function setMessage(text='',bad=false){
    el.message.textContent=text
    el.message.classList.toggle('bad',bad)
}

function filtered(){
    const q=el.search.value.trim().toLowerCase()
    const filter=el.status.value
    return state.rows.filter(row=>{
        const info=statusInfo(row)
        const statusOk=filter==='all'||info.key===filter
        const hay=[
            row.order_no,row.queue_no,row.pickup_code,
            row.customer_name,row.customer_phone,row.invoice_no
        ].join(' ').toLowerCase()
        return statusOk&&(!q||hay.includes(q))
    })
}

function renderSummary(){
    const s=state.summary||{}
    el.sumTotal.textContent=s.total_orders||0
    el.sumCompleted.textContent=s.completed||0
    el.sumExpired.textContent=s.expired||0
    el.sumCancelled.textContent=Number(s.cancelled||0)+Number(s.refund||0)
    el.sumBlocked.textContent=s.blocked||0
    el.sumPaid.textContent=money(s.paid_total)
}

function render(){
    renderSummary()
    const rows=filtered()
    el.count.textContent=`${rows.length.toLocaleString('th-TH')} รายการ`
    el.empty.classList.toggle('hidden',rows.length>0)
    el.list.innerHTML=rows.map(row=>{
        const st=statusInfo(row)
        return `
        <button class="order-row" type="button" data-id="${esc(row.id)}">
            <div class="order-main">
                <div>
                    <strong>${esc(row.order_no||'-')}</strong>
                    <small>${esc(dt(row.created_at))}</small>
                </div>
                <span class="status ${st.cls}">${esc(st.text)}</span>
            </div>
            <div class="order-meta">
                <span>คิว <b>${esc(row.queue_no??'-')}</b></span>
                <span>รหัสรับ <b>${esc(row.pickup_code||'-')}</b></span>
                <span>ยอด <b>${esc(money(row.total))}</b></span>
                <span>Payment <b>${esc(row.payment_status||'-')}</b></span>
                <span>Sale/Stock <b>${esc(row.sale_stock_status||'-')}</b></span>
            </div>
            <div class="order-foot">
                <span>${esc(row.customer_name||'-')}</span>
                <span>${esc(row.invoice_no||row.last_event_type||'')}</span>
                <b>ดู Timeline ›</b>
            </div>
        </button>`
    }).join('')
}

async function requireSession(){
    const {data:{session},error}=await supabase.auth.getSession()
    if(error)throw error
    if(!session){location.replace('../index.html');return false}
    return true
}

async function load(){
    setMessage('กำลังโหลด...')
    const {data,error}=await supabase.rpc('backoffice_self_order_history_v1',{
        p_date_from:el.dateFrom.value||null,
        p_date_to:el.dateTo.value||null
    })
    if(error){setMessage(error.message||'โหลดไม่สำเร็จ',true);return}
    state.rows=Array.isArray(data?.orders)?data.orders:[]
    state.summary=data?.summary||{}
    setMessage('')
    render()
}

function eventLabel(type){
    const map={
        printed_qr_consumed:'สแกน QR และเริ่ม Session',
        cart_submitted:'ส่งออเดอร์',
        payment_started:'เริ่มชำระเงิน',
        payment_verified_paid:'ตรวจสลิปและชำระสำเร็จ',
        auto_dispatched_to_kitchen:'ส่งเข้าครัวอัตโนมัติ',
        ready_for_pickup:'อาหารพร้อมรับ',
        pickup_verified_by_staff:'พนักงานยืนยันรับอาหาร',
        pickup_completed:'ส่งมอบอาหารเรียบร้อย',
        auto_sale_stock_completed:'Sale + Stock สำเร็จ',
        auto_sale_stock_blocked:'Sale/Stock มีปัญหา',
        order_cancelled:'ยกเลิกออเดอร์',
        manual_refund_completed:'คืนเงินเสร็จ',
        slip_verification_failed:'ตรวจสลิปไม่ผ่าน',
        order_expired:'ออเดอร์หมดเวลา'
    }
    return map[type]||type||'-'
}

function timelineEvent(e){
    const actor=e.actor_name||e.actor_id
    return `
    <div class="timeline-item ${e.event_status==='ok'?'ok':''}">
        <div class="dot"></div>
        <div class="tl-body">
            <div class="tl-head">
                <strong>${esc(eventLabel(e.event_type))}</strong>
                <time>${esc(dt(e.created_at))}</time>
            </div>
            ${e.message?`<p>${esc(e.message)}</p>`:''}
            ${actor?`<small>ผู้ดำเนินการ: ${esc(actor)}</small>`:''}
        </div>
    </div>`
}

function kitchenTimeline(k){
    const items=Array.isArray(k?.items)?k.items:[]
    const times=[]
    items.forEach(i=>{
        if(i.kitchen_acknowledged_at)times.push({t:i.kitchen_acknowledged_at,label:`ครัวรับงาน • ${i.product_name}`})
        if(i.kitchen_started_at)times.push({t:i.kitchen_started_at,label:`เริ่มทำ • ${i.product_name}`})
        if(i.kitchen_ready_at)times.push({t:i.kitchen_ready_at,label:`พร้อมรับ • ${i.product_name}`})
        if(i.kitchen_served_at)times.push({t:i.kitchen_served_at,label:`ส่งมอบ • ${i.product_name}`})
        if(i.cancelled_at)times.push({t:i.cancelled_at,label:`ยกเลิก • ${i.product_name}`})
    })
    times.sort((a,b)=>new Date(a.t)-new Date(b.t))
    return times.map(x=>`
        <div class="mini-time"><span>${esc(dt(x.t))}</span><b>${esc(x.label)}</b></div>
    `).join('')
}

async function openDetail(id){
    el.detailTitle.textContent='กำลังโหลด...'
    el.detailSub.textContent=''
    el.detailBody.innerHTML='<div class="loading">กำลังอ่าน Timeline...</div>'
    el.drawer.classList.remove('hidden')
    el.backdrop.classList.remove('hidden')

    const {data,error}=await supabase.rpc(
        'backoffice_self_order_history_detail_v1',
        {p_self_order_id:id}
    )
    if(error){
        el.detailTitle.textContent='โหลดไม่สำเร็จ'
        el.detailBody.innerHTML=`<div class="error">${esc(error.message)}</div>`
        return
    }

    const o=data?.order||{}
    const payment=data?.payment||{}
    const sale=data?.sale||{}
    const events=Array.isArray(data?.events)?data.events:[]
    const items=Array.isArray(data?.items)?data.items:[]
    const st=statusInfo(o)

    el.detailTitle.textContent=o.order_no||'รายละเอียดออเดอร์'
    el.detailSub.textContent=`คิว ${o.queue_no??'-'} • รหัส ${o.pickup_code||'-'}`
    el.detailBody.innerHTML=`
        <section class="detail-summary">
            <div><span>สถานะ</span><strong class="${st.cls}">${esc(st.text)}</strong></div>
            <div><span>ยอด</span><strong>${esc(money(o.total))}</strong></div>
            <div><span>Payment</span><strong>${esc(o.payment_status||'-')}</strong></div>
            <div><span>Sale/Stock</span><strong>${esc(o.sale_stock_status||'-')}</strong></div>
        </section>

        ${o.sale_stock_error?`<div class="problem-box"><b>Sale/Stock Error</b><p>${esc(o.sale_stock_error)}</p></div>`:''}

        <section class="detail-section">
            <h3>⏱️ Lifecycle</h3>
            <div class="lifecycle">
                <div><span>สร้างออเดอร์</span><b>${esc(dt(o.created_at))}</b></div>
                <div><span>Paid</span><b>${esc(dt(o.paid_at))}</b></div>
                <div><span>พร้อมรับ</span><b>${esc(dt(o.ready_at))}</b></div>
                <div><span>รับแล้ว</span><b>${esc(dt(o.picked_up_at))}</b></div>
                <div><span>หมดเวลาชำระ</span><b>${esc(dt(o.expires_at))}</b></div>
            </div>
        </section>

        <section class="detail-section">
            <h3>🍜 รายการอาหาร</h3>
            <div class="items">
                ${items.length?items.map(i=>`
                    <div><span>${esc(i.product_name)} × ${esc(i.quantity)}</span><b>${esc(money(i.line_total))}</b></div>
                `).join(''):'<p class="muted">ไม่มีข้อมูลรายการ</p>'}
            </div>
        </section>

        <section class="detail-section">
            <h3>💳 Payment / Sale</h3>
            <div class="lifecycle">
                <div><span>Provider</span><b>${esc(payment.provider||'-')}</b></div>
                <div><span>ตรวจสลิป</span><b>${esc(dt(payment.verified_at))}</b></div>
                <div><span>Transaction Ref</span><b>${esc(payment.slip_transaction_ref||'-')}</b></div>
                <div><span>Invoice</span><b>${esc(sale.invoice_no||'-')}</b></div>
                <div><span>Sale Status</span><b>${esc(sale.status||'-')}</b></div>
            </div>
        </section>

        <section class="detail-section">
            <h3>👨‍🍳 Kitchen Timeline</h3>
            <div class="kitchen-times">
                ${kitchenTimeline(data?.kitchen)||'<p class="muted">ไม่มี Kitchen timeline</p>'}
            </div>
        </section>

        <section class="detail-section">
            <h3>🧾 Audit Events</h3>
            <div class="timeline">
                ${events.length?events.map(timelineEvent).join(''):'<p class="muted">ไม่มี event</p>'}
            </div>
        </section>
    `
}

function closeDetail(){
    el.drawer.classList.add('hidden')
    el.backdrop.classList.add('hidden')
}

el.refresh.addEventListener('click',load)
el.dateFrom.addEventListener('change',load)
el.dateTo.addEventListener('change',load)
el.status.addEventListener('change',render)
el.search.addEventListener('input',render)
el.list.addEventListener('click',e=>{
    const row=e.target.closest('[data-id]')
    if(row)openDetail(row.dataset.id)
})
el.close.addEventListener('click',closeDetail)
el.backdrop.addEventListener('click',closeDetail)
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail()})

async function init(){
    try{
        initDates()
        if(!await requireSession())return
        await load()
    }catch(error){
        console.error(error)
        setMessage(error.message||'เปิดหน้าประวัติไม่สำเร็จ',true)
    }
}
init()
