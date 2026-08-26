import { supabase } from './supabase.js'
import { applyRoleGuard } from './role-guard.js?v=3.12.0'

const $ = id =>
    document.getElementById(id)

const el = {
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),
    branchText: $('branchText'),
    userName: $('userName'),

    promotionId: $('promotionId'),
    promotionName: $('promotionName'),
    discountType: $('discountType'),
    discountValue: $('discountValue'),
    minimumSubtotal: $('minimumSubtotal'),
    maximumDiscount: $('maximumDiscount'),
    startsAt: $('startsAt'),
    endsAt: $('endsAt'),
    promotionActive: $('promotionActive'),

    savePromotionBtn: $('savePromotionBtn'),
    resetFormBtn: $('resetFormBtn'),
    formMessage: $('formMessage'),

    approverSelect: $('approverSelect'),
    approverPin: $('approverPin'),
    saveApproverPinBtn: $('saveApproverPinBtn'),
    pinMessage: $('pinMessage'),

    refreshBtn: $('refreshBtn'),
    promotionList: $('promotionList'),
    pageMessage: $('pageMessage')
}

const state = {
    session: null,
    profile: null,
    branch: null,
    promotions: [],
    approvers: []
}

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function money(value) {
    return new Intl.NumberFormat(
        'th-TH',
        {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }
    ).format(Number(value || 0))
}

function message(target, text = '', success = false) {
    if (!target) return

    target.textContent = text
    target.style.color =
        success
            ? '#137333'
            : '#b3261e'
}

function toLocalInput(value) {
    if (!value) return ''

    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''

    const pad = n => String(n).padStart(2, '0')

    return (
        `${d.getFullYear()}-`
        + `${pad(d.getMonth() + 1)}-`
        + `${pad(d.getDate())}T`
        + `${pad(d.getHours())}:`
        + `${pad(d.getMinutes())}`
    )
}

function formatDateTime(value) {
    if (!value) return '-'

    return new Intl.DateTimeFormat(
        'th-TH',
        {
            dateStyle: 'medium',
            timeStyle: 'short'
        }
    ).format(new Date(value))
}

function promotionStatus(promotion) {
    if (!promotion.is_active) {
        return {
            code: 'disabled',
            text: 'ปิดใช้งาน'
        }
    }

    const now = Date.now()
    const start = new Date(promotion.starts_at).getTime()
    const end = new Date(promotion.ends_at).getTime()

    if (now < start) {
        return {
            code: 'upcoming',
            text: 'ยังไม่เริ่ม'
        }
    }

    if (now > end) {
        return {
            code: 'expired',
            text: 'หมดอายุ'
        }
    }

    return {
        code: 'active',
        text: 'ใช้งานอยู่'
    }
}

function setDefaultDates() {
    const now = new Date()
    now.setSeconds(0, 0)

    const end = new Date(now)
    end.setDate(end.getDate() + 7)

    el.startsAt.value =
        toLocalInput(now)

    el.endsAt.value =
        toLocalInput(end)
}

function resetForm() {
    el.promotionId.value = ''
    el.promotionName.value = ''
    el.discountType.value = 'percent'
    el.discountValue.value = ''
    el.minimumSubtotal.value = '0'
    el.maximumDiscount.value = '0'
    el.promotionActive.checked = true

    setDefaultDates()

    el.savePromotionBtn.textContent =
        'บันทึกโปรโมชั่น'

    message(
        el.formMessage,
        ''
    )
}

async function loadPromotions() {
    el.promotionList.innerHTML =
        '<div class="empty-state">กำลังโหลด...</div>'

    const {
        data,
        error
    } =
        await supabase.rpc(
            'admin_list_promotions'
        )

    if (error) {
        throw error
    }

    state.promotions =
        Array.isArray(data)
            ? data
            : []

    renderPromotions()
}

