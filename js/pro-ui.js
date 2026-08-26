/*
=========================================================
JOKJUNG GLOBAL PROFESSIONAL UX/UI V3.1
Visual interaction feedback only.
No database logic. No auth logic. No sound.
=========================================================
*/

function initGlobalUiV31() {

    if (
        window.__JOKJUNG_GLOBAL_UI_V31__
    ) {
        return
    }

    window.__JOKJUNG_GLOBAL_UI_V31__ =
        true


    const pressSelector =
        'button,a,[role="button"]'


    document.addEventListener(
        'pointerdown',
        event => {

            const target =
                event.target.closest(
                    pressSelector
                )

            if (
                !target
                ||
                target.disabled
                ||
                target.getAttribute(
                    'aria-disabled'
                ) === 'true'
            ) {
                return
            }

            target.classList.add(
                'jj-pressed'
            )
        },
        true
    )


    const release =
        event => {

            const target =
                event.target.closest(
                    pressSelector
                )

            target?.classList.remove(
                'jj-pressed'
            )
        }


    document.addEventListener(
        'pointerup',
        release,
        true
    )

    document.addEventListener(
        'pointercancel',
        release,
        true
    )


    document.addEventListener(
        'click',
        event => {

            const target =
                event.target.closest(
                    pressSelector
                )

            if (
                !target
                ||
                target.disabled
                ||
                target.getAttribute(
                    'aria-disabled'
                ) === 'true'
            ) {
                return
            }

            target.classList.add(
                'jj-click-flash'
            )

            setTimeout(
                () => {
                    target.classList.remove(
                        'jj-click-flash'
                    )
                },
                160
            )
        },
        true
    )


    /*
     * Make accidental double submit less likely.
     * Only applies to native form submit buttons;
     * existing JS-managed buttons are untouched.
     */
    document.addEventListener(
        'submit',
        event => {

            const form =
                event.target

            const button =
                form?.querySelector(
                    'button[type="submit"]:focus'
                )

            if (!button) {
                return
            }

            button.dataset
                .jjSubmitting =
                '1'
        },
        true
    )
}


if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        initGlobalUiV31,
        {
            once: true
        }
    )
} else {
    initGlobalUiV31()
}
