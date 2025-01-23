import { CONSTANTS } from './constants.js'
import { c5eLoadTemplates, getSetting } from './utils.js'

const constants = CONSTANTS.RESTING

/**
 * Register
 */
export function register () {
    if (!getSetting(constants.SETTING.USE_CAMP_SUPPLIES.KEY)) return

    registerHooks()

    const templates = Object.values(constants.TEMPLATE)
    c5eLoadTemplates(templates)
}

/**
 * Register the hooks
 * @function
 * @private
 */
function registerHooks () {
    if (foundry.utils.isNewerVersion(game.system.version, '4.1.2')) {
        Hooks.on('renderLongRestDialog', addCampSupplies)
    } else {
        Hooks.on('preRenderLongRestDialog', addCampSuppliesV1)
        Hooks.on('renderLongRestDialog', addCampSuppliesListener)
    }

    Hooks.on('createItem', (item) => refreshLongRestDialog('create', item))
    Hooks.on('deleteItem', (item) => refreshLongRestDialog('delete', item))
    Hooks.on('updateItem', (item, data) => refreshLongRestDialog('update', item, data))
    Hooks.on('dnd5e.longRest', spendCampSuppliesOnRest)
}

/**
 * Apply camp supplies logic to the Long Rest dialog.
 * @async
 * @function
 * @private
 * @param {object} dialog Long Rest dialog
 * @param {object} html   Dialog HTML
 */
async function addCampSupplies (dialog, html) {
    const campSupplies = dialog.actor.items.filter(item =>
        item.system.identifier === 'custom-dnd5e-camp-supplies' && item.system.quantity > 0)

    const required = (dialog.actor.type === 'group')
        ? dialog.actor.system.playerCharacters.length ?? 1
        : 1
    const quantity = campSupplies.reduce((total, supply) => total + (supply.system?.quantity ?? 0), 0)
    const spend = true

    const context = { required, quantity, spend}

    const template = await renderTemplate(constants.TEMPLATE.LONG_REST, context)
    const fieldset = html.querySelector('fieldset')
    fieldset.insertAdjacentHTML('beforeend', template)

    if (quantity < required && spend) {
        const restButton = html.querySelector('button[type="submit"]')
        restButton.disabled = true
    }

    const spendCampSupplies = html.querySelector('#custom-dnd5e-spend-camp-supplies')
    spendCampSupplies.addEventListener('change', handleRestButtonToggle.bind(spendCampSupplies, html))
}

/**
 * Apply camp supplies logic to the pre-ApplicationV2 Long Rest dialog.
 * @async
 * @function
 * @private
 * @param {object} dialog  Long Rest dialog
 * @param {object} options Dialog options
 */
async function addCampSuppliesV1 (dialog, options) {
    const campSupplies = dialog.actor.items.filter(item =>
        item.system.identifier === 'custom-dnd5e-camp-supplies' && item.system.quantity > 0)

    if (dialog.actor.type === 'group') {
        options.groupId = dialog.actor.id
    }

    const required = (dialog.actor.type === 'group')
        ? dialog.actor.system.playerCharacters.length ?? 1
        : 1
    const quantity = campSupplies.reduce((total, supply) => total + (supply.system?.quantity ?? 0), 0)
    options.campSupplies = { quantity, required, spend: true }

    if (quantity < required && options.campSupplies.spend) {
        dialog.data.buttons.rest.disabled = true
    }

    dialog.options.template = constants.TEMPLATE.LONG_REST_V1
}

/**
 * Adds a listener to the 'Spend Camp Supplies' checkbox in the Long Rest dialog
 * @function
 * @private
 * @param {object} dialog  Long Rest dialog
 * @param {object} html    Dialog HTML
 * @param {object} options Dialog options
 */
function addCampSuppliesListener (dialog, html, options) {
    if (options.isGroup) return

    const element = html[0] ?? html
    const spendCampSupplies = element.querySelector('#custom-dnd5e-spend-camp-supplies')
    spendCampSupplies.addEventListener('change', handleRestButtonToggle.bind(spendCampSupplies, element))
}

/**
 * Handle the toggle of the disabled state of the 'Rest' button on the Long Rest dialog
 * @function
 * @private
 * @param {object} element Dialog HTML element
 */
function handleRestButtonToggle (element) {
    const campSupplies = element.querySelector('.custom-dnd5e-camp-supplies')
    const quantity = parseInt(campSupplies?.dataset?.quantity ?? 0)
    const required = parseInt(campSupplies?.dataset?.required ?? 1)
    const restButton = element.querySelector('#custom-dnd5e-rest') ?? element.querySelector('button[type="submit"]')
    restButton.disabled = this.checked && quantity < required
}

/**
 * Refreshes the Long Rest dialog based on item creation, deletion, or update.
 * @function
 * @private
 * @param {string} changeType Type of change (create, delete, update)
 * @param {object} item       Item being created, deleted, or updated
 * @param {object} [data={}]  Updated data
 */
function refreshLongRestDialog (changeType, item, data = {}) {
    if (item.system.identifier !== 'custom-dnd5e-camp-supplies') return

    const quantity = (changeType === 'delete') ? 0 : data.system?.quantity ?? item.system.quantity

    let restButtonSelector = 'button[type="submit"]'
    let dialogs = []
    if (foundry.utils.isNewerVersion(game.system.version, '4.1.2')) {
        dialogs = [...foundry.applications.instances].filter(([key, app]) => app.constructor.name === 'LongRestDialog' && app.actor.id === item.parent.id).map(([key, app]) => app)
    } else {
        restButtonSelector = '#custom-dnd5e-rest'
        dialogs = Object.values(ui.windows).filter(app => app.constructor.name === 'LongRestDialog' && app.actor.id === item.parent.id)
    }

    if (!dialogs.length) return

    for (const dialog of dialogs) {
        const element = dialog.element[0] ?? dialog.element
        const campSupplies = element.querySelector('.custom-dnd5e-camp-supplies')
        campSupplies.dataset.quantity = quantity
        const required = campSupplies.data?.required ?? 1
    
        const campSuppliesText = campSupplies.querySelector('p')
        campSuppliesText.innerText = game.i18n.format('CUSTOM_DND5E.available', { quantity })
        campSuppliesText.classList.toggle('custom-dnd5e-failure', !quantity)
    
        const spendCampSupplies = element.querySelector('#custom-dnd5e-spend-camp-supplies')
        const restButton = element.querySelector(restButtonSelector)
        restButton.disabled = spendCampSupplies.checked && quantity < required
    }
}

/**
 * Spends the camp supplies when a Long Rest is taken.
 * @function
 * @private
 * @param {object} actor   Actor taking the Long Rest.
 * @param {object} options Options related to the Long Rest
 */
function spendCampSuppliesOnRest (actor, options) {
    if (!options.spendCampSupplies || actor.type === 'group') return

    actor = (options.groupId) ? game.actors.get(options.groupId) : actor

    const campSupplies = actor.items.find(item =>
        item.system.identifier === 'custom-dnd5e-camp-supplies' && item.system.quantity > 0)

    campSupplies?.system?.activities?.contents[0]?.use({}, { configure: false }, {})
}