function renderPromotions() {
    if (!state.promotions.length) {
        el.promotionList.innerHTML =
            '<div class="empty-state">ยังไม่มีโปรโมชั่น</div>'

        return
    }

    el.promotionList.innerHTML =
        state.promotions
            .map(
                promotion => {
                    const status =
                        promotionStatus(
                            promotion
                        )

                    const discountText =
                        promotion.discount_type ===
                            'percent'
                            ? `${Number(promotion.discount_value)}%`
                            : money(
                                promotion.discount_value
                            )

                    const maxText =
                        Number(
                            promotion.maximum_discount
                            ||
                            0
                        ) > 0
                            ? money(
                                promotion.maximum_discount
                            )
                            : 'ไม่จำกัด'

                    return `
                        <article class="promotion-card">

                            <div>
                                <h3>
                                    ${esc(promotion.name)}
                                </h3>

                                <span
                                    class="status-pill ${status.code}"
                                >
                                    ${status.text}
                                </span>

                                <div class="promotion-meta">
                                    <span>
                                        ลด ${discountText}
                                        • ยอดขั้นต่ำ ${money(promotion.minimum_subtotal)}
                                    </span>

                                    <span>
                                        ลดสูงสุด: ${maxText}
                                    </span>

                                    <span>
                                        เริ่ม: ${formatDateTime(promotion.starts_at)}
                                    </span>

                                    <span>
                                        จบ: ${formatDateTime(promotion.ends_at)}
                                    </span>

                                    <span>
                                        สร้างโดย: ${esc(promotion.created_by_name || '-')}
                                    </span>
                                </div>
                            </div>

                            <div class="promotion-actions">
                                <button
                                    class="outline-btn"
                                    type="button"
                                    data-edit-promotion="${esc(promotion.id)}"
                                >
                                    แก้ไข
                                </button>

                                <button
                                    class="outline-btn"
                                    type="button"
                                    data-toggle-promotion="${esc(promotion.id)}"
                                >
                                    ${promotion.is_active
                            ? 'ปิด'
                            : 'เปิด'
                        }
                                </button>
                            </div>

                        </article>
                    `
                }
            )
            .join('')
}

function editPromotion(id) {
    const promotion =
        state.promotions.find(
            item =>
                item.id === id
        )

    if (!promotion) return

    el.promotionId.value =
        promotion.id

    el.promotionName.value =
        promotion.name

    el.discountType.value =
        promotion.discount_type

    el.discountValue.value =
        Number(
            promotion.discount_value
            ||
            0
        )

    el.minimumSubtotal.value =
        Number(
            promotion.minimum_subtotal
            ||
            0
        )

    el.maximumDiscount.value =
        Number(
            promotion.maximum_discount
            ||
            0
        )

    el.startsAt.value =
        toLocalInput(
            promotion.starts_at
        )

    el.endsAt.value =
        toLocalInput(
            promotion.ends_at
        )

    el.promotionActive.checked =
        promotion.is_active !==
        false

    el.savePromotionBtn.textContent =
        'บันทึกการแก้ไข'

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    })
}

async function savePromotion() {
    const name =
        el.promotionName.value
            .trim()

    const discountType =
        el.discountType.value

    const discountValue =
        Number(
            el.discountValue.value
            ||
            0
        )

    const minimumSubtotal =
        Math.max(
            Number(
                el.minimumSubtotal.value
                ||
                0
            ),
            0
        )

    const maximumDiscount =
        Math.max(
            Number(
                el.maximumDiscount.value
                ||
                0
            ),
            0
        )

    if (!name) {
        return message(
            el.formMessage,
            'กรุณาระบุชื่อโปรโมชั่น'
        )
    }

    if (
        discountValue <=
        0
    ) {
        return message(
            el.formMessage,
            'มูลค่าส่วนลดต้องมากกว่า 0'
        )
    }

    if (
        discountType ===
        'percent'
        &&
        discountValue >
        100
    ) {
        return message(
            el.formMessage,
            'ส่วนลดแบบเปอร์เซ็นต์ต้องไม่เกิน 100%'
        )
    }

    if (
        !el.startsAt.value
        ||
        !el.endsAt.value
    ) {
        return message(
            el.formMessage,
            'กรุณากำหนดวันเวลาเริ่มและสิ้นสุด'
        )
    }

    const start =
        new Date(
            el.startsAt.value
        )

    const end =
        new Date(
            el.endsAt.value
        )

    if (
        end <=
        start
    ) {
        return message(
            el.formMessage,
            'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม'
        )
    }

    el.savePromotionBtn.disabled =
        true

    el.savePromotionBtn.textContent =
        'กำลังบันทึก...'

    try {
        const {
            error
        } =
            await supabase.rpc(
                'admin_save_promotion',
                {
                    p_promotion_id:
                        el.promotionId.value
                        ||
                        null,

                    p_name:
                        name,

                    p_discount_type:
                        discountType,

                    p_discount_value:
                        discountValue,

                    p_minimum_subtotal:
                        minimumSubtotal,

                    p_maximum_discount:
                        maximumDiscount,

                    p_starts_at:
                        start.toISOString(),

                    p_ends_at:
                        end.toISOString(),

                    p_is_active:
                        el.promotionActive.checked
                }
            )

        if (error) {
            throw error
        }

        message(
            el.formMessage,
            'บันทึกโปรโมชั่นสำเร็จ',
            true
        )

        resetForm()

        await loadPromotions()

    } catch (error) {
        console.error(
            'Save promotion error:',
            error
        )

        message(
            el.formMessage,
            error.message
            ||
            'บันทึกโปรโมชั่นไม่สำเร็จ'
        )

    } finally {
        el.savePromotionBtn.disabled =
            false

        el.savePromotionBtn.textContent =
            el.promotionId.value
                ? 'บันทึกการแก้ไข'
                : 'บันทึกโปรโมชั่น'
    }
}

