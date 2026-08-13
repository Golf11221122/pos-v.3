import { supabase } from './supabase.js'


const S = {
    profile: null,
    branch: null,

    stations: [],
    products: [],

    printers: [],
    mappings: [],

    filter: '',
    search: ''
}


const $ = id =>
    document.getElementById(id)


const E = {
    branch:
        $('branchText'),

    stations:
        $('stations'),

    products:
        $('products'),

    stationCount:
        $('stationCount'),

    productCount:
        $('productCount'),

    unassignedCount:
        $('unassignedCount'),

    printerCount:
        $('printerCount'),

    allCount:
        $('allCount'),

    noneCount:
        $('noneCount'),

    title:
        $('title'),

    search:
        $('search'),

    empty:
        $('empty'),

    message:
        $('message'),


    /* STATION MODAL */

    modal:
        $('modal'),

    form:
        $('form'),

    id:
        $('id'),

    name:
        $('name'),

    code:
        $('code'),

    order:
        $('order'),

    active:
        $('active'),

    modalTitle:
        $('modalTitle'),

    deleteBtn:
        $('deleteBtn'),


    /* PRINTER */

    printerList:
        $('printerList'),

    printerEmpty:
        $('printerEmpty'),

    mappingList:
        $('mappingList'),

    mappingEmpty:
        $('mappingEmpty'),

    printerModal:
        $('printerModal'),

    printerForm:
        $('printerForm'),

    printerModalTitle:
        $('printerModalTitle'),

    printerId:
        $('printerId'),

    printerName:
        $('printerName'),

    printerKey:
        $('printerKey'),

    connectionType:
        $('connectionType'),

    deviceAddress:
        $('deviceAddress'),

    paperWidth:
        $('paperWidth'),

    printerActive:
        $('printerActive'),

    deletePrinterBtn:
        $('deletePrinterBtn')
}


function esc(value) {

    return String(
        value ?? ''
    )
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
        )
}


function message(
    text = '',
    ok = false
) {

    E.message.textContent =
        text

    E.message.classList.toggle(
        'ok',
        ok
    )
}


function normalizeKey(
    value
) {

    return String(
        value ?? ''
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            '_'
        )
        .replace(
            /[^a-z0-9_-]/g,
            ''
        )
}


async function auth() {

    const {
        data: {
            session
        },
        error
    } =
        await supabase
            .auth
            .getSession()


    if (error) {
        throw error
    }


    if (!session) {

        location.replace(
            './index.html'
        )

        return null
    }


    return session
}


async function loadProfile(
    uid
) {

    const {
        data,
        error
    } =
        await supabase
            .from(
                'profiles'
            )
            .select(
                'id,role,branch_id'
            )
            .eq(
                'id',
                uid
            )
            .maybeSingle()


    if (error) {
        throw error
    }


    if (
        !data?.branch_id
    ) {

        throw new Error(
            'บัญชียังไม่ได้กำหนดสาขา'
        )
    }


    /*
     * หน้าจัดการครัว/Printer
     * ให้ Admin / Manager เท่านั้น
     */
    if (
        ![
            'admin',
            'manager'
        ].includes(
            String(
                data.role || ''
            ).toLowerCase()
        )
    ) {

        throw new Error(
            'ไม่มีสิทธิ์จัดการ Kitchen Station / Printer'
        )
    }


    S.profile =
        data
}


async function loadBranch() {

    const {
        data,
        error
    } =
        await supabase
            .from(
                'branches'
            )
            .select(
                'id,name'
            )
            .eq(
                'id',
                S.profile.branch_id
            )
            .maybeSingle()


    if (error) {
        throw error
    }


    if (!data) {

        throw new Error(
            'ไม่พบสาขา'
        )
    }


    S.branch =
        data


    E.branch.textContent =
        `สาขา: ${data.name}`
}


