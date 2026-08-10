import { supabase } from './supabase.js'
import { applyRoleGuard } from './role-guard.js'


/* ========================================
   STATE
======================================== */

const state = {
    session: null,
    profile: null,
    branch: null,

    products: [],
    categories: [],
    branches: [],

    filteredProducts: [],
    deleteProductId: null,

    selectedImageFile: null,
    currentImageUrl: null,
    removeCurrentImage: false
}


/* ========================================
   ELEMENTS
======================================== */

const elements = {

    // SIDEBAR
    sidebar:
        document.getElementById('sidebar'),

    sidebarOverlay:
        document.getElementById('sidebarOverlay'),

    menuToggle:
        document.getElementById('menuToggle'),

    logoutBtn:
        document.getElementById('logoutBtn'),


    // USER
    branchLabel:
        document.getElementById('branchLabel'),

    userAvatar:
        document.getElementById('userAvatar'),

    userName:
        document.getElementById('userName'),

    userRole:
        document.getElementById('userRole'),


    // PAGE ACTIONS
    addProductBtn:
        document.getElementById('addProductBtn'),

    refreshBtn:
        document.getElementById('refreshBtn'),


    // FILTERS
    searchInput:
        document.getElementById('searchInput'),

    categoryFilter:
        document.getElementById('categoryFilter'),

    statusFilter:
        document.getElementById('statusFilter'),


    // SUMMARY
    totalProductCount:
        document.getElementById('totalProductCount'),

    activeProductCount:
        document.getElementById('activeProductCount'),

    inactiveProductCount:
        document.getElementById('inactiveProductCount'),

    categoryCount:
        document.getElementById('categoryCount'),


    // TABLE
    resultText:
        document.getElementById('resultText'),

    loadingState:
        document.getElementById('loadingState'),

    emptyState:
        document.getElementById('emptyState'),

    tableWrapper:
        document.getElementById('tableWrapper'),

    productTableBody:
        document.getElementById('productTableBody'),


    pageMessage:
        document.getElementById('pageMessage'),


    // PRODUCT MODAL
    productModal:
        document.getElementById('productModal'),

    modalTitle:
        document.getElementById('modalTitle'),

    closeModalBtn:
        document.getElementById('closeModalBtn'),

    cancelModalBtn:
        document.getElementById('cancelModalBtn'),


    // PRODUCT FORM
    productForm:
        document.getElementById('productForm'),

    productId:
        document.getElementById('productId'),

    productName:
        document.getElementById('productName'),

    productCategory:
        document.getElementById('productCategory'),

    productBranch:
        document.getElementById('productBranch'),

    productPrice:
        document.getElementById('productPrice'),

    productCost:
        document.getElementById('productCost'),

    productSku:
        document.getElementById('productSku'),

    productBarcode:
        document.getElementById('productBarcode'),

    productStock:
        document.getElementById('productStock'),

    displayOrder:
        document.getElementById('displayOrder'),

    productDescription:
        document.getElementById('productDescription'),

    productActive:
        document.getElementById('productActive'),


    // IMAGE
    productImageFile:
        document.getElementById('productImageFile'),

    selectImageBtn:
        document.getElementById('selectImageBtn'),

    removeImageBtn:
        document.getElementById('removeImageBtn'),

    imagePreview:
        document.getElementById('imagePreview'),

    imagePlaceholder:
        document.getElementById('imagePlaceholder'),

    imagePreviewElement:
        document.getElementById('imagePreviewElement'),

    imageFileName:
        document.getElementById('imageFileName'),


    // FORM
    saveProductBtn:
        document.getElementById('saveProductBtn'),

    formMessage:
        document.getElementById('formMessage'),


    // DELETE
    deleteModal:
        document.getElementById('deleteModal'),

    deleteProductName:
        document.getElementById('deleteProductName'),

    cancelDeleteBtn:
        document.getElementById('cancelDeleteBtn'),

    confirmDeleteBtn:
        document.getElementById('confirmDeleteBtn')
}


/* ========================================
   CONSTANTS
======================================== */

const PRODUCT_BUCKET =
    'products'


const MAX_IMAGE_SIZE =
    5 * 1024 * 1024


const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp'
]


/* ========================================
   HELPERS
======================================== */

function formatRole(role) {

    const roles = {
        admin:
            'ผู้ดูแลระบบ',

        manager:
            'ผู้จัดการ',

        staff:
            'พนักงาน',

        cashier:
            'พนักงานขาย',

        kitchen:
            'พนักงานครัว'
    }


    return (
        roles[role]
        ||
        role
        ||
        'ผู้ใช้งาน'
    )
}


function formatCurrency(value) {

    const number =
        Number(value || 0)


    return new Intl.NumberFormat(
        'th-TH',
        {
            style:
                'currency',

            currency:
                'THB',

            minimumFractionDigits:
                2
        }
    ).format(number)
}


