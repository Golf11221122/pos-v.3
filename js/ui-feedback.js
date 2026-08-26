/*
=========================================================
JOKJUNG POS MAIN
UI FEEDBACK V3.0 — PHASE 1
=========================================================
- Tap sound on actionable buttons
- Success / Warning / Error sound
- Press visual feedback
- Message observer
- Toast feedback
- Web Audio only: no external audio files
=========================================================
*/

let audioContext = null
let soundEnabled = true
let lastMessageSignature = ''
let lastMessageAt = 0


function ensureAudio() {

    if (!soundEnabled) {
        return null
    }


    if (!audioContext) {

        const AudioContextClass =
            window.AudioContext
            ||
            window.webkitAudioContext


        if (!AudioContextClass) {
            return null
        }


        audioContext =
            new AudioContextClass()
    }


    if (
        audioContext.state ===
        'suspended'
    ) {
        audioContext.resume()
            .catch(() => {})
    }


    return audioContext
}


function tone({
    frequency = 520,
    duration = .05,
    gain = .035,
    type = 'sine',
    delay = 0
} = {}) {

    const ctx =
        ensureAudio()


    if (!ctx) {
        return
    }


    const oscillator =
        ctx.createOscillator()


    const volume =
        ctx.createGain()


    const start =
        ctx.currentTime
        +
        delay


    const end =
        start
        +
        duration


    oscillator.type =
        type


    oscillator.frequency
        .setValueAtTime(
            frequency,
            start
        )


    volume.gain
        .setValueAtTime(
            0.0001,
            start
        )


    volume.gain
        .exponentialRampToValueAtTime(
            Math.max(
                gain,
                0.0002
            ),
            start + .008
        )


    volume.gain
        .exponentialRampToValueAtTime(
            0.0001,
            end
        )


    oscillator
        .connect(volume)


    volume
        .connect(
            ctx.destination
        )


    oscillator.start(start)
    oscillator.stop(end + .02)
}


export function uiTap() {

    tone({
        frequency: 560,
        duration: .035,
        gain: .022,
        type: 'sine'
    })
}


export function uiMenuTap() {

    /*
     * V3.0.1
     * เสียงกดเมนูอาหารให้ชัดกว่าปุ่มทั่วไป
     * แต่ยังสั้นเพื่อไม่รบกวนหน้าร้าน
     */
    tone({
        frequency: 640,
        duration: .045,
        gain: .055,
        type: 'sine'
    })

    tone({
        frequency: 820,
        duration: .035,
        gain: .035,
        type: 'sine',
        delay: .028
    })
}


export function uiSuccess() {

    tone({
        frequency: 620,
        duration: .055,
        gain: .035
    })

    tone({
        frequency: 880,
        duration: .09,
        gain: .038,
        delay: .065
    })
}


export function uiWarning() {

    tone({
        frequency: 420,
        duration: .09,
        gain: .04,
        type: 'triangle'
    })

    tone({
        frequency: 350,
        duration: .11,
        gain: .038,
        type: 'triangle',
        delay: .09
    })
}


export function uiError() {

    tone({
        frequency: 240,
        duration: .12,
        gain: .045,
        type: 'square'
    })

    tone({
        frequency: 190,
        duration: .14,
        gain: .04,
        type: 'square',
        delay: .12
    })
}


function toastHost() {

    let host =
        document.getElementById(
            'uiFeedbackToastHost'
        )


    if (!host) {

        host =
            document.createElement(
                'div'
            )


        host.id =
            'uiFeedbackToastHost'


        document.body
            .appendChild(
                host
            )
    }


    return host
}


export function uiToast(
    text,
    type = 'info',
    timeout = 1800
) {

    const clean =
        String(
            text ||
            ''
        ).trim()


    if (!clean) {
        return
    }


    const item =
        document.createElement(
            'div'
        )


    item.className =
        `ui-feedback-toast ${type}`


    item.textContent =
        clean


    toastHost()
        .appendChild(
            item
        )


    setTimeout(
        () => {

            item.remove()

        },
        timeout
    )
}


function classifyMessage(
    text
) {

    const value =
        String(
            text ||
            ''
        )
            .trim()
            .toLowerCase()


    if (!value) {
        return null
    }


    const successWords = [
        'สำเร็จ',
        'ยืนยันออเดอร์แล้ว',
        'ส่งเข้าครัว',
        'อนุมัติส่วนลด',
        'ใช้โปรโมชั่นแล้ว',
        'ใช้คูปอง'
    ]


    const warningWords = [
        'กรุณา',
        'ยังไม่ได้',
        'ไม่มีสิทธิ์',
        'ไม่สามารถ',
        'ไม่ครบ',
        'หมด',
        'เกิน',
        'ถูกยกเลิก',
        'ตรวจสอบยอดใหม่'
    ]


    if (
        successWords.some(
            word =>
                value.includes(word)
        )
    ) {
        return 'success'
    }


    if (
        warningWords.some(
            word =>
                value.includes(word)
        )
    ) {
        return 'warning'
    }


    return 'error'
}


