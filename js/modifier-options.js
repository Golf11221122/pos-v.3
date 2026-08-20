import { supabase } from './supabase.js'
import { applyRoleGuard } from './role-guard.js'

const state={profile:null,products:[],modifierManagerProductId:null,modifierManagerGroups:[]}
const $=id=>document.getElementById(id)
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
const money=v=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',minimumFractionDigits:2}).format(Number(v||0))
const message=(text='')=>{$('modifierManagerMessage').textContent=text}

async function loadProducts(){
 const {data,error}=await supabase.from('products').select('id,name,display_order').eq('branch_id',state.profile.branch_id).eq('is_active',true).order('display_order').order('name')
 if(error) throw error; state.products=data||[]
 const select=$('modifierManagerProduct'); select.innerHTML=state.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')
 state.modifierManagerProductId=state.products[0]?.id||null
 if(!state.modifierManagerProductId){$('modifierManagerGroups').innerHTML='<div class="modifier-manager-empty">ยังไม่มีสินค้าในสาขานี้</div>';return}
 select.value=state.modifierManagerProductId; await loadModifierManagerGroups()
}
async function loadModifierManagerGroups(){
 const productId=state.modifierManagerProductId,container=$('modifierManagerGroups'); if(!productId)return
 container.innerHTML='<div class="modifier-manager-empty">กำลังโหลด...</div>'
 try{const {data:links,error:linkError}=await supabase.from('product_modifier_groups').select('modifier_group_id,display_order').eq('product_id',productId).order('display_order',{ascending:true});if(linkError)throw linkError
 if(!links?.length){state.modifierManagerGroups=[];renderModifierManagerGroups();return}
 const ids=[...new Set(links.map(x=>x.modifier_group_id))];const [gr,op]=await Promise.all([supabase.from('modifier_groups').select('id,name,selection_type,is_required,min_select,max_select,display_order,is_active,branch_id').in('id',ids).eq('branch_id',state.profile.branch_id),supabase.from('modifier_options').select('id,modifier_group_id,name,price_adjustment,display_order,is_active').in('modifier_group_id',ids)]);if(gr.error)throw gr.error;if(op.error)throw op.error
 const orderMap=new Map(links.map(x=>[x.modifier_group_id,Number(x.display_order||0)]));state.modifierManagerGroups=(gr.data||[]).filter(g=>g.is_active!==false).map(g=>({...g,product_display_order:orderMap.get(g.id)??Number(g.display_order||0),options:(op.data||[]).filter(o=>o.modifier_group_id===g.id&&o.is_active!==false).sort((a,b)=>Number(a.display_order||0)-Number(b.display_order||0))})).sort((a,b)=>a.product_display_order-b.product_display_order);renderModifierManagerGroups()}catch(error){console.error(error);container.innerHTML='';message(error.message||'โหลดตัวเลือกไม่สำเร็จ')}}
