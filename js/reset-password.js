import { supabase } from './supabase.js'

const newPasswordInput = document.getElementById('newPassword')
const confirmPasswordInput = document.getElementById('confirmPassword')
const savePasswordBtn = document.getElementById('savePasswordBtn')
const backLoginBtn = document.getElementById('backLoginBtn')
const message = document.getElementById('message')
let recoveryReady = false

function showMessage(text, isSuccess = false) {
    if (!message) return
    message.textContent = text
    message.style.color = isSuccess ? '#188038' : '#d93025'
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        recoveryReady = true
        showMessage('พร้อมตั้งรหัสผ่านใหม่', true)
    }
})

async function detectRecoverySession() {
    const { data } = await supabase.auth.getSession()
    if (data?.session) {
        recoveryReady = true
        showMessage('พร้อมตั้งรหัสผ่านใหม่', true)
    } else {
        showMessage('กำลังตรวจสอบลิงก์รีเซ็ตรหัสผ่าน...')
    }
}

async function saveNewPassword() {
    const password = String(newPasswordInput?.value || '')
    const confirm = String(confirmPasswordInput?.value || '')
    if (password.length < 8) return showMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
    if (password !== confirm) return showMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
    if (!recoveryReady) return showMessage('ลิงก์รีเซ็ตรหัสผ่านไม่พร้อมหรือหมดอายุ กรุณาขอลิงก์ใหม่')
    savePasswordBtn.disabled = true
    showMessage('กำลังบันทึกรหัสผ่านใหม่...')
    try {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        showMessage('ตั้งรหัสผ่านใหม่สำเร็จ', true)
        await supabase.auth.signOut()
        setTimeout(() => window.location.replace('./index.html'), 1000)
    } catch (error) {
        showMessage('ตั้งรหัสผ่านใหม่ไม่สำเร็จ: ' + (error?.message || 'ไม่ทราบสาเหตุ'))
    } finally {
        savePasswordBtn.disabled = false
    }
}

savePasswordBtn?.addEventListener('click', saveNewPassword)
confirmPasswordInput?.addEventListener('keydown', e => { if (e.key === 'Enter') saveNewPassword() })
backLoginBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.replace('./index.html')
})

detectRecoverySession()
