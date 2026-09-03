import { supabase } from './supabase.js'

const BRANCH_ID = '373f0680-d3aa-4f9c-8eac-d11d17f0f2df'

const qrEl = document.getElementById('storeQrCode')
const countdownEl = document.getElementById('storeQrCountdown')
const messageEl = document.getElementById('storeQrMessage')
const issueAndPrintBtn = document.getElementById('issueAndPrintBtn')
const emptyEl = document.getElementById('storeQrEmpty')
const activeEl = document.getElementById('storeQrActive')
const closeStoreQrBtn = document.getElementById('closeStoreQrBtn')
const backDashboardBtn = document.getElementById('backDashboardBtn')

let current = null
let timer = null

function setMessage(text='') {
    messageEl.textContent = text
}

function fmt(seconds) {
    const s = Math.max(0, Math.floor(seconds))
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function renderQr(url) {
    qrEl.innerHTML = ''
    new window.QRCode(qrEl, {
        text: url,
        width: 300,
        height: 300,
        correctLevel: window.QRCode.CorrectLevel.M
    })
}

function startTimer() {
    if (timer) clearInterval(timer)
    const tick = () => {
        if (!current?.expires_at) return
        const seconds = Math.ceil((new Date(current.expires_at).getTime() - Date.now()) / 1000)
        countdownEl.textContent = fmt(seconds)
        if (seconds <= 0) {
            clearInterval(timer)
            timer = null
            setMessage('QR ใบนี้หมดอายุแล้ว กดออก QR ใหม่เมื่อลูกค้ารายถัดไปต้องการสั่ง')
        }
    }
    tick()
    timer = setInterval(tick, 1000)
}

function getQrDataUrl() {
    const img = qrEl.querySelector('img')
    if (img?.src) return img.src
    const canvas = qrEl.querySelector('canvas')
    if (canvas) return canvas.toDataURL('image/png')
    return ''
}

function printCurrentQr() {
    const dataUrl = getQrDataUrl()
    if (!dataUrl || !current) {
        setMessage('ยังไม่มี QR สำหรับปริ้น')
        return
    }

    const expires = new Date(current.expires_at).toLocaleTimeString('th-TH', {
        hour: '2-digit', minute: '2-digit'
    })

    const w = window.open('', '_blank', 'width=520,height=760')
    if (!w) {
        setMessage('กรุณาอนุญาต Pop-up เพื่อปริ้น')
        return
    }

    w.document.write(`<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>QR สั่งกลับบ้าน</title>
<style>
@page{size:A5 portrait;margin:10mm}
*{box-sizing:border-box}
body{margin:0;font-family:Arial,"Noto Sans Thai",sans-serif;background:#fff;color:#111}
.card{border:2px solid #111;border-radius:18px;padding:22px;text-align:center}
.brand{font-size:14px;font-weight:800}
h1{font-size:27px;margin:8px 0 2px}
.sub{margin:0 0 14px;font-size:14px}
img{width:300px;height:300px;max-width:92%;object-fit:contain}
.exp{margin-top:13px;padding:10px;border:1px solid #bbb;border-radius:10px;font-weight:800}
.note{margin-top:12px;font-size:12px;line-height:1.5}
.one{margin-top:10px;font-size:13px;font-weight:800}
</style>
</head>
<body>
<div class="card">
  <div class="brand">CHAIXI BAMEEKIAO</div>
  <h1>สแกนสั่งกลับบ้าน</h1>
  <p class="sub">QR สำหรับลูกค้ารายนี้</p>
  <img src="${dataUrl}">
  <div class="exp">ใช้ได้ถึง ${expires} น.</div>
  <div class="one">ใช้เริ่มสั่งได้ 1 ครั้ง</div>
  <div class="note">หลังสแกน หน้าสั่งอาหารจะแสดงเวลาที่เหลือ<br>เมื่อหมดเวลา ต้องขอ QR ใบใหม่จากร้าน</div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script>
</body>
</html>`)
    w.document.close()
}

async function issueNewQr() {
    issueAndPrintBtn.disabled = true
    issueAndPrintBtn.textContent = 'กำลังออก QR...'
    setMessage('')

    try {
        const { data, error } = await supabase.rpc(
            'self_order_issue_print_qr_v1',
            { p_branch_id: BRANCH_ID }
        )
        if (error) throw error

        current = Array.isArray(data) ? data[0] : data
        if (!current?.scan_token) throw new Error('ไม่พบ QR token')

        const url = new URL('./self-order.html', window.location.href)
        url.searchParams.set('scan', current.scan_token)

        renderQr(url.href)
        emptyEl.classList.add('hidden')
        activeEl.classList.remove('hidden')
        startTimer()

        // Print immediately: 1 click = issue + print.
        setTimeout(printCurrentQr, 150)
    } catch (error) {
        console.error(error)
        setMessage(error.message || 'ออก QR ใหม่ไม่สำเร็จ')
    } finally {
        issueAndPrintBtn.disabled = false
        issueAndPrintBtn.textContent = '🖨️ ออก QR ใหม่และปริ้น'
    }
}

issueAndPrintBtn.addEventListener('click', issueNewQr)


function goDashboard() {
    window.location.href = './dashboard.html'
}

closeStoreQrBtn?.addEventListener('click', goDashboard)
backDashboardBtn?.addEventListener('click', goDashboard)