async function togglePromotion(id) {
    const promotion =
        state.promotions.find(
            item =>
                item.id === id
        )

    if (!promotion) return

    const {
        error
    } =
        await supabase.rpc(
            'admin_set_promotion_active',
            {
                p_promotion_id:
                    id,

                p_is_active:
                    !promotion.is_active
            }
        )

    if (error) {
        throw error
    }

    await loadPromotions()
}

async function loadApprovers() {
    const {
        data,
        error
    } =
        await supabase.rpc(
            'admin_list_discount_approvers'
        )

    if (error) {
        throw error
    }

    state.approvers =
        Array.isArray(data)
            ? data
            : []

    el.approverSelect.innerHTML =
        state.approvers
            .map(
                person => `
                    <option value="${esc(person.id)}">
                        ${esc(person.full_name || person.id)}
                        • ${person.role === 'admin' ? 'Admin' : 'Manager'}
                        ${person.has_pin ? '• มี PIN แล้ว' : '• ยังไม่มี PIN'}
                    </option>
                `
            )
            .join('')
}

async function saveApproverPin() {
    const userId =
        el.approverSelect.value

    const pin =
        el.approverPin.value
            .trim()

    if (!userId) {
        return message(
            el.pinMessage,
            'กรุณาเลือกผู้อนุมัติ'
        )
    }

    if (
        !/^\d{6}$/.test(
            pin
        )
    ) {
        return message(
            el.pinMessage,
            'PIN ต้องเป็นตัวเลข 6 หลัก'
        )
    }

    el.saveApproverPinBtn.disabled =
        true

    try {
        const {
            error
        } =
            await supabase.rpc(
                'admin_set_discount_approval_pin',
                {
                    p_user_id:
                        userId,

                    p_pin:
                        pin
                }
            )

        if (error) {
            throw error
        }

        el.approverPin.value =
            ''

        message(
            el.pinMessage,
            'บันทึก PIN สำเร็จ',
            true
        )

        await loadApprovers()

    } catch (error) {
        console.error(
            'Set approval PIN error:',
            error
        )

        message(
            el.pinMessage,
            error.message
            ||
            'บันทึก PIN ไม่สำเร็จ'
        )

    } finally {
        el.saveApproverPinBtn.disabled =
            false
    }
}

async function init() {
    try {
        const guard =
            await applyRoleGuard()

        if (!guard) {
            return
        }

        state.session =
            guard.session

        state.profile =
            guard.profile

        if (
            guard.role !==
            'admin'
        ) {
            location.replace(
                './dashboard.html'
            )
            return
        }

        const {
            data: branch,
            error
        } =
            await supabase
                .from('branches')
                .select('id,name')
                .eq(
                    'id',
                    state.profile.branch_id
                )
                .maybeSingle()

        if (error) throw error

        state.branch =
            branch

        el.branchText.textContent =
            `สาขา: ${branch?.name || '-'}`

        el.userName.textContent =
            state.profile.full_name
            ||
            state.session.user.email
            ||
            'Admin'

        resetForm()

        await Promise.all([
            loadPromotions(),
            loadApprovers()
        ])

    } catch (error) {
        console.error(
            'Promotions init error:',
            error
        )

        message(
            el.pageMessage,
            error.message
            ||
            'เปิดหน้าจัดการโปรโมชั่นไม่สำเร็จ'
        )
    }
}

el.backBtn.onclick =
    () => {
        location.href =
            './dashboard.html'
    }

el.logoutBtn.onclick =
    async () => {
        await supabase.auth.signOut()
        location.replace('./index.html')
    }

el.resetFormBtn.onclick =
    resetForm

el.savePromotionBtn.onclick =
    savePromotion

el.saveApproverPinBtn.onclick =
    saveApproverPin

el.refreshBtn.onclick =
    async () => {
        await Promise.all([
            loadPromotions(),
            loadApprovers()
        ])
    }

el.promotionList.onclick =
    async event => {
        const edit =
            event.target.closest(
                '[data-edit-promotion]'
            )

        if (edit) {
            editPromotion(
                edit.dataset.editPromotion
            )
            return
        }

        const toggle =
            event.target.closest(
                '[data-toggle-promotion]'
            )

        if (toggle) {
            try {
                await togglePromotion(
                    toggle.dataset.togglePromotion
                )
            } catch (error) {
                message(
                    el.pageMessage,
                    error.message
                    ||
                    'เปลี่ยนสถานะโปรโมชั่นไม่สำเร็จ'
                )
            }
        }
    }

init()
