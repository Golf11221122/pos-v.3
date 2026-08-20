import { supabase } from './supabase.js'

const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const loginBtn = document.getElementById('loginBtn')
const signupBtn = document.getElementById('signupBtn')
const message = document.getElementById('message')

function showMessage(text, isSuccess = false) {
    message.textContent = text
    message.style.color = isSuccess ? '#188038' : '#d93025'
}

function getFormData() {
    const email = emailInput.value.trim()
    const password = passwordInput.value

    if (!email || !password) {
        showMessage('กรุณากรอกอีเมลและรหัสผ่าน')
        return null
    }

    if (password.length < 6) {
        showMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
        return null
    }

    return { email, password }
}

loginBtn.addEventListener('click', async () => {
    const formData = getFormData()

    if (!formData) return

    loginBtn.disabled = true
    showMessage('กำลังเข้าสู่ระบบ...')

    const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
    })

    loginBtn.disabled = false

    if (error) {
        showMessage('เข้าสู่ระบบไม่สำเร็จ: ' + error.message)
        return
    }

    showMessage('เข้าสู่ระบบสำเร็จ', true)

    setTimeout(() => {
        window.location.href = 'dashboard.html'
    }, 500)
})

signupBtn.addEventListener('click', async () => {
    const formData = getFormData()

    if (!formData) return

    signupBtn.disabled = true
    showMessage('กำลังสมัครสมาชิก...')

    const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
    })

    signupBtn.disabled = false

    if (error) {
        showMessage('สมัครสมาชิกไม่สำเร็จ: ' + error.message)
        return
    }

    showMessage('สมัครสมาชิกสำเร็จ สามารถเข้าสู่ระบบได้แล้ว', true)
})

const { data } = await supabase.auth.getSession()

if (data.session) {
    window.location.href = 'dashboard.html'
}