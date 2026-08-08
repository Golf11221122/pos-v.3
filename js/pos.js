function renderPromptPayQr() {

    if (!el.promptpayQr) {
        return
    }

    const amount =
        total()

    el.promptpayQr.innerHTML = ''

    el.qrAmountText.textContent =
        money(amount)

    try {

        const payload =
            generatePromptPayPayload(
                PROMPTPAY_PHONE,
                amount
            )

        new QRCode(
            el.promptpayQr,
            {
                text: payload,
                width: 220,
                height: 220,
                correctLevel:
                    QRCode.CorrectLevel.M
            }
        )

    }

    catch (error) {

        console.error(
            'PromptPay QR error:',
            error
        )

        el.promptpayQr.innerHTML =
            `<p style="color:red;">
                ${esc(error.message)}
            </p>`
    }
}