function escapeHtml(value) {

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


/* ========================================
   MESSAGE
======================================== */

function setPageMessage(
    text = '',
    type = 'error'
) {

    if (!elements.pageMessage) {
        return
    }


    elements.pageMessage.textContent =
        text


    const colors = {
        error:
            '#d93025',

        success:
            '#188038',

        info:
            '#70757a'
    }


    elements.pageMessage.style.color =
        colors[type]
        ||
        colors.error
}


function setFormMessage(
    text = '',
    type = 'error'
) {

    if (!elements.formMessage) {
        return
    }


    elements.formMessage.textContent =
        text


    elements.formMessage.style.color =
        type === 'success'
            ? '#188038'
            : '#d93025'
}


/* ========================================
   LOADING
======================================== */

function showLoading() {

    elements.loadingState
        ?.classList
        .remove('hidden')


    elements.emptyState
        ?.classList
        .add('hidden')


    elements.tableWrapper
        ?.classList
        .add('hidden')
}


function hideLoading() {

    elements.loadingState
        ?.classList
        .add('hidden')
}


function setButtonLoading(
    button,
    loading,
    loadingText,
    normalText
) {

    if (!button) {
        return
    }


    button.disabled =
        loading


    button.textContent =
        loading
            ? loadingText
            : normalText
}


/* ========================================
   SESSION
======================================== */

async function requireSession() {

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

        window.location
            .replace(
                './index.html'
            )


        return null
    }


    state.session =
        session


    return session
}


/* ========================================
   PROFILE
======================================== */

async function loadProfile(
    userId
) {

    const {
        data,
        error
    } =
        await supabase
            .from(
                'profiles'
            )
            .select(`
                id,
                full_name,
                role,
                branch_id
            `)
            .eq(
                'id',
                userId
            )
            .maybeSingle()


    if (error) {
        throw error
    }


    if (!data) {

        throw new Error(
            'ไม่พบข้อมูลผู้ใช้งานในตาราง profiles'
        )
    }


    state.profile =
        data


    return data
}


/* ========================================
   BRANCHES
======================================== */

async function loadBranches() {

    const {
        data,
        error
    } =
        await supabase
            .from(
                'branches'
            )
            .select(
                'id,name,is_active'
            )
            .eq(
                'is_active',
                true
            )
            .order(
                'name',
                {
                    ascending:
                        true
                }
            )


    if (error) {
        throw error
    }


    state.branches =
        data || []


    state.branch =
        state.branches
            .find(
                branch =>
                    branch.id
                    ===
                    state.profile
                        ?.branch_id
            )
        ||
        null
}


/* ========================================
   CATEGORIES
======================================== */

async function loadCategories() {

    let query =
        supabase
            .from(
                'categories'
            )
            .select(`
                id,
                name,
                branch_id,
                is_active,
                display_order
            `)
            .eq(
                'is_active',
                true
            )
            .order(
                'display_order',
                {
                    ascending:
                        true
                }
            )
            .order(
                'name',
                {
                    ascending:
                        true
                }
            )


    if (
        state.profile
            ?.branch_id
    ) {

        query =
            query.eq(
                'branch_id',
                state.profile
                    .branch_id
            )
    }


    const {
        data,
        error
    } =
        await query


    if (error) {
        throw error
    }


    state.categories =
        data || []
}


/* ========================================
   PRODUCTS
======================================== */

async function loadProducts() {

    showLoading()


    setPageMessage(
        'กำลังโหลดสินค้า...',
        'info'
    )


    try {

        let query =
            supabase
                .from(
                    'products'
                )
                .select(`
                    id,
                    category_id,
                    branch_id,
                    name,
                    sku,
                    barcode,
                    price,
                    cost,
                    stock,
                    image_url,
                    is_active,
                    description,
                    display_order,
                    created_at,

                    categories (
                        id,
                        name
                    ),

                    branches (
                        id,
                        name
                    )
                `)
                .order(
                    'display_order',
                    {
                        ascending:
                            true
                    }
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                )


        if (
            state.profile
                ?.branch_id
        ) {

            query =
                query.eq(
                    'branch_id',
                    state.profile
                        .branch_id
                )
        }


        const {
            data,
            error
        } =
            await query


        if (error) {
            throw error
        }


        state.products =
            data || []


        applyFilters()

        updateSummary()


        setPageMessage('')


    } catch (error) {

        console.error(
            'Load products error:',
            error
        )


        throw error


    } finally {

        hideLoading()
    }
}


/* ========================================
   USER
======================================== */

function renderUser() {

    const email =
        state.session
            ?.user
            ?.email
        ||
        ''


    const name =
        state.profile
            ?.full_name
            ?.trim()
        ||
        email.split('@')[0]
        ||
        'ผู้ใช้งาน'


    const role =
        formatRole(
            state.profile
                ?.role
        )


    const branchName =
        state.branch
            ?.name
        ||
        'ยังไม่ได้กำหนดสาขา'


    if (
        elements.userName
    ) {

        elements.userName
            .textContent =
            name
    }


    if (
        elements.userRole
    ) {

        elements.userRole
            .textContent =
            role
    }


    if (
        elements.userAvatar
    ) {

        elements.userAvatar
            .textContent =
            name
                .charAt(0)
                .toUpperCase()
    }


    if (
        elements.branchLabel
    ) {

        elements.branchLabel
            .textContent =
            `สาขา: ${branchName}`
    }
}


/* ========================================
   CATEGORY OPTIONS
======================================== */

function populateCategoryOptions() {

    const filterOptions = [
        '<option value="">ทุกหมวดหมู่</option>'
    ]


    const formOptions = [
        '<option value="">เลือกหมวดหมู่</option>'
    ]


    state.categories
        .forEach(
            category => {

                const option = `
                    <option
                        value="${escapeHtml(
                    category.id
                )}"
                    >
                        ${escapeHtml(
                    category.name
                )}
                    </option>
                `


                filterOptions
                    .push(
                        option
                    )


                formOptions
                    .push(
                        option
                    )
            }
        )


    elements.categoryFilter
        .innerHTML =
        filterOptions
            .join('')


    elements.productCategory
        .innerHTML =
        formOptions
            .join('')
}