async function load() {

    const [
        stationResult,
        productResult,
        printerResult,
        mappingResult
    ] =
        await Promise.all([

            supabase
                .from(
                    'kitchen_stations'
                )
                .select(
                    'id,name,code,display_order,is_active'
                )
                .eq(
                    'branch_id',
                    S.profile.branch_id
                )
                .order(
                    'display_order'
                )
                .order(
                    'name'
                ),

            supabase
                .from(
                    'products'
                )
                .select(
                    'id,name,price,is_active,kitchen_station_id'
                )
                .eq(
                    'branch_id',
                    S.profile.branch_id
                )
                .order(
                    'name'
                ),

            supabase
                .from(
                    'printer_devices'
                )
                .select(
                    'id,name,printer_key,connection_type,device_address,paper_width,is_active'
                )
                .eq(
                    'branch_id',
                    S.profile.branch_id
                )
                .order(
                    'name'
                ),

            supabase
                .from(
                    'kitchen_station_printers'
                )
                .select(
                    'id,kitchen_station_id,printer_id,auto_print,copies,is_primary,is_active'
                )
                .eq(
                    'branch_id',
                    S.profile.branch_id
                )
                .eq(
                    'is_primary',
                    true
                )
        ])


    if (
        stationResult.error
    ) {
        throw stationResult.error
    }


    if (
        productResult.error
    ) {
        throw productResult.error
    }


    if (
        printerResult.error
    ) {
        throw printerResult.error
    }


    if (
        mappingResult.error
    ) {
        throw mappingResult.error
    }


    S.stations =
        stationResult.data
        ||
        []


    S.products =
        productResult.data
        ||
        []


    S.printers =
        printerResult.data
        ||
        []


    S.mappings =
        mappingResult.data
        ||
        []


    render()
}


const count =
    stationId =>
        S.products.filter(
            product =>
                product.kitchen_station_id ===
                stationId
        ).length


function primaryMapping(
    stationId
) {

    return S.mappings.find(
        mapping =>
            mapping.kitchen_station_id ===
            stationId
            &&
            mapping.is_primary ===
            true
    )
    ||
    null
}


function printerName(
    printerId
) {

    return S.printers.find(
        printer =>
            printer.id ===
            printerId
    )?.name
    ||
    'ยังไม่กำหนด'
}


function render() {

    const none =
        S.products.filter(
            product =>
                !product.kitchen_station_id
        ).length


    E.stationCount.textContent =
        S.stations.length


    E.productCount.textContent =
        S.products.length


    E.unassignedCount.textContent =
        none


    E.printerCount.textContent =
        S.printers.length


    E.allCount.textContent =
        S.products.length


    E.noneCount.textContent =
        none


    document
        .querySelectorAll(
            '[data-filter]'
        )
        .forEach(
            button => {

                button
                    .classList
                    .toggle(
                        'active',
                        button.dataset.filter ===
                        S.filter
                    )
            }
        )


    E.stations.innerHTML =
        S.stations
            .map(
                station => {

                    const map =
                        primaryMapping(
                            station.id
                        )


                    const printerText =
                        map
                            ? ` • 🖨️ ${printerName(map.printer_id)}`
                            : ' • 🖨️ ยังไม่ผูก'


                    return `
                        <div class="stationWrap">

                            <button
                                class="
                                    station
                                    ${
                                        S.filter ===
                                        station.id
                                            ? 'active'
                                            : ''
                                    }
                                    ${
                                        station.is_active
                                            ? ''
                                            : 'inactive'
                                    }
                                "
                                data-filter="${esc(
                                    station.id
                                )}"
                                type="button"
                            >
                                <span>
                                    <b>
                                        ${esc(
                                            station.name
                                        )}
                                    </b>

                                    <small>
                                        ${esc(
                                            station.code
                                        )}
                                        ${
                                            station.is_active
                                                ? ''
                                                : ' • ปิดใช้งาน'
                                        }
                                        ${esc(
                                            printerText
                                        )}
                                    </small>
                                </span>

                                <b>
                                    ${count(
                                        station.id
                                    )}
                                </b>
                            </button>

                            <button
                                class="edit"
                                data-edit="${esc(
                                    station.id
                                )}"
                                type="button"
                            >
                                ✎
                            </button>

                        </div>
                    `
                }
            )
            .join('')


    renderProducts()
    renderPrinters()
    renderMappings()
}


