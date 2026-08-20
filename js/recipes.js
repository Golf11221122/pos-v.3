import { supabase } from './supabase.js'
import { applyRoleGuard } from './role-guard.js'

const state = {
    session: null,
    profile: null,
    branch: null,

    products: [],
    ingredients: [],

    selectedProduct: null,
    recipes: []
}

const $ = id =>
    document.getElementById(id)

const el = {
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),

    branchText: $('branchText'),
    userName: $('userName'),

    productSelect: $('productSelect'),

    recipeWorkspace: $('recipeWorkspace'),

    selectedProductName:
        $('selectedProductName'),

    selectedProductPrice:
        $('selectedProductPrice'),

    recipeCost:
        $('recipeCost'),

    grossProfit:
        $('grossProfit'),

    ingredientSelect:
        $('ingredientSelect'),

    quantityUsed:
        $('quantityUsed'),

    ingredientUnitText:
        $('ingredientUnitText'),

    addRecipeBtn:
        $('addRecipeBtn'),

    formMessage:
        $('formMessage'),

    loadingState:
        $('loadingState'),

    emptyState:
        $('emptyState'),

    recipeTableWrap:
        $('recipeTableWrap'),

    recipeTableBody:
        $('recipeTableBody'),

    recipeCount:
        $('recipeCount'),

    pageMessage:
        $('pageMessage')
}

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function money(value) {
    return new Intl.NumberFormat(
        'th-TH',
        {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }
    ).format(Number(value || 0))
}

function number(value) {
    return Number(value || 0)
        .toLocaleString(
            'th-TH',
            {
                maximumFractionDigits: 3
            }
        )
}

function message(
    target,
    text = '',
    type = 'error'
) {
    if (!target) return

    target.textContent = text

    target.style.color =
        type === 'success'
            ? '#188038'
            : '#d93025'
}

/* ========================================
   SESSION
======================================== */