/* ========================================
   BRANCH OPTIONS
======================================== */

function populateBranchOptions() {

    const options = [
        '<option value="">เลือกสาขา</option>'
    ]


    state.branches
        .forEach(
            branch => {

                options.push(`
                    <option
                        value="${escapeHtml(
                    branch.id
                )}"
                    >
                        ${escapeHtml(
                    branch.name
                )}
                    </option>
                `)
            }
        )


    elements.productBranch
        .innerHTML =
        options.join('')


    if (
        state.profile
            ?.branch_id
    ) {

        elements.productBranch
            .value =
            state.profile
                .branch_id
    }
}


/* ========================================
   SUMMARY
======================================== */

function updateSummary() {

    const total =
        state.products.length


    const active =
        state.products
            .filter(
                product =>
                    product.is_active
            )
            .length


    const inactive =
        total - active


    elements.totalProductCount
        .textContent =
        total.toLocaleString(
            'th-TH'
        )


    elements.activeProductCount
        .textContent =
        active.toLocaleString(
            'th-TH'
        )


    elements.inactiveProductCount
        .textContent =
        inactive.toLocaleString(
            'th-TH'
        )


    elements.categoryCount
        .textContent =
        state.categories
            .length
            .toLocaleString(
                'th-TH'
            )
}


/* ========================================
   FILTER
======================================== */