function renderProducts() {

    let list =
        [
            ...S.products
        ]


    if (
        S.filter ===
        'unassigned'
    ) {

        list =
            list.filter(
                product =>
                    !product.kitchen_station_id
            )

    } else if (
        S.filter
    ) {

        list =
            list.filter(
                product =>
                    product.kitchen_station_id ===
                    S.filter
            )
    }


    const q =
        S.search
            .trim()
            .toLowerCase()


    if (q) {

        list =
            list.filter(
                product =>
                    (
                        product.name
                        ||
                        ''
                    )
                        .toLowerCase()
                        .includes(
                            q
                        )
            )
    }


    const station =
        S.stations.find(
            row =>
                row.id ===
                S.filter
        )


    E.title.textContent =
        S.filter ===
        'unassigned'

            ? 'ยังไม่กำหนดครัว'

            : (
                station?.name
                ||
                'เมนูทั้งหมด'
            )


    E.empty.classList.toggle(
        'hidden',
        Boolean(
            list.length
        )
    )


    E.products.classList.toggle(
        'hidden',
        !list.length
    )


    const options =
        S.stations
            .map(
                station =>
                    `
                    <option
                        value="${esc(
                            station.id
                        )}"
                        ${
                            station.is_active
                                ? ''
                                : 'disabled'
                        }
                    >
                        ${esc(
                            station.name
                        )}
                        ${
                            station.is_active
                                ? ''
                                : ' (ปิด)'
                        }
                    </option>
                    `
            )
            .join('')


    E.products.innerHTML =
        list
            .map(
                product =>
                    `
                    <div class="product">

                        <div>
                            <b>
                                ${esc(
                                    product.name
                                )}
                            </b>

                            <small>
                                ราคา
                                ${Number(
                                    product.price
                                    ||
                                    0
                                ).toLocaleString(
                                    'th-TH'
                                )}
                                บาท
                                ${
                                    product.is_active
                                        ? ''
                                        : ' • ปิดขาย'
                                }
                            </small>
                        </div>

                        <select
                            class="${
                                product.kitchen_station_id
                                    ? ''
                                    : 'none'
                            }"
                            data-product="${esc(
                                product.id
                            )}"
                        >
                            <option value="">
                                -- ยังไม่กำหนดครัว --
                            </option>

                            ${options}
                        </select>

                    </div>
                    `
            )
            .join('')


    E.products
        .querySelectorAll(
            'select'
        )
        .forEach(
            select => {

                const product =
                    S.products.find(
                        row =>
                            row.id ===
                            select.dataset.product
                    )


                select.value =
                    product
                        ?.kitchen_station_id
                    ||
                    ''
            }
        )
}


function connectionText(
    value
) {

    const map = {
        browser:
            'Browser Print',

        network:
            'Network / LAN',

        usb:
            'USB',

        bluetooth:
            'Bluetooth',

        bridge:
            'Local Print Bridge'
    }


    return map[value]
    ||
    value
}


function renderPrinters() {

    E.printerEmpty.classList.toggle(
        'hidden',
        Boolean(
            S.printers.length
        )
    )


    E.printerList.classList.toggle(
        'hidden',
        !S.printers.length
    )


    E.printerList.innerHTML =
        S.printers
            .map(
                printer =>
                    `
                    <article class="printer-card">

                        <div class="printer-info">

                            <strong>
                                ${esc(
                                    printer.name
                                )}
                            </strong>

                            <div class="printer-meta">

                                <span class="badge">
                                    ${esc(
                                        printer.printer_key
                                    )}
                                </span>

                                <span class="badge">
                                    ${esc(
                                        connectionText(
                                            printer.connection_type
                                        )
                                    )}
                                </span>

                                <span class="badge">
                                    ${Number(
                                        printer.paper_width
                                        ||
                                        80
                                    )}
                                    mm
                                </span>

                                ${
                                    printer.device_address

                                        ? `
                                            <span class="badge">
                                                ${esc(
                                                    printer.device_address
                                                )}
                                            </span>
                                        `

                                        : ''
                                }

                                <span
                                    class="
                                        badge
                                        ${
                                            printer.is_active
                                                ? 'active'
                                                : 'off'
                                        }
                                    "
                                >
                                    ${
                                        printer.is_active
                                            ? 'เปิดใช้งาน'
                                            : 'ปิดใช้งาน'
                                    }
                                </span>

                            </div>

                        </div>

                        <button
                            type="button"
                            data-edit-printer="${esc(
                                printer.id
                            )}"
                        >
                            ✎ แก้ไข
                        </button>

                    </article>
                    `
            )
            .join('')
}