function renderModifierManagerGroups(){const c=$('modifierManagerGroups'),groups=state.modifierManagerGroups||[];if(!groups.length){c.innerHTML='<div class="modifier-manager-empty"><strong>เมนูนี้ยังไม่มีตัวเลือก</strong><span>เลือก Template หรือกด “สร้างเอง”</span></div>';return}c.innerHTML=groups.map(g=>`<section class="modifier-manager-group"><div class="modifier-manager-group-head"><div><strong>${esc(g.name)}</strong><small>${g.selection_type==='multiple'?'เลือกได้หลายข้อ':'เลือกได้ 1 ข้อ'} • ${g.is_required?'บังคับเลือก':'ไม่บังคับ'}</small></div><div class="modifier-manager-actions"><button type="button" class="outline-btn" data-mm-action="edit-group" data-group-id="${esc(g.id)}">แก้กลุ่ม</button><button type="button" class="danger-link" data-mm-action="unlink-group" data-group-id="${esc(g.id)}">เอาออก</button></div></div><div class="modifier-manager-options">${(g.options||[]).map(o=>{const price=Number(o.price_adjustment||0),pt=price===0?'ไม่เพิ่มราคา':(price>0?`+${money(price)}`:money(price));return `<div class="modifier-manager-option"><div><strong>${esc(o.name)}</strong><small>${esc(pt)}</small></div><div class="modifier-manager-actions"><button type="button" class="outline-btn" data-mm-action="edit-option" data-group-id="${esc(g.id)}" data-option-id="${esc(o.id)}">แก้ชื่อ/ราคา</button><button type="button" class="danger-link" data-mm-action="delete-option" data-group-id="${esc(g.id)}" data-option-id="${esc(o.id)}">ลบ</button></div></div>`}).join('')||'<div class="modifier-manager-empty small">ยังไม่มีตัวเลือก</div>'}</div><button type="button" class="modifier-add-option-btn" data-mm-action="add-option" data-group-id="${esc(g.id)}">+ เพิ่มตัวเลือก</button></section>`).join('')}
const findGroup=id=>(state.modifierManagerGroups||[]).find(g=>g.id===id)||null
async function nextOrder(table,col=null,val=null){let q=supabase.from(table).select('display_order');if(col&&val)q=q.eq(col,val);const {data,error}=await q.order('display_order',{ascending:false}).limit(1);if(error)throw error;return Number(data?.[0]?.display_order||0)+10}
async function createGroup({
    name,
    selectionType = 'single',
    required = true,
    minSelect = 1,
    maxSelect = 1,
    options = []
}) {

    const productId =
        state.modifierManagerProductId

    const branchId =
        state.profile?.branch_id
        ||
        null

    const clean =
        String(
            name
            ||
            ''
        ).trim()


    if (!productId) {
        return message(
            'กรุณาเลือกเมนูก่อน'
        )
    }


    if (!branchId) {
        return message(
            'ไม่พบสาขาของผู้ใช้งาน'
        )
    }


    if (!clean) {
        return message(
            'กรุณาระบุชื่อกลุ่ม'
        )
    }


    try {

        message(
            'กำลังบันทึก...'
        )


        const {
            data: lastGroup,
            error: orderError
        } =
            await supabase
                .from(
                    'modifier_groups'
                )
                .select(
                    'display_order'
                )
                .eq(
                    'branch_id',
                    branchId
                )
                .order(
                    'display_order',
                    {
                        ascending:
                            false
                    }
                )
                .limit(
                    1
                )


        if (orderError) {
            throw orderError
        }


        const groupOrder =
            Number(
                lastGroup?.[0]?.display_order
                ||
                0
            )
            +
            10


        const {
            data: group,
            error: ge
        } =
            await supabase
                .from(
                    'modifier_groups'
                )
                .insert({
                    branch_id:
                        branchId,

                    name:
                        clean,

                    selection_type:
                        selectionType,

                    is_required:
                        Boolean(
                            required
                        ),

                    min_select:
                        Number(
                            minSelect
                            ||
                            0
                        ),

                    max_select:
                        Number(
                            maxSelect
                            ||
                            0
                        ),

                    display_order:
                        groupOrder,

                    is_active:
                        true
                })
                .select(
                    'id'
                )
                .single()


        if (ge) {
            throw ge
        }


        const po =
            await nextOrder(
                'product_modifier_groups',
                'product_id',
                productId
            )


        const {
            error: le
        } =
            await supabase
                .from(
                    'product_modifier_groups'
                )
                .insert({
                    product_id:
                        productId,

                    modifier_group_id:
                        group.id,

                    display_order:
                        po
                })


        if (le) {
            throw le
        }


        if (
            options.length
        ) {

            const rows =
                options
                    .map(
                        (
                            o,
                            i
                        ) => ({
                            modifier_group_id:
                                group.id,

                            name:
                                String(
                                    o.name
                                    ||
                                    ''
                                ).trim(),

                            price_adjustment:
                                Number(
                                    o.price
                                    ||
                                    0
                                ),

                            display_order:
                                (
                                    i
                                    +
                                    1
                                )
                                *
                                10,

                            is_active:
                                true
                        })
                    )
                    .filter(
                        o =>
                            o.name
                    )


            if (
                rows.length
            ) {

                const {
                    error
                } =
                    await supabase
                        .from(
                            'modifier_options'
                        )
                        .insert(
                            rows
                        )


                if (error) {
                    throw error
                }
            }
        }


        await loadModifierManagerGroups()


        message(
            'บันทึกตัวเลือกแล้ว'
        )

    } catch (e) {

        console.error(
            'Create modifier group error:',
            e
        )


        message(
            e.message
            ||
            'สร้างตัวเลือกไม่สำเร็จ'
        )
    }
}