function applyFilters() {

    const keyword =
        elements.searchInput
            .value
            .trim()
            .toLowerCase()


    const categoryId =
        elements.categoryFilter
            .value


    const status =
        elements.statusFilter
            .value


    state.filteredProducts =
        state.products
            .filter(
                product => {

                    const searchableText = [
                        product.name,
                        product.sku,
                        product.barcode,
                        product.description,
                        product.categories
                            ?.name
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase()


                    const matchesKeyword =
                        !keyword
                        ||
                        searchableText
                            .includes(
                                keyword
                            )


                    const matchesCategory =
                        !categoryId
                        ||
                        product.category_id
                        ===
                        categoryId


                    const matchesStatus =
                        !status
                        ||
                        (
                            status
                            ===
                            'active'
                            &&
                            product.is_active
                        )
                        ||
                        (
                            status
                            ===
                            'inactive'
                            &&
                            !product.is_active
                        )


                    return (
                        matchesKeyword
                        &&
                        matchesCategory
                        &&
                        matchesStatus
                    )
                }
            )


    renderProducts()
}


/* ========================================
   PRODUCT TABLE
======================================== */

function renderProducts() {

    const products =
        state.filteredProducts


    elements.resultText
        .textContent =
        `พบ ${products.length.toLocaleString(
            'th-TH'
        )} รายการ`


    if (
        products.length ===
        0
    ) {

        elements.tableWrapper
            .classList
            .add('hidden')


        elements.emptyState
            .classList
            .remove('hidden')


        const hasFilter =
            elements.searchInput
                .value
            ||
            elements.categoryFilter
                .value
            ||
            elements.statusFilter
                .value


        const title =
            elements.emptyState
                .querySelector(
                    'h3'
                )


        const text =
            elements.emptyState
                .querySelector(
                    'p'
                )


        if (title) {

            title.textContent =
                hasFilter
                    ? 'ไม่พบสินค้าที่ค้นหา'
                    : 'ยังไม่มีสินค้า'
        }


        if (text) {

            text.textContent =
                hasFilter
                    ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง'
                    : 'กดปุ่ม “เพิ่มสินค้า” เพื่อสร้างเมนูแรก'
        }


        return
    }


    elements.emptyState
        .classList
        .add('hidden')


    elements.tableWrapper
        .classList
        .remove('hidden')


    elements.productTableBody
        .innerHTML =
        products
            .map(
                createProductRow
            )
            .join('')
}


/* ========================================
   PRODUCT ROW
======================================== */

function createProductRow(
    product
) {

    const categoryName =
        product.categories
            ?.name
        ||
        'ไม่ระบุหมวดหมู่'


    const description =
        product.description
        ||
        'ไม่มีรายละเอียด'


    const sku =
        product.sku
        ||
        '-'


    const barcode =
        product.barcode
        ||
        '-'


    const imageHtml =
        product.image_url

            ? `
                <img
                    src="${escapeHtml(
                product.image_url
            )}"

                    alt="${escapeHtml(
                product.name
            )}"

                    loading="lazy"

                    onerror="
                        this.parentElement.innerHTML='🍽️'
                    "
                >
            `

            : '🍽️'


    const statusClass =
        product.is_active
            ? 'status-active'
            : 'status-inactive'


    const statusText =
        product.is_active
            ? '● เปิดขาย'
            : '● ปิดขาย'


    const toggleTitle =
        product.is_active
            ? 'ปิดการขาย'
            : 'เปิดการขาย'


    return `

        <tr>

            <td>

                <div class="product-cell">

                    <div class="product-image">

                        ${imageHtml}

                    </div>


                    <div class="product-details">

                        <strong>
                            ${escapeHtml(
        product.name
    )}
                        </strong>

                        <span>
                            ${escapeHtml(
        description
    )}
                        </span>

                    </div>

                </div>

            </td>


            <td>
                ${escapeHtml(
        categoryName
    )}
            </td>


            <td>

                <div class="code-cell">

                    <strong>
                        SKU:
                        ${escapeHtml(
        sku
    )}
                    </strong>

                    <span>
                        Barcode:
                        ${escapeHtml(
        barcode
    )}
                    </span>

                </div>

            </td>


            <td class="text-right">

                <strong>
                    ${formatCurrency(
        product.price
    )}
                </strong>

            </td>


            <td class="text-right">

                ${formatCurrency(
        product.cost
    )}

            </td>


            <td class="text-center">

                <button
                    type="button"

                    class="
                        status-badge
                        ${statusClass}
                    "

                    data-action="toggle"

                    data-id="${escapeHtml(
        product.id
    )}"

                    title="${toggleTitle}"

                    style="
                        border:0;
                        cursor:pointer;
                    "
                >

                    ${statusText}

                </button>

            </td>


            <td>

                <div class="actions">


                    <button
                        type="button"

                        class="action-button"

                        data-action="edit"

                        data-id="${escapeHtml(
        product.id
    )}"

                        title="แก้ไขสินค้า"
                    >

                        ✏️

                    </button>


                    <button
                        type="button"

                        class="
                            action-button
                            delete
                        "

                        data-action="delete"

                        data-id="${escapeHtml(
        product.id
    )}"

                        title="ลบสินค้า"
                    >

                        🗑️

                    </button>


                </div>

            </td>

        </tr>

    `
}


/* ========================================
   IMAGE HELPERS
======================================== */

function getFileExtension(
    file
) {

    const extensionFromName =
        file.name
            .split('.')
            .pop()
            ?.toLowerCase()


    const allowedExtensions = [
        'jpg',
        'jpeg',
        'png',
        'webp'
    ]


    if (
        allowedExtensions
            .includes(
                extensionFromName
            )
    ) {

        return (
            extensionFromName
                ===
                'jpeg'
                ? 'jpg'
                : extensionFromName
        )
    }


    const extensionByType = {

        'image/jpeg':
            'jpg',

        'image/png':
            'png',

        'image/webp':
            'webp'
    }


    return (
        extensionByType[
        file.type
        ]
        ||
        'jpg'
    )
}


function createImagePath(
    file
) {

    const extension =
        getFileExtension(
            file
        )


    const branchId =
        state.profile
            ?.branch_id
        ||
        'unassigned'


    const uniqueId =
        crypto.randomUUID()


    return (
        `${branchId}/${uniqueId}.${extension}`
    )
}


function validateImageFile(
    file
) {

    if (!file) {

        return (
            'กรุณาเลือกไฟล์รูปภาพ'
        )
    }


    if (
        !ALLOWED_IMAGE_TYPES
            .includes(
                file.type
            )
    ) {

        return (
            'รองรับเฉพาะไฟล์ JPG, PNG และ WebP'
        )
    }


    if (
        file.size >
        MAX_IMAGE_SIZE
    ) {

        return (
            'รูปสินค้าต้องมีขนาดไม่เกิน 5 MB'
        )
    }


    return null
}


function showImagePreview(
    source,
    fileName = ''
) {

    elements.imagePreviewElement
        .src =
        source


    elements.imagePreviewElement
        .classList
        .remove(
            'hidden'
        )


    elements.imagePlaceholder
        .classList
        .add(
            'hidden'
        )


    elements.removeImageBtn
        .classList
        .remove(
            'hidden'
        )


    elements.imageFileName
        .textContent =
        fileName
        ||
        'มีรูปสินค้าแล้ว'
}


function clearImagePreview() {

    elements.imagePreviewElement
        .removeAttribute(
            'src'
        )


    elements.imagePreviewElement
        .classList
        .add(
            'hidden'
        )


    elements.imagePlaceholder
        .classList
        .remove(
            'hidden'
        )


    elements.removeImageBtn
        .classList
        .add(
            'hidden'
        )


    elements.imageFileName
        .textContent =
        'รองรับ JPG, PNG และ WebP ขนาดไม่เกิน 5 MB'
}


function handleImageSelection(
    event
) {

    const file =
        event.target
            .files
        ?.[0]


    if (!file) {
        return
    }


    const validationError =
        validateImageFile(
            file
        )


    if (validationError) {

        elements.productImageFile
            .value =
            ''


        setFormMessage(
            validationError
        )


        return
    }


    state.selectedImageFile =
        file


    state.removeCurrentImage =
        false


    const previewUrl =
        URL.createObjectURL(
            file
        )


    showImagePreview(
        previewUrl,
        `${file.name} • ${(
            file.size /
            1024
        ).toFixed(0)} KB`
    )


    setFormMessage('')
}


function handleRemoveImage() {

    state.selectedImageFile =
        null


    state.removeCurrentImage =
        Boolean(
            state.currentImageUrl
        )


    elements.productImageFile
        .value =
        ''


    clearImagePreview()
}


/* ========================================
   STORAGE
======================================== */

async function uploadProductImage(
    file
) {

    const filePath =
        createImagePath(
            file
        )


    const {
        error
    } =
        await supabase
            .storage
            .from(
                PRODUCT_BUCKET
            )
            .upload(
                filePath,
                file,
                {
                    cacheControl:
                        '3600',

                    upsert:
                        false,

                    contentType:
                        file.type
                }
            )


    if (error) {
        throw error
    }


    const {
        data
    } =
        supabase
            .storage
            .from(
                PRODUCT_BUCKET
            )
            .getPublicUrl(
                filePath
            )


    if (
        !data
            ?.publicUrl
    ) {

        await deleteProductImageByPath(
            filePath
        )


        throw new Error(
            'ไม่สามารถสร้าง URL รูปสินค้าได้'
        )
    }


    return {

        filePath,

        publicUrl:
            data.publicUrl
    }
}


function getStoragePathFromPublicUrl(
    publicUrl
) {

    if (!publicUrl) {
        return null
    }


    try {

        const url =
            new URL(
                publicUrl
            )


        const marker =
            `/storage/v1/object/public/${PRODUCT_BUCKET}/`


        const markerIndex =
            url.pathname
                .indexOf(
                    marker
                )


        if (
            markerIndex ===
            -1
        ) {

            return null
        }


        return decodeURIComponent(
            url.pathname
                .slice(
                    markerIndex
                    +
                    marker.length
                )
        )


    } catch (error) {

        console.warn(
            'Invalid product image URL:',
            error
        )


        return null
    }
}


async function deleteProductImageByPath(
    filePath
) {

    if (!filePath) {
        return
    }


    const {
        error
    } =
        await supabase
            .storage
            .from(
                PRODUCT_BUCKET
            )
            .remove(
                [
                    filePath
                ]
            )


    if (error) {

        console.warn(
            'Delete image error:',
            error
        )
    }
}


async function deleteProductImageByUrl(
    publicUrl
) {

    const filePath =
        getStoragePathFromPublicUrl(
            publicUrl
        )


    if (!filePath) {
        return
    }


    await deleteProductImageByPath(
        filePath
    )
}


/* ========================================
   RESET FORM
======================================== */

function resetProductForm() {

    elements.productForm
        .reset()


    elements.productId
        .value =
        ''


    elements.productCost
        .value =
        '0'


    elements.productStock
        .value =
        '0'


    elements.displayOrder
        .value =
        '0'


    elements.productActive
        .checked =
        true


    elements.productImageFile
        .value =
        ''


    state.selectedImageFile =
        null


    state.currentImageUrl =
        null


    state.removeCurrentImage =
        false


    clearImagePreview()


    if (
        state.profile
            ?.branch_id
    ) {

        elements.productBranch
            .value =
            state.profile
                .branch_id
    }


    setFormMessage('')
}


/* ========================================
   ADD PRODUCT
======================================== */

function openAddModal() {

    resetProductForm()


    elements.modalTitle
        .textContent =
        'เพิ่มสินค้า'


    elements.saveProductBtn
        .textContent =
        'บันทึกสินค้า'


    elements.productModal
        .classList
        .remove(
            'hidden'
        )


    setTimeout(
        () => {

            elements.productName
                .focus()

        },
        50
    )
}


/* ========================================
   EDIT PRODUCT
======================================== */

function openEditModal(
    productId
) {

    const product =
        state.products
            .find(
                item =>
                    item.id
                    ===
                    productId
            )


    if (!product) {

        setPageMessage(
            'ไม่พบข้อมูลสินค้า'
        )


        return
    }


    resetProductForm()


    elements.modalTitle
        .textContent =
        'แก้ไขสินค้า'


    elements.saveProductBtn
        .textContent =
        'บันทึกการแก้ไข'


    elements.productId.value =
        product.id


    elements.productName.value =
        product.name
        ||
        ''


    elements.productCategory.value =
        product.category_id
        ||
        ''


    elements.productBranch.value =
        product.branch_id
        ||
        ''


    elements.productPrice.value =
        Number(
            product.price
            ||
            0
        )


    elements.productCost.value =
        Number(
            product.cost
            ||
            0
        )


    elements.productSku.value =
        product.sku
        ||
        ''


    elements.productBarcode.value =
        product.barcode
        ||
        ''


    elements.productStock.value =
        Number(
            product.stock
            ||
            0
        )


    elements.displayOrder.value =
        Number(
            product.display_order
            ||
            0
        )


    elements.productDescription.value =
        product.description
        ||
        ''


    elements.productActive.checked =
        Boolean(
            product.is_active
        )


    state.currentImageUrl =
        product.image_url
        ||
        null


    state.selectedImageFile =
        null


    state.removeCurrentImage =
        false


    if (
        product.image_url
    ) {

        showImagePreview(
            product.image_url,
            'รูปสินค้าปัจจุบัน'
        )

    } else {

        clearImagePreview()
    }


    elements.productModal
        .classList
        .remove(
            'hidden'
        )


    setTimeout(
        () => {

            elements.productName
                .focus()

        },
        50
    )
}


/* ========================================
   CLOSE PRODUCT MODAL
======================================== */

function closeProductModal() {

    elements.productModal
        .classList
        .add(
            'hidden'
        )


    resetProductForm()
}


/* ========================================
   VALIDATION
======================================== */

function validateProductForm() {

    const name =
        elements.productName
            .value
            .trim()


    const categoryId =
        elements.productCategory
            .value


    const branchId =
        elements.productBranch
            .value


    const price =
        Number(
            elements.productPrice
                .value
        )


    const cost =
        Number(
            elements.productCost
                .value
            ||
            0
        )


    const stock =
        Number(
            elements.productStock
                .value
            ||
            0
        )


    if (!name) {

        return (
            'กรุณากรอกชื่อสินค้า'
        )
    }


    if (!categoryId) {

        return (
            'กรุณาเลือกหมวดหมู่'
        )
    }


    if (!branchId) {

        return (
            'กรุณาเลือกสาขา'
        )
    }


    if (
        !Number.isFinite(
            price
        )
        ||
        price < 0
    ) {

        return (
            'ราคาขายต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'
        )
    }


    if (
        !Number.isFinite(
            cost
        )
        ||
        cost < 0
    ) {

        return (
            'ต้นทุนต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'
        )
    }


    if (
        !Number.isFinite(
            stock
        )
        ||
        stock < 0
    ) {

        return (
            'จำนวนคงเหลือต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'
        )
    }


    return null
}


/* ========================================
   PRODUCT PAYLOAD
======================================== */

function getProductPayload(
    imageUrl = null
) {

    return {

        name:
            elements.productName
                .value
                .trim(),

        category_id:
            elements.productCategory
                .value,

        branch_id:
            elements.productBranch
                .value,


        price:
            Number(
                elements.productPrice
                    .value
            ),

        cost:
            Number(
                elements.productCost
                    .value
                ||
                0
            ),

        stock:
            Number(
                elements.productStock
                    .value
                ||
                0
            ),


        sku:
            elements.productSku
                .value
                .trim()
            ||
            null,

        barcode:
            elements.productBarcode
                .value
                .trim()
            ||
            null,


        image_url:
            imageUrl,


        description:
            elements.productDescription
                .value
                .trim()
            ||
            null,


        display_order:
            Number(
                elements.displayOrder
                    .value
                ||
                0
            ),


        is_active:
            elements.productActive
                .checked
    }
}


/* ========================================
   SAVE PRODUCT
======================================== */

async function saveProduct(
    event
) {

    event.preventDefault()


    const validationError =
        validateProductForm()


    if (validationError) {

        setFormMessage(
            validationError
        )


        return
    }


    const productId =
        elements.productId
            .value


    const oldImageUrl =
        state.currentImageUrl


    let newUploadedImage =
        null


    let finalImageUrl =
        oldImageUrl


    setButtonLoading(
        elements.saveProductBtn,
        true,

        state.selectedImageFile

            ? 'กำลังอัปโหลดรูป...'

            : 'กำลังบันทึก...',

        productId

            ? 'บันทึกการแก้ไข'

            : 'บันทึกสินค้า'
    )


    setFormMessage('')


    try {


        /* ===============================
           IMAGE
        =============================== */

        if (
            state.selectedImageFile
        ) {

            newUploadedImage =
                await uploadProductImage(
                    state.selectedImageFile
                )


            finalImageUrl =
                newUploadedImage
                    .publicUrl


            elements.saveProductBtn
                .textContent =
                'กำลังบันทึกข้อมูล...'


        } else if (
            state.removeCurrentImage
        ) {

            finalImageUrl =
                null
        }


        /*
         * payload อยู่ใน scope ของ saveProduct เท่านั้น
         */
        const payload =
            getProductPayload(
                finalImageUrl
            )


        /* ===============================
           UPDATE
        =============================== */

        if (productId) {

            const {
                error
            } =
                await supabase
                    .from(
                        'products'
                    )
                    .update(
                        payload
                    )
                    .eq(
                        'id',
                        productId
                    )


            if (error) {
                throw error
            }


        } else {


            /* ===========================
               INSERT
            =========================== */

            const {
                error
            } =
                await supabase
                    .from(
                        'products'
                    )
                    .insert(
                        payload
                    )


            if (error) {
                throw error
            }
        }


        /* ===============================
           REMOVE OLD IMAGE
        =============================== */

        const imageWasReplaced =
            Boolean(
                newUploadedImage
            )
            &&
            Boolean(
                oldImageUrl
            )
            &&
            oldImageUrl
            !==
            finalImageUrl


        const imageWasRemoved =
            state.removeCurrentImage
            &&
            Boolean(
                oldImageUrl
            )


        if (
            imageWasReplaced
            ||
            imageWasRemoved
        ) {

            await deleteProductImageByUrl(
                oldImageUrl
            )
        }


        const successMessage =
            productId

                ? 'แก้ไขสินค้าสำเร็จ'

                : 'เพิ่มสินค้าสำเร็จ'


        closeProductModal()


        await loadProducts()


        setPageMessage(
            successMessage,
            'success'
        )


        setTimeout(
            () => {

                setPageMessage('')

            },
            2500
        )


    } catch (error) {


        console.error(
            'Save product error:',
            error
        )


        /*
         * ถ้าอัปโหลดรูปสำเร็จ
         * แต่ DB บันทึกล้มเหลว
         * ให้ลบไฟล์ใหม่ออก
         */
        if (
            newUploadedImage
                ?.filePath
        ) {

            await deleteProductImageByPath(
                newUploadedImage
                    .filePath
            )
        }


        let text =
            error.message
            ||
            'บันทึกสินค้าไม่สำเร็จ'


        if (
            error.code
            ===
            '23505'
        ) {

            text =
                'SKU หรือบาร์โค้ดนี้มีอยู่ในระบบแล้ว'
        }


        setFormMessage(
            text
        )


    } finally {


        setButtonLoading(
            elements.saveProductBtn,
            false,
            '',

            productId

                ? 'บันทึกการแก้ไข'

                : 'บันทึกสินค้า'
        )
    }
}


/* ========================================
   TOGGLE PRODUCT STATUS
======================================== */

async function toggleProductStatus(
    productId
) {

    const product =
        state.products
            .find(
                item =>
                    item.id
                    ===
                    productId
            )


    if (!product) {
        return
    }


    const newStatus =
        !product.is_active


    try {

        const {
            error
        } =
            await supabase
                .from(
                    'products'
                )
                .update({
                    is_active:
                        newStatus
                })
                .eq(
                    'id',
                    productId
                )


        if (error) {
            throw error
        }


        product.is_active =
            newStatus


        applyFilters()

        updateSummary()


        setPageMessage(

            newStatus

                ? `เปิดขาย “${product.name}” แล้ว`

                : `ปิดขาย “${product.name}” แล้ว`,

            'success'
        )


        setTimeout(
            () => {

                setPageMessage('')

            },
            2200
        )


    } catch (error) {

        console.error(
            'Toggle product error:',
            error
        )


        setPageMessage(
            `เปลี่ยนสถานะไม่สำเร็จ: ${error.message}`
        )
    }
}


/* ========================================
   OPEN DELETE
======================================== */

function openDeleteModal(
    productId
) {

    const product =
        state.products
            .find(
                item =>
                    item.id
                    ===
                    productId
            )


    if (!product) {

        setPageMessage(
            'ไม่พบข้อมูลสินค้า'
        )


        return
    }


    state.deleteProductId =
        productId


    elements.deleteProductName
        .textContent =
        `“${product.name}”`


    elements.deleteModal
        .classList
        .remove(
            'hidden'
        )
}


/* ========================================
   CLOSE DELETE
======================================== */

function closeDeleteModal() {

    state.deleteProductId =
        null


    elements.deleteModal
        .classList
        .add(
            'hidden'
        )
}


/* ========================================
   DELETE PRODUCT
======================================== */

async function deleteProduct() {

    const productId =
        state.deleteProductId


    if (!productId) {
        return
    }


    const product =
        state.products
            .find(
                item =>
                    item.id
                    ===
                    productId
            )


    setButtonLoading(
        elements.confirmDeleteBtn,
        true,
        'กำลังลบ...',
        'ลบสินค้า'
    )


    try {

        const {
            error
        } =
            await supabase
                .from(
                    'products'
                )
                .delete()
                .eq(
                    'id',
                    productId
                )


        if (error) {
            throw error
        }


        if (
            product
                ?.image_url
        ) {

            await deleteProductImageByUrl(
                product.image_url
            )
        }


        closeDeleteModal()


        await loadProducts()


        setPageMessage(
            `ลบ “${product?.name || 'สินค้า'}” สำเร็จ`,
            'success'
        )


        setTimeout(
            () => {

                setPageMessage('')

            },
            2500
        )


    } catch (error) {

        console.error(
            'Delete product error:',
            error
        )


        let text =
            error.message
            ||
            'เกิดข้อผิดพลาด'


        if (
            error.code
            ===
            '23503'
        ) {

            text =
                'สินค้านี้มีประวัติการขายอยู่ จึงไม่สามารถลบได้ กรุณาปิดการขายแทน'
        }


        closeDeleteModal()


        setPageMessage(
            `ลบสินค้าไม่สำเร็จ: ${text}`
        )


    } finally {

        setButtonLoading(
            elements.confirmDeleteBtn,
            false,
            '',
            'ลบสินค้า'
        )
    }
}


/* ========================================
   LOGOUT
======================================== */

async function logout() {

    setButtonLoading(
        elements.logoutBtn,
        true,
        'กำลังออกจากระบบ...',
        'ออกจากระบบ'
    )


    const {
        error
    } =
        await supabase
            .auth
            .signOut()


    if (error) {

        setButtonLoading(
            elements.logoutBtn,
            false,
            '',
            'ออกจากระบบ'
        )


        setPageMessage(
            `ออกจากระบบไม่สำเร็จ: ${error.message}`
        )


        return
    }


    window.location
        .replace(
            './index.html'
        )
}


/* ========================================
   SIDEBAR
======================================== */

function toggleSidebar() {

    elements.sidebar
        ?.classList
        .toggle(
            'open'
        )


    elements.sidebarOverlay
        ?.classList
        .toggle(
            'show'
        )
}


function closeSidebar() {

    elements.sidebar
        ?.classList
        .remove(
            'open'
        )


    elements.sidebarOverlay
        ?.classList
        .remove(
            'show'
        )
}


/* ========================================
   INITIALIZE
======================================== */

async function initializePage() {

    try {

        /*
         * ตรวจสิทธิ์ก่อนโหลดหน้าสินค้า
         *
         * admin   = เข้าได้
         * manager = เข้าได้
         * staff   = เข้าไม่ได้
         */
        const guard =
            await applyRoleGuard()

        if (!guard) {
            return
        }


        showLoading()


        const session =
            await requireSession()


        if (!session) {
            return
        }


        await loadProfile(
            session.user.id
        )


        await Promise.all([
            loadBranches(),
            loadCategories()
        ])


        renderUser()


        populateCategoryOptions()


        populateBranchOptions()


        await loadProducts()


    } catch (error) {

        hideLoading()


        console.error(
            'Initialize products page error:',
            error
        )


        elements.emptyState
            ?.classList
            .remove(
                'hidden'
            )


        const emptyTitle =
            elements.emptyState
                ?.querySelector(
                    'h3'
                )


        const emptyText =
            elements.emptyState
                ?.querySelector(
                    'p'
                )


        if (emptyTitle) {

            emptyTitle.textContent =
                'โหลดข้อมูลไม่สำเร็จ'
        }


        if (emptyText) {

            emptyText.textContent =
                error.message
                ||
                'เกิดข้อผิดพลาด'
        }


        setPageMessage(
            `โหลดข้อมูลไม่สำเร็จ: ${error.message
            ||
            'เกิดข้อผิดพลาด'
            }`
        )
    }
}


/* ========================================
   EVENTS
======================================== */


/* IMAGE SELECT */

elements.selectImageBtn
    ?.addEventListener(
        'click',
        () => {

            elements.productImageFile
                .click()
        }
    )


elements.productImageFile
    ?.addEventListener(
        'change',
        handleImageSelection
    )


elements.removeImageBtn
    ?.addEventListener(
        'click',
        handleRemoveImage
    )


/* ADD PRODUCT */

elements.addProductBtn
    ?.addEventListener(
        'click',
        openAddModal
    )


/* CLOSE PRODUCT MODAL */

elements.closeModalBtn
    ?.addEventListener(
        'click',
        closeProductModal
    )


elements.cancelModalBtn
    ?.addEventListener(
        'click',
        closeProductModal
    )


/* SAVE PRODUCT */

elements.productForm
    ?.addEventListener(
        'submit',
        saveProduct
    )


/* FILTER */

elements.searchInput
    ?.addEventListener(
        'input',
        applyFilters
    )


elements.categoryFilter
    ?.addEventListener(
        'change',
        applyFilters
    )


elements.statusFilter
    ?.addEventListener(
        'change',
        applyFilters
    )


/* REFRESH */

elements.refreshBtn
    ?.addEventListener(
        'click',
        async () => {

            try {

                await loadProducts()


                setPageMessage(
                    'รีเฟรชข้อมูลสำเร็จ',
                    'success'
                )


                setTimeout(
                    () => {

                        setPageMessage('')

                    },
                    2000
                )


            } catch (error) {

                setPageMessage(
                    `รีเฟรชไม่สำเร็จ: ${error.message}`
                )
            }
        }
    )


/* PRODUCT TABLE */

elements.productTableBody
    ?.addEventListener(
        'click',
        event => {

            const button =
                event.target
                    .closest(
                        '[data-action]'
                    )


            if (!button) {
                return
            }


            const action =
                button.dataset
                    .action


            const productId =
                button.dataset
                    .id


            if (
                action ===
                'edit'
            ) {

                openEditModal(
                    productId
                )


                return
            }


            if (
                action ===
                'toggle'
            ) {

                toggleProductStatus(
                    productId
                )


                return
            }


            if (
                action ===
                'delete'
            ) {

                openDeleteModal(
                    productId
                )
            }
        }
    )


/* DELETE */

elements.cancelDeleteBtn
    ?.addEventListener(
        'click',
        closeDeleteModal
    )


elements.confirmDeleteBtn
    ?.addEventListener(
        'click',
        deleteProduct
    )


/* PRODUCT MODAL BACKDROP */

elements.productModal
    ?.addEventListener(
        'click',
        event => {

            if (
                event.target
                ===
                elements.productModal
            ) {

                closeProductModal()
            }
        }
    )


/* DELETE MODAL BACKDROP */

elements.deleteModal
    ?.addEventListener(
        'click',
        event => {

            if (
                event.target
                ===
                elements.deleteModal
            ) {

                closeDeleteModal()
            }
        }
    )


/* ESC */

document.addEventListener(
    'keydown',
    event => {

        if (
            event.key
            !==
            'Escape'
        ) {

            return
        }


        if (
            elements.productModal
            &&
            !elements.productModal
                .classList
                .contains(
                    'hidden'
                )
        ) {

            closeProductModal()

            return
        }


        if (
            elements.deleteModal
            &&
            !elements.deleteModal
                .classList
                .contains(
                    'hidden'
                )
        ) {

            closeDeleteModal()
        }
    }
)


/* MOBILE SIDEBAR */

elements.menuToggle
    ?.addEventListener(
        'click',
        toggleSidebar
    )


elements.sidebarOverlay
    ?.addEventListener(
        'click',
        closeSidebar
    )


/* LOGOUT */

elements.logoutBtn
    ?.addEventListener(
        'click',
        logout
    )


/*
 * สำคัญ:
 *
 * ไม่มี categoriesMenu.preventDefault()
 * ไม่มี salesMenu.preventDefault()
 * ไม่มี ingredientsMenu.preventDefault()
 * ไม่มี reportsMenu
 *
 * ให้ลิงก์ใน HTML เปิดหน้าแต่ละหน้าโดยตรง
 */


/* ========================================
   AUTH CHANGE
======================================== */

supabase.auth
    .onAuthStateChange(
        (
            event,
            session
        ) => {

            if (
                event
                ===
                'SIGNED_OUT'
                ||
                !session
            ) {

                window.location
                    .replace(
                        './index.html'
                    )
            }
        }
    )


/* ========================================
   START
======================================== */

initializePage()