function renderMappings() {

    E.mappingEmpty.classList.toggle(
        'hidden',
        Boolean(
            S.stations.length
        )
    )


    E.mappingList.classList.toggle(
        'hidden',
        !S.stations.length
    )


    const activePrinters =
        S.printers.filter(
            printer =>
                printer.is_active
        )


    E.mappingList.innerHTML =
        S.stations
            .map(
                station => {

                    const mapping =
                        primaryMapping(
                            station.id
                        )


                    const printerOptions =
                        activePrinters
                            .map(
                                printer =>
                                    `
                                    <option
                                        value="${esc(
                                            printer.id
                                        )}"
                                    >
                                        ${esc(
                                            printer.name
                                        )}
                                        •
                                        ${esc(
                                            connectionText(
                                                printer.connection_type
                                            )
                                        )}
                                        •
                                        ${Number(
                                            printer.paper_width
                                            ||
                                            80
                                        )}
                                        mm
                                    </option>
                                    `
                            )
                            .join('')


                    return `
                        <article
                            class="mapping-card"
                            data-mapping-station="${esc(
                                station.id
                            )}"
                        >

                            <div class="mapping-station">

                                <strong>
                                    ${esc(
                                        station.name
                                    )}
                                </strong>

                                <small>
                                    ${esc(
                                        station.code
                                    )}
                                </small>

                            </div>


                            <select
                                data-map-printer
                            >
                                <option value="">
                                    -- ยังไม่กำหนดเครื่อง --
                                </option>

                                ${printerOptions}
                            </select>


                            <label class="mapping-auto">

                                <input
                                    type="checkbox"
                                    data-map-auto
                                    ${
                                        mapping?.auto_print !==
                                        false
                                            ? 'checked'
                                            : ''
                                    }
                                >

                                Auto Print

                            </label>


                            <input
                                type="number"
                                min="1"
                                max="10"
                                step="1"
                                value="${
                                    Number(
                                        mapping?.copies
                                        ||
                                        1
                                    )
                                }"
                                data-map-copies
                                aria-label="จำนวนสำเนา"
                            >


                            <button
                                type="button"
                                class="primary save-map"
                                data-save-mapping="${esc(
                                    station.id
                                )}"
                            >
                                บันทึก
                            </button>

                        </article>
                    `
                }
            )
            .join('')


    E.mappingList
        .querySelectorAll(
            '[data-mapping-station]'
        )
        .forEach(
            card => {

                const stationId =
                    card.dataset
                        .mappingStation


                const mapping =
                    primaryMapping(
                        stationId
                    )


                const select =
                    card.querySelector(
                        '[data-map-printer]'
                    )


                if (
                    select
                ) {

                    select.value =
                        mapping?.printer_id
                        ||
                        ''
                }
            }
        )
}


async function assign(
    id,
    station
) {

    const product =
        S.products.find(
            row =>
                row.id ===
                id
        )


    if (!product) {
        return
    }


    const old =
        product
            .kitchen_station_id


    product.kitchen_station_id =
        station
        ||
        null


    render()


    const {
        error
    } =
        await supabase
            .from(
                'products'
            )
            .update({
                kitchen_station_id:
                    station
                    ||
                    null
            })
            .eq(
                'id',
                id
            )
            .eq(
                'branch_id',
                S.profile.branch_id
            )


    if (error) {

        product.kitchen_station_id =
            old


        render()


        throw error
    }


    message(
        'บันทึกครัวของเมนูแล้ว',
        true
    )
}


/* ========================================
   STATION MODAL
======================================== */

function openModal(
    station = null
) {

    E.modal.classList.remove(
        'hidden'
    )


    E.form.reset()


    E.id.value =
        station?.id
        ||
        ''


    E.name.value =
        station?.name
        ||
        ''


    E.code.value =
        station?.code
        ||
        ''


    E.order.value =
        station
            ?.display_order
        ??
        (
            S.stations.length
            *
            10
            +
            10
        )


    E.active.checked =
        station
            ? station.is_active !==
              false
            : true


    E.modalTitle.textContent =
        station
            ? 'แก้ไขครัว'
            : 'เพิ่มครัว'


    E.deleteBtn.classList.toggle(
        'hidden',
        !station
    )
}


function close() {

    E.modal.classList.add(
        'hidden'
    )
}


