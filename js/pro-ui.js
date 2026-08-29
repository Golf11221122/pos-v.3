/*
=========================================================
CHAIXI BAMEEKIAO GLOBAL PROFESSIONAL UX/UI V3.13
Global visual feedback / loading polish.
No database logic. No auth logic. No sound.
=========================================================
*/

function initGlobalUiV313() {

    if (
        window.__CHAIXI BAMEEKIAO_GLOBAL_UI_V313__
    ) {
        return
    }

    window.__CHAIXI BAMEEKIAO_GLOBAL_UI_V313__ =
        true


    const root =
        document.documentElement

    const pageName =
        root.dataset.uiPage
        ||
        ''


    root.classList.add(
        'jj-ui-booting'
    )


    requestAnimationFrame(
        () => {

            root.classList.remove(
                'jj-ui-booting'
            )

            root.classList.add(
                'jj-ui-ready'
            )
        }
    )


    /* ========================================
       PRESS FEEDBACK
    ======================================== */

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


    /* ========================================
       NAVIGATION PROGRESS
    ======================================== */

    const navProgress =
        document.createElement(
            'div'
        )

    navProgress.id =
        'jjNavProgress'

    document.body.appendChild(
        navProgress
    )


    let navFinishTimer = null


    function startNavigationProgress() {

        clearTimeout(
            navFinishTimer
        )

        navProgress.classList
            .remove(
                'is-done'
            )

        requestAnimationFrame(
            () => {
                navProgress.classList
                    .add(
                        'is-active'
                    )
            }
        )
    }


    function finishNavigationProgress() {

        navProgress.classList
            .remove(
                'is-active'
            )

        navProgress.classList
            .add(
                'is-done'
            )

        navFinishTimer =
            setTimeout(
                () => {
                    navProgress.classList
                        .remove(
                            'is-done'
                        )
                },
                450
            )
    }


    document.addEventListener(
        'click',
        event => {

            const link =
                event.target.closest(
                    'a[href]'
                )

            if (!link) {
                return
            }


            const href =
                link.getAttribute(
                    'href'
                )


            if (
                !href
                ||
                href.startsWith('#')
                ||
                href.startsWith('javascript:')
                ||
                link.target === '_blank'
                ||
                link.hasAttribute(
                    'download'
                )
            ) {
                return
            }


            let url = null


            try {
                url =
                    new URL(
                        href,
                        location.href
                    )
            } catch (_) {
                return
            }


            if (
                url.origin
                !==
                location.origin
            ) {
                return
            }


            startNavigationProgress()
        },
        true
    )


    window.addEventListener(
        'pageshow',
        finishNavigationProgress
    )


    window.addEventListener(
        'beforeunload',
        startNavigationProgress
    )


    /* ========================================
       UNIFIED TOASTS
       POS already has its own sound/toast system.
    ======================================== */

    const toastEnabled =
        pageName !== 'pos'


    let toastHost = null
    const lastToastByElement =
        new WeakMap()


    function ensureToastHost() {

        if (!toastEnabled) {
            return null
        }


        if (toastHost) {
            return toastHost
        }


        toastHost =
            document.createElement(
                'div'
            )

        toastHost.id =
            'jjUnifiedToastHost'

        toastHost.setAttribute(
            'aria-live',
            'polite'
        )

        toastHost.setAttribute(
            'aria-atomic',
            'false'
        )

        document.body.appendChild(
            toastHost
        )

        return toastHost
    }


    function classifyToast(
        text,
        sourceElement = null
    ) {

        const value =
            String(text || '')
                .toLowerCase()


        const classes =
            sourceElement
                ? Array.from(
                    sourceElement
                        .classList
                )
                    .join(' ')
                    .toLowerCase()
                : ''


        if (
            classes.includes('success')
            ||
            value.includes('สำเร็จ')
            ||
            value.includes('เรียบร้อย')
            ||
            value.includes('success')
        ) {
            return 'success'
        }


        if (
            classes.includes('warning')
            ||
            value.includes('เตือน')
            ||
            value.includes('กรุณา')
            ||
            value.includes('warning')
        ) {
            return 'warning'
        }


        if (
            classes.includes('error')
            ||
            classes.includes('danger')
            ||
            value.includes('ผิดพลาด')
            ||
            value.includes('ไม่สำเร็จ')
            ||
            value.includes('ไม่สามารถ')
            ||
            value.includes('ไม่พบ')
            ||
            value.includes('ถูกปิด')
            ||
            value.includes('denied')
            ||
            value.includes('error')
            ||
            value.includes('failed')
        ) {
            return 'error'
        }


        return 'info'
    }


    function toastIcon(
        type
    ) {

        if (type === 'success') {
            return '✓'
        }

        if (type === 'warning') {
            return '!'
        }

        if (type === 'error') {
            return '×'
        }

        return 'i'
    }


    function showToast(
        text,
        type = 'info',
        duration = 3900
    ) {

        if (
            !toastEnabled
            ||
            !String(text || '')
                .trim()
        ) {
            return
        }


        const host =
            ensureToastHost()


        const toast =
            document.createElement(
                'div'
            )

        toast.className =
            `jj-unified-toast ${type}`


        const icon =
            document.createElement(
                'span'
            )

        icon.className =
            'jj-toast-icon'

        icon.textContent =
            toastIcon(
                type
            )


        const copy =
            document.createElement(
                'div'
            )

        copy.className =
            'jj-toast-copy'

        copy.textContent =
            String(text)
                .trim()


        toast.append(
            icon,
            copy
        )

        host.appendChild(
            toast
        )


        const close =
            () => {

                if (
                    !toast.isConnected
                ) {
                    return
                }

                toast.classList.add(
                    'is-leaving'
                )

                setTimeout(
                    () => {
                        toast.remove()
                    },
                    180
                )
            }


        setTimeout(
            close,
            duration
        )
    }


    const messageSelector =
        [
            '.message',
            '.page-message',
            '.form-message',
            '[data-ui-message]'
        ]
            .join(',')


    function inspectMessageElement(
        element
    ) {

        if (
            !toastEnabled
            ||
            !(element instanceof HTMLElement)
            ||
            !element.matches(
                messageSelector
            )
        ) {
            return
        }


        const text =
            element.textContent
                ?.replace(
                    /\s+/g,
                    ' '
                )
                .trim()
            ||
            ''


        if (
            !text
            ||
            element.hidden
            ||
            getComputedStyle(
                element
            ).display === 'none'
        ) {
            return
        }


        if (
            lastToastByElement.get(
                element
            )
            ===
            text
        ) {
            return
        }


        lastToastByElement.set(
            element,
            text
        )


        showToast(
            text,
            classifyToast(
                text,
                element
            )
        )
    }


    if (toastEnabled) {

        document
            .querySelectorAll(
                messageSelector
            )
            .forEach(
                inspectMessageElement
            )


        const messageObserver =
            new MutationObserver(
                mutations => {

                    for (
                        const mutation
                        of
                        mutations
                    ) {

                        const target =
                            mutation.target
                                .nodeType ===
                                Node.TEXT_NODE
                                ?
                                mutation.target
                                    .parentElement
                                :
                                mutation.target


                        if (
                            target
                            instanceof
                            HTMLElement
                        ) {

                            if (
                                target.matches(
                                    messageSelector
                                )
                            ) {
                                inspectMessageElement(
                                    target
                                )
                            }


                            target
                                .querySelectorAll?.(
                                    messageSelector
                                )
                                .forEach(
                                    inspectMessageElement
                                )
                        }
                    }
                }
            )


        messageObserver.observe(
            document.body,
            {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
                attributeFilter: [
                    'class',
                    'hidden',
                    'style'
                ]
            }
        )
    }


    /* ========================================
       AUTOMATIC BUSY VISUAL
       Only when an already-enabled button becomes disabled.
       This does NOT disable buttons by itself.
    ======================================== */

    const initiallyDisabled =
        new WeakSet()


    document
        .querySelectorAll(
            'button:disabled'
        )
        .forEach(
            button => {
                initiallyDisabled.add(
                    button
                )
            }
        )


    const busyTimers =
        new WeakMap()


    function setAutoBusy(
        button
    ) {

        if (
            !(button instanceof HTMLButtonElement)
        ) {
            return
        }


        if (
            button.disabled
            &&
            !initiallyDisabled.has(
                button
            )
        ) {

            button.dataset
                .jjAutoBusy =
                '1'


            clearTimeout(
                busyTimers.get(
                    button
                )
            )


            busyTimers.set(
                button,
                setTimeout(
                    () => {
                        delete button.dataset
                            .jjAutoBusy
                    },
                    15000
                )
            )

            return
        }


        delete button.dataset
            .jjAutoBusy


        clearTimeout(
            busyTimers.get(
                button
            )
        )
    }


    const disabledObserver =
        new MutationObserver(
            mutations => {

                for (
                    const mutation
                    of
                    mutations
                ) {

                    if (
                        mutation.type
                        !==
                        'attributes'
                        ||
                        mutation.attributeName
                        !==
                        'disabled'
                    ) {
                        continue
                    }


                    setAutoBusy(
                        mutation.target
                    )
                }
            }
        )


    document
        .querySelectorAll(
            'button'
        )
        .forEach(
            button => {

                disabledObserver.observe(
                    button,
                    {
                        attributes: true,
                        attributeFilter: [
                            'disabled'
                        ]
                    }
                )
            }
        )


    const newButtonObserver =
        new MutationObserver(
            mutations => {

                for (
                    const mutation
                    of
                    mutations
                ) {

                    for (
                        const node
                        of
                        mutation.addedNodes
                    ) {

                        if (
                            !(node instanceof HTMLElement)
                        ) {
                            continue
                        }


                        const buttons =
                            node.matches('button')
                                ?
                                [node]
                                :
                                Array.from(
                                    node.querySelectorAll(
                                        'button'
                                    )
                                )


                        buttons.forEach(
                            button => {

                                if (
                                    button.disabled
                                ) {
                                    initiallyDisabled.add(
                                        button
                                    )
                                }


                                disabledObserver.observe(
                                    button,
                                    {
                                        attributes: true,
                                        attributeFilter: [
                                            'disabled'
                                        ]
                                    }
                                )
                            }
                        )
                    }
                }
            }
        )


    newButtonObserver.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    )


    /* ========================================
       PUBLIC UI HELPERS FOR EXISTING/FUTURE PAGES
    ======================================== */

    window.JJUI =
        Object.assign(
            window.JJUI || {},
            {
                showToast,

                success(
                    text,
                    duration
                ) {
                    showToast(
                        text,
                        'success',
                        duration
                    )
                },

                warning(
                    text,
                    duration
                ) {
                    showToast(
                        text,
                        'warning',
                        duration
                    )
                },

                error(
                    text,
                    duration
                ) {
                    showToast(
                        text,
                        'error',
                        duration
                    )
                },

                info(
                    text,
                    duration
                ) {
                    showToast(
                        text,
                        'info',
                        duration
                    )
                },

                startNavigationProgress,
                finishNavigationProgress,

                setBusy(
                    element,
                    busy = true
                ) {

                    if (!element) {
                        return
                    }

                    element.setAttribute(
                        'aria-busy',
                        busy
                            ? 'true'
                            : 'false'
                    )
                }
            }
        )
}


if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        initGlobalUiV313,
        {
            once: true
        }
    )
} else {
    initGlobalUiV313()
}