async function sizeTemplate(){const t=prompt('ราคา “พิเศษ” เพิ่มจากธรรมดากี่บาท?','10');if(t===null)return;const price=Number(t||0);if(!Number.isFinite(price))return message('ราคาไม่ถูกต้อง');return createGroup({name:'ขนาด',options:[{name:'ธรรมดา',price:0},{name:'พิเศษ',price}]})}
async function spicyTemplate(){return createGroup({name:'ระดับความเผ็ด',options:[{name:'ไม่เผ็ด',price:0},{name:'เผ็ดน้อย',price:0},{name:'เผ็ดกลาง',price:0},{name:'เผ็ดมาก',price:0}]})}
async function customGroup(){const name=prompt('ชื่อกลุ่ม เช่น เส้น / ท็อปปิ้ง / ระดับหวาน');if(name===null)return;const type=prompt('1 = เลือกได้ 1 ข้อ\n2 = เลือกได้หลายข้อ','1');if(type===null)return;const selectionType=String(type).trim()==='2'?'multiple':'single',required=confirm('บังคับให้ต้องเลือกหรือไม่?');let maxSelect=1;if(selectionType==='multiple'){const m=prompt('เลือกได้สูงสุดกี่ข้อ? (0 = ไม่จำกัด)','0');if(m===null)return;maxSelect=Math.max(0,Number(m||0))}return createGroup({name,selectionType,required,minSelect:required?1:0,maxSelect})}
async function addOption(gid){const g=findGroup(gid);if(!g)return;const n=prompt(`ชื่อตัวเลือกใน “${g.name}”`);if(n===null||!String(n).trim())return;const t=prompt('ราคาเพิ่ม/ลดจากราคาปกติ\nเช่น 10 หรือ -5','0');if(t===null)return;const price=Number(t||0);if(!Number.isFinite(price))return message('ราคาไม่ถูกต้อง');try{const d=await nextOrder('modifier_options','modifier_group_id',gid);const {error}=await supabase.from('modifier_options').insert({modifier_group_id:gid,name:String(n).trim(),price_adjustment:price,display_order:d,is_active:true});if(error)throw error;await loadModifierManagerGroups();message('เพิ่มตัวเลือกแล้ว')}catch(e){message(e.message||'เพิ่มตัวเลือกไม่สำเร็จ')}}
async function editOption(gid,oid){const o=findGroup(gid)?.options?.find(x=>x.id===oid);if(!o)return;const n=prompt('ชื่อตัวเลือก',o.name);if(n===null)return;const t=prompt('ราคาเพิ่ม/ลดจากราคาปกติ',String(Number(o.price_adjustment||0)));if(t===null)return;const price=Number(t||0);if(!Number.isFinite(price))return message('ราคาไม่ถูกต้อง');const {error}=await supabase.from('modifier_options').update({name:String(n).trim(),price_adjustment:price}).eq('id',oid);if(error)return message(error.message);await loadModifierManagerGroups();message('แก้ไขชื่อ/ราคาแล้ว')}
async function deleteOption(gid,oid){const o=findGroup(gid)?.options?.find(x=>x.id===oid);if(!o||!confirm(`ลบตัวเลือก “${o.name}” หรือไม่?`))return;const {error}=await supabase.from('modifier_options').update({is_active:false}).eq('id',oid);if(error)return message(error.message);await loadModifierManagerGroups();message('ลบตัวเลือกแล้ว')}
async function editGroup(gid){const g=findGroup(gid);if(!g)return;const name=prompt('ชื่อกลุ่ม',g.name);if(name===null)return;const type=prompt('1 = เลือกได้ 1 ข้อ\n2 = เลือกได้หลายข้อ',g.selection_type==='multiple'?'2':'1');if(type===null)return;const st=String(type).trim()==='2'?'multiple':'single',required=confirm('บังคับให้ต้องเลือกหรือไม่?');let max=1;if(st==='multiple'){const t=prompt('เลือกได้สูงสุดกี่ข้อ? (0 = ไม่จำกัด)',String(Number(g.max_select||0)));if(t===null)return;max=Math.max(0,Number(t||0))}const {error}=await supabase.from('modifier_groups').update({name:String(name).trim(),selection_type:st,is_required:required,min_select:required?1:0,max_select:st==='single'?1:max}).eq('id',gid).eq('branch_id',state.profile.branch_id);if(error)return message(error.message);await loadModifierManagerGroups();message('แก้ไขกลุ่มแล้ว')}
async function unlinkGroup(gid){const g=findGroup(gid);if(!g||!confirm(`เอากลุ่ม “${g.name}” ออกจากเมนูนี้หรือไม่?`))return;const {error}=await supabase.from('product_modifier_groups').delete().eq('product_id',state.modifierManagerProductId).eq('modifier_group_id',gid);if(error)return message(error.message);await loadModifierManagerGroups();message('เอากลุ่มออกจากเมนูแล้ว')}
$('backBtn').addEventListener('click',()=>location.href='./dashboard.html')
$('modifierManagerProduct').addEventListener('change',async e=>{state.modifierManagerProductId=e.target.value||null;message('');await loadModifierManagerGroups()})
document.querySelectorAll('[data-template]').forEach(b=>b.addEventListener('click',()=>b.dataset.template==='size'?sizeTemplate():b.dataset.template==='spicy'?spicyTemplate():customGroup()))
$('modifierManagerGroups').addEventListener('click',e=>{const b=e.target.closest('[data-mm-action]');if(!b)return;const a=b.dataset.mmAction,g=b.dataset.groupId,o=b.dataset.optionId;if(a==='add-option')addOption(g);else if(a==='edit-option')editOption(g,o);else if(a==='delete-option')deleteOption(g,o);else if(a==='edit-group')editGroup(g);else if(a==='unlink-group')unlinkGroup(g)})
async function init(){try{const guard=await applyRoleGuard();if(!guard)return;state.profile=guard.profile;$('userName').textContent=guard.profile.full_name||guard.session.user.email;$('branchText').textContent='สาขาปัจจุบัน';await loadProducts()}catch(e){console.error(e);message(e.message||'โหลดหน้าจัดการตัวเลือกไม่สำเร็จ')}}
init()