async function save() {

    const id =
        E.id.value.trim()


    const name =
        E.name.value.trim()


    const code =
        normalizeKey(
            E.code.value
        )


    const order =
        Number(
            E.order.value
            ||
            0
        )


    if (!name) {

        throw new Error(
            'กรุณากรอกชื่อครัว'
        )
    }


    if (!code) {

        throw new Error(
            'Code ต้องเป็นอังกฤษ/ตัวเลข/_/-'
        )
    }


    const payload = {
        branch_id:
            S.profile.branch_id,

        name,

        code,

        display_order:
            Number.isFinite(
                order
            )
                ? order
                : 0,

        is_active:
            E.active.checked
    }


    const query =
        id

            ? supabase
                .from(
                    'kitchen_stations'
                )
                .update(
                    payload
                )
                .eq(
                    'id',
                    id
                )
                .eq(
                    'branch_id',
                    S.profile.branch_id
                )

            : supabase
                .from(
                    'kitchen_stations'
                )
                .insert(
                    payload
                )


    const {
        error
    } =
        await query


    if (error) {
        throw error
    }


    close()


    await load()


    message(
        'บันทึก Kitchen Station แล้ว',
        true
    )
}


async function remove() {

    const id =
        E.id.value


    if (!id) {
        return
    }


    const station =
        S.stations.find(
            row =>
                row.id ===
                id
        )


    if (
        !confirm(
            `ต้องการลบ "${
                station?.name
                ||
                'ครัวนี้'
            }" หรือไม่? เมนูที่ผูกอยู่จะกลับเป็นยังไม่กำหนดครัว`
        )
    ) {

        return
    }


    const {
        error
    } =
        await supabase
            .from(
                'kitchen_stations'
            )
            .delete()
            .eq(
                'id',
                id
            )
            .eq(
                'branch_id',
                S.profile.branch_id
            )


    if (error) {
        throw error
    }


    if (
        S.filter ===
        id
    ) {

        S.filter =
            ''
    }


    close()


    await load()


    message(
        'ลบ Kitchen Station แล้ว',
        true
    )
}


/* ========================================
   PRINTER MODAL
======================================== */

function openPrinterModal(
    printer = null
) {

    E.printerModal
        .classList
        .remove(
            'hidden'
        )


    E.printerForm
        .reset()


    E.printerId.value =
        printer?.id
        ||
        ''


    E.printerName.value =
        printer?.name
        ||
        ''


    E.printerKey.value =
        printer?.printer_key
        ||
        ''


    E.connectionType.value =
        printer
            ?.connection_type
        ||
        'browser'


    E.deviceAddress.value =
        printer
            ?.device_address
        ||
        ''


    E.paperWidth.value =
        String(
            printer
                ?.paper_width
            ||
            80
        )


    E.printerActive.checked =
        printer
            ? printer.is_active !==
              false
            : true


    E.printerModalTitle.textContent =
        printer
            ? 'แก้ไขเครื่องพิมพ์'
            : 'เพิ่มเครื่องพิมพ์'


    E.deletePrinterBtn
        .classList
        .toggle(
            'hidden',
            !printer
        )
}


function closePrinterModal() {

    E.printerModal
        .classList
        .add(
            'hidden'
        )
}


async function savePrinter() {

    const id =
        E.printerId
            .value
            .trim()


    const name =
        E.printerName
            .value
            .trim()


    const printerKey =
        normalizeKey(
            E.printerKey
                .value
        )


    const connectionType =
        E.connectionType
            .value


    const deviceAddress =
        E.deviceAddress
            .value
            .trim()


    const paperWidth =
        Number(
            E.paperWidth
                .value
            ||
            80
        )


    if (!name) {

        throw new Error(
            'กรุณากรอกชื่อเครื่องพิมพ์'
        )
    }


    if (!printerKey) {

        throw new Error(
            'Printer Key ต้องเป็นอังกฤษ/ตัวเลข/_/-'
        )
    }


    if (
        ![
            58,
            80
        ].includes(
            paperWidth
        )
    ) {

        throw new Error(
            'ขนาดกระดาษไม่ถูกต้อง'
        )
    }


    const payload = {
        branch_id:
            S.profile.branch_id,

        name,

        printer_key:
            printerKey,

        connection_type:
            connectionType,

        device_address:
            deviceAddress
            ||
            null,

        paper_width:
            paperWidth,

        is_active:
            E.printerActive
                .checked
    }


    const query =
        id

            ? supabase
                .from(
                    'printer_devices'
                )
                .update(
                    payload
                )
                .eq(
                    'id',
                    id
                )
                .eq(
                    'branch_id',
                    S.profile.branch_id
                )

            : supabase
                .from(
                    'printer_devices'
                )
                .insert(
                    payload
                )


    const {
        error
    } =
        await query


    if (error) {

        if (
            error.code ===
            '23505'
        ) {

            throw new Error(
                'Printer Key นี้มีอยู่แล้วในสาขา'
            )
        }


        throw error
    }


    closePrinterModal()


    await load()


    message(
        'บันทึกเครื่องพิมพ์แล้ว',
        true
    )
}