function feedbackForMessage(
    target
) {

    const text =
        target?.textContent
            ?.trim()
        ||
        ''


    target?.classList
        .remove(
            'ui-message-success',
            'ui-message-warning'
        )


    if (!text) {
        return
    }


    const type =
        classifyMessage(text)


    if (
        type ===
        'success'
    ) {

        target.classList
            .add(
                'ui-message-success'
            )

    } else if (
        type ===
        'warning'
    ) {

        target.classList
            .add(
                'ui-message-warning'
            )
    }


    const now =
        Date.now()


    const signature =
        `${type}:${text}`


    if (
        signature ===
        lastMessageSignature
        &&
        now - lastMessageAt <
        900
    ) {
        return
    }


    lastMessageSignature =
        signature

    lastMessageAt =
        now


    if (
        type ===
        'success'
    ) {

        uiSuccess()

    } else if (
        type ===
        'warning'
    ) {

        uiWarning()

    } else {

        uiError()
    }
}


function observeMessages() {

    document
        .querySelectorAll(
            '.message'
        )
        .forEach(
            target => {

                const observer =
                    new MutationObserver(
                        () =>
                            feedbackForMessage(
                                target
                            )
                    )


                observer.observe(
                    target,
                    {
                        childList: true,
                        characterData: true,
                        subtree: true
                    }
                )


                feedbackForMessage(
                    target
                )
            }
        )
}


function bindPressFeedback() {

    document.addEventListener(
        'pointerdown',
        event => {

            const target =
                event.target.closest(
                    'button,[role="button"]'
                )


            if (!target) {
                return
            }


            ensureAudio()


            if (
                target.disabled
                ||
                target.getAttribute(
                    'aria-disabled'
                )
                ===
                'true'
            ) {

                uiWarning()
                return
            }


            target.classList
                .add(
                    'ui-pressed'
                )
        },
        {
            capture: true
        }
    )


    const release =
        event => {

            const target =
                event.target.closest(
                    'button,[role="button"]'
                )


            target?.classList
                .remove(
                    'ui-pressed'
                )
        }


    document.addEventListener(
        'pointerup',
        release,
        {
            capture: true
        }
    )


    document.addEventListener(
        'pointercancel',
        release,
        {
            capture: true
        }
    )


    document.addEventListener(
        'click',
        event => {

            const target =
                event.target.closest(
                    'button,[role="button"]'
                )


            if (
                !target
                ||
                target.disabled
            ) {
                return
            }


            /*
             * เมนูอาหารใช้เสียงที่ดัง/ชัดกว่าปุ่มทั่วไป
             */
            const card =
                target.closest(
                    '.product-card'
                )


            if (card) {

                uiMenuTap()

            } else {

                uiTap()
            }


            /*
             * Product card gets short visual flash
             */
            if (card) {

                card.classList
                    .add(
                        'ui-flash'
                    )


                setTimeout(
                    () =>
                        card.classList
                            .remove(
                                'ui-flash'
                            ),
                    180
                )
            }
        },
        {
            capture: true
        }
    )
}


function observeBusyButtons() {

    const observer =
        new MutationObserver(
            records => {

                for (
                    const record
                    of
                    records
                ) {

                    const target =
                        record.target


                    if (
                        !(
                            target
                            instanceof
                            HTMLButtonElement
                        )
                    ) {
                        continue
                    }


                    const text =
                        target.textContent
                            ?.trim()
                        ||
                        ''


                    const busy =
                        target.disabled
                        &&
                        (
                            text.includes(
                                'กำลัง'
                            )
                            ||
                            text.includes(
                                'ตรวจสอบ'
                            )
                        )


                    target.classList
                        .toggle(
                            'ui-busy',
                            busy
                        )
                }
            }
        )


    document
        .querySelectorAll(
            'button'
        )
        .forEach(
            button =>
                observer.observe(
                    button,
                    {
                        attributes: true,
                        attributeFilter: [
                            'disabled'
                        ],
                        childList: true,
                        characterData: true,
                        subtree: true
                    }
                )
        )
}


function unlockAudioOnce() {

    const unlock =
        () => {

            ensureAudio()


            document.removeEventListener(
                'pointerdown',
                unlock,
                true
            )


            document.removeEventListener(
                'touchstart',
                unlock,
                true
            )
        }


    document.addEventListener(
        'pointerdown',
        unlock,
        true
    )


    document.addEventListener(
        'touchstart',
        unlock,
        true
    )
}


function initUiFeedback() {

    unlockAudioOnce()
    bindPressFeedback()
    observeMessages()
    observeBusyButtons()


    window.JOKJUNG_UI_FEEDBACK = {
        tap: uiTap,
        menuTap: uiMenuTap,
        success: uiSuccess,
        warning: uiWarning,
        error: uiError,
        toast: uiToast
    }
}


if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initUiFeedback,
        {
            once: true
        }
    )

} else {

    initUiFeedback()
}