async function requireSession() {
    const {
        data: { session },
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

    state.session = session

    return session
}

/* ========================================
   PROFILE
======================================== */

async function loadProfile(userId) {
    const {
        data,
        error
    } =
        await supabase
            .from('profiles')
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

    if (!data?.branch_id) {
        throw new Error(
            'บัญชียังไม่ได้กำหนดสาขา'
        )
    }

    state.profile = data
}

/* ========================================
   BRANCH
======================================== */

async function loadBranch() {
    const {
        data,
        error
    } =
        await supabase
            .from('branches')
            .select('id,name')
            .eq(
                'id',
                state.profile.branch_id
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

    state.branch = data

    el.branchText.textContent =
        `สาขา: ${data.name}`

    el.userName.textContent =
        state.profile.full_name
        ||
        state.session.user.email
            ?.split('@')[0]
        ||
        'ผู้ใช้งาน'
}

/* ========================================
   PRODUCTS
======================================== */

async function loadProducts() {
    const {
        data,
        error
    } =
        await supabase
            .from('products')
            .select(`
                id,
                name,
                price,
                cost,
                is_active
            `)
            .eq(
                'branch_id',
                state.profile.branch_id
            )
            .eq(
                'is_active',
                true
            )
            .order(
                'name'
            )

    if (error) {
        throw error
    }

    state.products =
        data || []

    renderProductOptions()
}

function renderProductOptions() {
    el.productSelect.innerHTML =
        `
        <option value="">
            -- เลือกสินค้า --
        </option>
        `
        +
        state.products
            .map(product => `
                <option
                    value="${esc(product.id)}"
                >
                    ${esc(product.name)}
                </option>
            `)
            .join('')
}

/* ========================================
   INGREDIENTS
======================================== */

async function loadIngredients() {
    const {
        data,
        error
    } =
        await supabase
            .from('ingredients')
            .select(`
                id,
                name,
                unit,
                cost_per_unit,
                is_active
            `)
            .eq(
                'branch_id',
                state.profile.branch_id
            )
            .eq(
                'is_active',
                true
            )
            .order(
                'name'
            )

    if (error) {
        throw error
    }

    state.ingredients =
        data || []

    renderIngredientOptions()
}

function renderIngredientOptions() {
    const used =
        new Set(
            state.recipes.map(
                item =>
                    item.ingredient_id
            )
        )

    el.ingredientSelect.innerHTML =
        `
        <option value="">
            -- เลือกวัตถุดิบ --
        </option>
        `
        +
        state.ingredients
            .filter(
                ingredient =>
                    !used.has(
                        ingredient.id
                    )
            )
            .map(ingredient => `
                <option
                    value="${esc(ingredient.id)}"
                >
                    ${esc(ingredient.name)}
                </option>
            `)
            .join('')

    updateIngredientUnit()
}

/* ========================================
   SELECT PRODUCT
======================================== */

async function selectProduct() {
    const productId =
        el.productSelect.value

    state.selectedProduct =
        state.products.find(
            product =>
                product.id ===
                productId
        )
        ||
        null

    if (!state.selectedProduct) {
        el.recipeWorkspace
            .classList
            .add('hidden')

        state.recipes = []

        return
    }

    el.recipeWorkspace
        .classList
        .remove('hidden')

    renderProductSummary()

    await loadRecipes()
}

/* ========================================
   PRODUCT SUMMARY
======================================== */

function renderProductSummary() {
    const product =
        state.selectedProduct

    if (!product) return

    el.selectedProductName.textContent =
        product.name

    el.selectedProductPrice.textContent =
        money(product.price)

    renderCostSummary()
}

function renderCostSummary() {
    const recipeCost =
        state.recipes.reduce(
            (sum, recipe) => {

                return (
                    sum
                    +
                    Number(
                        recipe.quantity_used ||
                        0
                    )
                    *
                    Number(
                        recipe.ingredient
                            ?.cost_per_unit ||
                        0
                    )
                )
            },
            0
        )

    const price =
        Number(
            state.selectedProduct
                ?.price ||
            0
        )

    el.recipeCost.textContent =
        money(recipeCost)

    el.grossProfit.textContent =
        money(
            price -
            recipeCost
        )
}

/* ========================================
   SYNC PRODUCT COST FROM RECIPE
======================================== */

async function syncSelectedProductCost() {
    if (!state.selectedProduct) return 0

    const recipeCost = state.recipes.reduce((sum, recipe) => {
        const qty = Number(recipe.quantity_used || 0)
        const unitCost = Number(recipe.ingredient?.cost_per_unit || 0)
        return sum + (qty * unitCost)
    }, 0)

    const roundedCost = Math.round((recipeCost + Number.EPSILON) * 10000) / 10000

    const { error } = await supabase
        .from('products')
        .update({ cost: roundedCost })
        .eq('id', state.selectedProduct.id)
        .eq('branch_id', state.profile.branch_id)

    if (error) throw error

    state.selectedProduct.cost = roundedCost

    const productInList = state.products.find(p => p.id === state.selectedProduct.id)
    if (productInList) productInList.cost = roundedCost

    return roundedCost
}

/* ========================================
   LOAD RECIPES
======================================== */

async function loadRecipes() {
    if (!state.selectedProduct) {
        return
    }

    el.loadingState
        .classList
        .remove('hidden')

    el.emptyState
        .classList
        .add('hidden')

    el.recipeTableWrap
        .classList
        .add('hidden')

    const {
        data,
        error
    } =
        await supabase
            .from('product_recipes')
            .select(`
                id,
                branch_id,
                product_id,
                ingredient_id,
                quantity_used,
                created_at,
                updated_at
            `)
            .eq(
                'branch_id',
                state.profile.branch_id
            )
            .eq(
                'product_id',
                state.selectedProduct.id
            )
            .order(
                'created_at'
            )

    el.loadingState
        .classList
        .add('hidden')

    if (error) {
        console.error(
            'Load recipes error:',
            error
        )

        message(
            el.pageMessage,
            error.message ||
            'โหลดสูตรไม่สำเร็จ'
        )

        return
    }

    state.recipes =
        (data || []).map(
            recipe => ({
                ...recipe,

                ingredient:
                    state.ingredients.find(
                        ingredient =>
                            ingredient.id ===
                            recipe.ingredient_id
                    )
                    ||
                    null
            })
        )

    // คำนวณต้นทุนจาก BOM แล้วบันทึกกลับ products.cost อัตโนมัติ
    try {
        await syncSelectedProductCost()
    } catch (syncError) {
        console.error('Sync product cost error:', syncError)
        message(el.pageMessage, 'คำนวณสูตรได้ แต่บันทึกต้นทุนสินค้าไม่สำเร็จ: ' + (syncError.message || ''), 'error')
    }

    renderRecipes()
    renderIngredientOptions()
    renderCostSummary()
}

/* ========================================
   RENDER RECIPES
======================================== */

function renderRecipes() {
    const list =
        state.recipes

    el.recipeCount.textContent =
        `${list.length.toLocaleString(
            'th-TH'
        )} รายการ`

    if (!list.length) {
        el.emptyState
            .classList
            .remove('hidden')

        el.recipeTableWrap
            .classList
            .add('hidden')

        return
    }

    el.emptyState
        .classList
        .add('hidden')

    el.recipeTableWrap
        .classList
        .remove('hidden')

    el.recipeTableBody.innerHTML =
        list.map(recipe => {

            const ingredient =
                recipe.ingredient

            const qty =
                Number(
                    recipe.quantity_used ||
                    0
                )

            const unitCost =
                Number(
                    ingredient
                        ?.cost_per_unit ||
                    0
                )

            const lineCost =
                qty *
                unitCost

            return `
                <tr>

                    <td>
                        <span class="ingredient-name">
                            ${esc(
                ingredient
                    ?.name ||
                'ไม่พบวัตถุดิบ'
            )
                }
                        </span>
                    </td>

                    <td class="quantity-cell">

                        ${number(qty)
                }

                        ${esc(
                    ingredient
                        ?.unit ||
                    ''
                )
                }

                    </td>

                    <td>
                        ${money(unitCost)}
                    </td>

                    <td>
                        ${money(lineCost)}
                    </td>

                    <td>

                        <div class="action-buttons">

                            <button
                                class="action-btn"
                                data-action="edit"
                                data-id="${esc(recipe.id)}"
                                type="button"
                            >
                                ✏️ แก้จำนวน
                            </button>

                            <button
                                class="action-btn delete-btn"
                                data-action="delete"
                                data-id="${esc(recipe.id)}"
                                type="button"
                            >
                                🗑 ลบ
                            </button>

                        </div>

                    </td>

                </tr>
            `
        }).join('')
}

/* ========================================
   INGREDIENT UNIT
======================================== */

function updateIngredientUnit() {
    const ingredient =
        state.ingredients.find(
            item =>
                item.id ===
                el.ingredientSelect.value
        )

    el.ingredientUnitText.textContent =
        ingredient?.unit ||
        '-'
}

/* ========================================
   ADD RECIPE
======================================== */

async function addRecipe() {
    if (!state.selectedProduct) {
        return
    }

    const ingredientId =
        el.ingredientSelect.value

    const quantity =
        Number(
            el.quantityUsed.value ||
            0
        )

    if (!ingredientId) {
        message(
            el.formMessage,
            'กรุณาเลือกวัตถุดิบ'
        )

        return
    }

    if (
        !Number.isFinite(
            quantity
        )
        ||
        quantity <= 0
    ) {
        message(
            el.formMessage,
            'จำนวนที่ใช้ต้องมากกว่า 0'
        )

        return
    }

    el.addRecipeBtn.disabled =
        true

    el.addRecipeBtn.textContent =
        'กำลังบันทึก...'

    try {
        const {
            error
        } =
            await supabase
                .from(
                    'product_recipes'
                )
                .insert({
                    branch_id:
                        state.profile.branch_id,

                    product_id:
                        state.selectedProduct.id,

                    ingredient_id:
                        ingredientId,

                    quantity_used:
                        quantity,

                    updated_at:
                        new Date()
                            .toISOString()
                })

        if (error) {
            throw error
        }

        el.quantityUsed.value =
            ''

        message(
            el.formMessage,
            'เพิ่มวัตถุดิบในสูตรสำเร็จ',
            'success'
        )

        await loadRecipes()

        setTimeout(
            () => {
                message(
                    el.formMessage,
                    ''
                )
            },
            2000
        )

    } catch (error) {
        console.error(
            'Add recipe error:',
            error
        )

        let text =
            error.message ||
            'เพิ่มวัตถุดิบไม่สำเร็จ'

        if (
            error.code ===
            '23505'
        ) {
            text =
                'วัตถุดิบนี้มีอยู่ในสูตรแล้ว'
        }

        message(
            el.formMessage,
            text
        )

    } finally {
        el.addRecipeBtn.disabled =
            false

        el.addRecipeBtn.textContent =
            '+ เพิ่มในสูตร'
    }
}

/* ========================================
   EDIT QUANTITY
======================================== */

async function editRecipe(
    recipeId
) {
    const recipe =
        state.recipes.find(
            item =>
                item.id ===
                recipeId
        )

    if (!recipe) return

    const ingredient =
        recipe.ingredient

    const input =
        prompt(
            `จำนวน ${ingredient?.name ||
            'วัตถุดิบ'
            } ต่อสินค้า 1 หน่วย`,
            recipe.quantity_used
        )

    if (input === null) {
        return
    }

    const quantity =
        Number(input)

    if (
        !Number.isFinite(quantity)
        ||
        quantity <= 0
    ) {
        alert(
            'จำนวนต้องมากกว่า 0'
        )

        return
    }

    try {
        const {
            error
        } =
            await supabase
                .from(
                    'product_recipes'
                )
                .update({
                    quantity_used:
                        quantity,

                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    'id',
                    recipe.id
                )
                .eq(
                    'branch_id',
                    state.profile.branch_id
                )

        if (error) {
            throw error
        }

        await loadRecipes()

        message(
            el.pageMessage,
            'แก้ไขจำนวนสำเร็จ',
            'success'
        )

    } catch (error) {
        console.error(
            'Edit recipe error:',
            error
        )

        message(
            el.pageMessage,
            error.message ||
            'แก้ไขสูตรไม่สำเร็จ'
        )
    }
}

/* ========================================
   DELETE RECIPE
======================================== */

async function deleteRecipe(
    recipeId
) {
    const recipe =
        state.recipes.find(
            item =>
                item.id ===
                recipeId
        )

    if (!recipe) return

    const name =
        recipe.ingredient
            ?.name ||
        'วัตถุดิบ'

    if (
        !confirm(
            `ลบ "${name}" ออกจากสูตรหรือไม่?`
        )
    ) {
        return
    }

    try {
        const {
            error
        } =
            await supabase
                .from(
                    'product_recipes'
                )
                .delete()
                .eq(
                    'id',
                    recipe.id
                )
                .eq(
                    'branch_id',
                    state.profile.branch_id
                )

        if (error) {
            throw error
        }

        await loadRecipes()

        message(
            el.pageMessage,
            'ลบวัตถุดิบออกจากสูตรแล้ว',
            'success'
        )

    } catch (error) {
        console.error(
            'Delete recipe error:',
            error
        )

        message(
            el.pageMessage,
            error.message ||
            'ลบวัตถุดิบไม่สำเร็จ'
        )
    }
}

/* ========================================
   LOGOUT
======================================== */

async function logout() {
    await supabase
        .auth
        .signOut()

    location.replace(
        './index.html'
    )
}

/* ========================================
   INIT
======================================== */

async function init() {
    try {

        // Admin / Manager เข้าได้
        // Staff จะถูก Role Guard ป้องกัน
        const guard = await applyRoleGuard()

        if (!guard) {
            return
        }

        const session = await requireSession()

        if (!session) {
            return
        }

        await loadProfile(session.user.id)

        await loadBranch()

        // โหลดสินค้าสำหรับเลือกสูตร
        await loadProducts()

        // โหลดวัตถุดิบสำหรับใช้ในสูตร
        await loadIngredients()

    } catch (error) {

        console.error(
            'Recipes init error:',
            error
        )

        message(
            el.pageMessage,
            error.message ||
            'โหลดข้อมูลไม่สำเร็จ'
        )
    }
}

/* ========================================
   EVENTS
======================================== */

el.backBtn.onclick =
    () => {
        location.href =
            './dashboard.html'
    }

el.logoutBtn.onclick =
    logout

el.productSelect.onchange =
    selectProduct

el.ingredientSelect.onchange =
    updateIngredientUnit

el.addRecipeBtn.onclick =
    addRecipe

el.recipeTableBody.onclick =
    event => {

        const button =
            event.target.closest(
                '[data-action]'
            )

        if (!button) {
            return
        }

        const id =
            button.dataset.id

        const action =
            button.dataset.action

        if (
            action === 'edit'
        ) {
            editRecipe(id)
        }

        if (
            action === 'delete'
        ) {
            deleteRecipe(id)
        }
    }

supabase.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        if (
            event === 'SIGNED_OUT'
            ||
            !session
        ) {
            location.replace(
                './index.html'
            )
        }
    }
)

init()