async function deletePrinter() {

    const id =
        E.printerId
            .value
            .trim()


    if (!id) {
        return
    }


    const printer =
        S.printers.find(
            row =>
                row.id ===
                id
        )


    const usedBy =
        S.mappings.filter(
            mapping =>
                mapping.printer_id ===
                id
        ).length


    const warning =
        usedBy > 0

            ? `เครื่อง "${
                printer?.name
                ||
                'นี้'
            }" ถูกผูกกับ ${usedBy} Kitchen Station หากลบ Mapping จะถูกลบด้วย ต้องการลบหรือไม่?`

            : `ต้องการลบเครื่อง "${
                printer?.name
                ||
                'นี้'
            }" หรือไม่?`


    if (
        !confirm(
            warning
        )
    ) {

        return
    }


    const {
        error
    } =
        await supabase
            .from(
                'printer_devices'
            )
            .delete()
            .eq(
                'id',
                id
            )
            .eq(
                'branch_id',
                S.profile.branch_id
            )


    if (error) {
        throw error
    }


    closePrinterModal()


    await load()


    message(
        'ลบเครื่องพิมพ์แล้ว',
        true
    )
}


/* ========================================
   MAPPING
======================================== */

async function saveMapping(
    stationId
) {

    const card =
        E.mappingList
            .querySelector(
                `[data-mapping-station="${CSS.escape(
                    stationId
                )}"]`
            )


    if (!card) {
        return
    }


    const printerId =
        card.querySelector(
            '[data-map-printer]'
        )?.value
        ||
        ''


    const autoPrint =
        Boolean(
            card.querySelector(
                '[data-map-auto]'
            )?.checked
        )


    const copies =
        Number(
            card.querySelector(
                '[data-map-copies]'
            )?.value
            ||
            1
        )


    if (
        !Number.isInteger(
            copies
        )
        ||
        copies < 1
        ||
        copies > 10
    ) {

        throw new Error(
            'จำนวนสำเนาต้องอยู่ระหว่าง 1 - 10'
        )
    }


    /*
     * UI เวอร์ชันนี้ใช้ Primary Printer
     * 1 เครื่องต่อ Kitchen Station
     *
     * Database ยังรองรับหลาย mapping
     * สำหรับต่อยอดในอนาคต
     */
    const existing =
        S.mappings.filter(
            mapping =>
                mapping.kitchen_station_id ===
                stationId
        )


    if (!printerId) {

        if (
            existing.length
        ) {

            const {
                error
            } =
                await supabase
                    .from(
                        'kitchen_station_printers'
                    )
                    .delete()
                    .eq(
                        'branch_id',
                        S.profile.branch_id
                    )
                    .eq(
                        'kitchen_station_id',
                        stationId
                    )


            if (error) {
                throw error
            }
        }


        await load()


        message(
            'ยกเลิกการผูก Printer แล้ว',
            true
        )


        return
    }


    /*
     * ลบ mapping หลักเดิมก่อน
     * เพื่อให้แต่ละ Station มี Primary Printer เดียว
     */
    const {
        error: deleteError
    } =
        await supabase
            .from(
                'kitchen_station_printers'
            )
            .delete()
            .eq(
                'branch_id',
                S.profile.branch_id
            )
            .eq(
                'kitchen_station_id',
                stationId
            )


    if (deleteError) {
        throw deleteError
    }


    const {
        error: insertError
    } =
        await supabase
            .from(
                'kitchen_station_printers'
            )
            .insert({
                branch_id:
                    S.profile.branch_id,

                kitchen_station_id:
                    stationId,

                printer_id:
                    printerId,

                auto_print:
                    autoPrint,

                copies:
                    copies,

                is_primary:
                    true,

                is_active:
                    true
            })


    if (insertError) {
        throw insertError
    }


    await load()


    message(
        'บันทึก Printer Mapping แล้ว',
        true
    )
}


