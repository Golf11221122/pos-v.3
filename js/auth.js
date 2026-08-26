import { supabase } from './supabase.js'

const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const loginBtn = document.getElementById('loginBtn')
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn')
const message = document.getElementById('message')

function showMessage(text, isSuccess = false) {
    if (!message) return
    message.textContent = text
    message.style.color = isSuccess ? '#188038' : '#d93025'
}

async function login() {
    const email = String(emailInput?.value || '').trim().toLowerCase()
    const password = String(passwordInput?.value || '')
    if (!email || !password) return showMessage('กรุณากรอกอีเมลและรหัสผ่าน')
    loginBtn.disabled = true
    showMessage('กำลังเข้าสู่ระบบ...')
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        showMessage('เข้าสู่ระบบสำเร็จ', true)
        window.location.replace('./dashboard.html')
    } catch (error) {
        showMessage('เข้าสู่ระบบไม่สำเร็จ: ' + (error?.message || 'ไม่ทราบสาเหตุ'))
    } finally {
        loginBtn.disabled = false
    }
}

async function forgotPassword() {
    const email = String(emailInput?.value || '').trim().toLowerCase()
    if (!email) {
        showMessage('กรุณากรอกอีเมลก่อน')
        emailInput?.focus()
        return
    }
    forgotPasswordBtn.disabled = true
    showMessage('กำลังส่งลิงก์ตั้งรหัสผ่านใหม่...')
    try {
        const redirectTo = new URL('./reset-password.html', window.location.href).href
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw error
        showMessage('ถ้าอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ทางอีเมล', true)
    } catch (error) {
        showMessage('ส่งลิงก์ไม่สำเร็จ: ' + (error?.message || 'ไม่ทราบสาเหตุ'))
    } finally {
        forgotPasswordBtn.disabled = false
    }
}

loginBtn?.addEventListener('click', login)
forgotPasswordBtn?.addEventListener('click', forgotPassword)
passwordInput?.addEventListener('keydown', e => { if (e.key === 'Enter') login() })

const { data } = await supabase.auth.getSession()
if (data.session) window.location.replace('./dashboard.html')
