
import { supabase } from './supabase.js'

const $=id=>document.getElementById(id)
const el={
  code:$('pickupCodeInput'),lookup:$('lookupCodeBtn'),message:$('message'),
  card:$('resultCard'),status:$('resultStatus'),queue:$('queueText'),
  orderNo:$('orderNoText'),pickupCode:$('pickupCodeText'),total:$('totalText'),
  payment:$('paymentText'),confirm:$('confirmPickupBtn'),hint:$('resultHint')
}
const state={order:null}

const money=v=>new Intl.NumberFormat('th-TH',{
  style:'currency',currency:'THB',minimumFractionDigits:2
}).format(Number(v||0))

function msg(text='',type=''){
  el.message.textContent=text
  el.message.dataset.type=type
}

async function requireSession(){
  const {data:{session},error}=await supabase.auth.getSession()
  if(error) throw error
  if(!session){
    const target=encodeURIComponent(location.href)
    location.replace(`./index.html?next=${target}`)
    return false
  }
  return true
}

function pickupTokenFromUrl(){
  const raw=new URLSearchParams(location.search).get('t')
  if(!raw) return null
  return raw.trim()
}

function pickupCodeFromUrl(){
  const raw=new URLSearchParams(location.search).get('code')
  if(!raw) return null
  return raw.trim()
}

function render(order){
  state.order=order
  el.card.classList.remove('hidden')
  el.queue.textContent=order.queue_no??'-'
  el.orderNo.textContent=order.order_no||'-'
  el.pickupCode.textContent=order.pickup_code||'-'
  el.total.textContent=money(order.total)
  el.payment.textContent=order.payment_status||'-'

  if(order.can_pickup){
    el.status.textContent='✅ อาหารพร้อมส่งมอบ'
    el.status.dataset.kind='ready'
    el.confirm.classList.remove('hidden')
    el.hint.textContent='ตรวจเลขคิว/รหัสกับหน้าลูกค้า แล้วกดยืนยันส่งมอบ'
  }else{
    el.confirm.classList.add('hidden')

    if(['picked_up','completed'].includes(order.status)){
      el.status.textContent='✅ รับอาหารแล้ว'
      el.status.dataset.kind='done'
      el.hint.textContent='ออเดอร์นี้ถูกยืนยันรับอาหารไปแล้ว'
    }else if(order.status==='cancelled'){
      el.status.textContent='⛔ ออเดอร์ถูกยกเลิก'
      el.status.dataset.kind='bad'
      el.hint.textContent='ห้ามส่งมอบอาหาร'
    }else{
      el.status.textContent='⏳ ยังส่งมอบไม่ได้'
      el.status.dataset.kind='wait'
      el.hint.textContent=`สถานะปัจจุบัน: ${order.status||'-'}`
    }
  }
}

async function lookup({token=null,code=null}={}){
  msg('กำลังตรวจสอบ...')
  el.card.classList.add('hidden')

  const {data,error}=await supabase.rpc('self_order_lookup_pickup_v1',{
    p_pickup_token:token||null,
    p_pickup_code:code||null
  })
  if(error) throw error

  render(data)
  msg('')
}

async function confirmPickup(){
  if(!state.order?.id) return
  if(!confirm(`ยืนยันส่งมอบอาหาร\nคิว ${state.order.queue_no??'-'}\nรหัส ${state.order.pickup_code||'-'} ?`)) return

  el.confirm.disabled=true
  el.confirm.textContent='กำลังยืนยัน...'

  try{
    const {data,error}=await supabase.rpc('self_order_confirm_pickup_v1',{
      p_self_order_id:state.order.id
    })
    if(error) throw error

    msg('ส่งมอบอาหารเรียบร้อย ✅','success')
    await lookup({token:pickupTokenFromUrl(),code:pickupTokenFromUrl()?null:el.code.value.trim()})
  }catch(error){
    console.error(error)
    msg(error.message||'ยืนยันรับอาหารไม่สำเร็จ','error')
  }finally{
    el.confirm.disabled=false
    el.confirm.textContent='✅ ยืนยันส่งมอบอาหาร'
  }
}

async function init(){
  try{
    if(!await requireSession()) return
    const token=pickupTokenFromUrl()
    const code=pickupCodeFromUrl()
    if(token){
      await lookup({token})
    }else if(/^\d{4}$/.test(code||'')){
      el.code.value=code
      await lookup({code})
    }
  }catch(error){
    console.error(error)
    msg(error.message||'เปิดหน้ารับอาหารไม่สำเร็จ','error')
  }
}

el.lookup.addEventListener('click',async()=>{
  const code=el.code.value.trim()
  if(!/^\d{4}$/.test(code)){
    msg('กรุณากรอกรหัสรับอาหาร 4 หลัก','error')
    return
  }
  try{ await lookup({code}) }
  catch(error){ msg(error.message||'ไม่พบออเดอร์','error') }
})

el.code.addEventListener('keydown',e=>{
  if(e.key==='Enter') el.lookup.click()
})

el.confirm.addEventListener('click',confirmPickup)

init()