/* ========================================
   EVENTS
======================================== */

document.addEventListener(
    'click',
    async event => {

        try {

            const filterButton =
                event.target
                    .closest(
                        '[data-filter]'
                    )


            if (filterButton) {

                S.filter =
                    filterButton
                        .dataset
                        .filter


                render()


                return
            }


            const editStation =
                event.target
                    .closest(
                        '[data-edit]'
                    )


            if (editStation) {

                openModal(
                    S.stations.find(
                        row =>
                            row.id ===
                            editStation
                                .dataset
                                .edit
                    )
                )


                return
            }


            const editPrinter =
                event.target
                    .closest(
                        '[data-edit-printer]'
                    )


            if (editPrinter) {

                openPrinterModal(
                    S.printers.find(
                        row =>
                            row.id ===
                            editPrinter
                                .dataset
                                .editPrinter
                    )
                )


                return
            }


            const saveMappingButton =
                event.target
                    .closest(
                        '[data-save-mapping]'
                    )


            if (
                saveMappingButton
            ) {

                saveMappingButton.disabled =
                    true


                try {

                    await saveMapping(
                        saveMappingButton
                            .dataset
                            .saveMapping
                    )

                } finally {

                    saveMappingButton.disabled =
                        false
                }


                return
            }


            if (
                event.target.id ===
                'addBtn'
            ) {

                openModal()


                return
            }


            if (
                [
                    'addPrinterBtn',
                    'addPrinterBtn2'
                ].includes(
                    event.target.id
                )
            ) {

                openPrinterModal()


                return
            }


            if (
                event.target.id ===
                'closeBtn'
            ) {

                close()


                return
            }


            if (
                event.target.id ===
                'closePrinterBtn'
            ) {

                closePrinterModal()


                return
            }


            if (
                event.target.id ===
                'backBtn'
            ) {

                location.href =
                    './dashboard.html'


                return
            }


            if (
                event.target.id ===
                'deleteBtn'
            ) {

                await remove()


                return
            }


            if (
                event.target.id ===
                'deletePrinterBtn'
            ) {

                await deletePrinter()
            }


        } catch (error) {

            console.error(
                error
            )


            message(
                error.message
                ||
                'ดำเนินการไม่สำเร็จ'
            )
        }
    }
)


E.products.addEventListener(
    'change',
    async event => {

        const select =
            event.target
                .closest(
                    '[data-product]'
                )


        if (!select) {
            return
        }


        try {

            select.disabled =
                true


            await assign(
                select.dataset.product,
                select.value
            )


        } catch (error) {

            message(
                error.message
                ||
                'บันทึกไม่สำเร็จ'
            )


        } finally {

            select.disabled =
                false
        }
    }
)


E.search.addEventListener(
    'input',
    event => {

        S.search =
            event.target.value


        renderProducts()
    }
)


E.form.addEventListener(
    'submit',
    async event => {

        event.preventDefault()


        try {

            await save()

        } catch (error) {

            console.error(
                error
            )


            message(
                error.message
                ||
                'บันทึกไม่สำเร็จ'
            )
        }
    }
)


E.printerForm.addEventListener(
    'submit',
    async event => {

        event.preventDefault()


        try {

            await savePrinter()

        } catch (error) {

            console.error(
                error
            )


            message(
                error.message
                ||
                'บันทึกเครื่องพิมพ์ไม่สำเร็จ'
            )
        }
    }
)


E.modal.addEventListener(
    'click',
    event => {

        if (
            event.target ===
            E.modal
        ) {

            close()
        }
    }
)


E.printerModal.addEventListener(
    'click',
    event => {

        if (
            event.target ===
            E.printerModal
        ) {

            closePrinterModal()
        }
    }
)


document.addEventListener(
    'keydown',
    event => {

        if (
            event.key ===
            'Escape'
        ) {

            close()
            closePrinterModal()
        }
    }
)


async function init() {

    try {

        const session =
            await auth()


        if (!session) {
            return
        }


        await loadProfile(
            session.user.id
        )


        await loadBranch()


        await load()


    } catch (error) {

        console.error(
            error
        )


        message(
            error.message
            ||
            'เปิดหน้าจัดการครัวไม่สำเร็จ'
        )
    }
}


init()
