import { CONSTANTS } from './constants.js'
import { c5eLoadTemplates, getSetting } from './utils.js'

const constants = CONSTANTS.RESTING

/**
 * Register
 */
export function register () {
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
    Hooks.on('preRenderLongRestDialog', applyCampSupplies)
    Hooks.on('renderLongRestDialog', addCampSuppliesListener)
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
 * @param {object} dialog  Long Rest dialog
 * @param {object} options Dialog options
 */
async function applyCampSupplies (dialog, options) {
    if (!getSetting(constants.SETTING.USE_CAMP_SUPPLIES.KEY)) return

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

    dialog.options.template = constants.TEMPLATE.LONG_REST
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
    if (!getSetting(constants.SETTING.USE_CAMP_SUPPLIES.KEY) || options.isGroup) return

    const spendCampSupplies = html[0].querySelector('#custom-dnd5e-spend-camp-supplies')
    spendCampSupplies.addEventListener('change', handleRestButtonToggle.bind(spendCampSupplies, html))
}

/**
 * Handle the toggle of the disabled state of the 'Rest' button on the Long Rest dialog
 * @function
 * @private
 * @param {object} html Dialog HTML
 */
function handleRestButtonToggle (html) {
    const campSupplies = html[0].querySelector('.custom-dnd5e-camp-supplies')
    const quantity = parseInt(campSupplies?.dataset?.quantity ?? 0)
    const required = parseInt(campSupplies?.dataset?.required ?? 1)
    const restButton = html[0].querySelector('#custom-dnd5e-rest')
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
    if (!getSetting(constants.SETTING.USE_CAMP_SUPPLIES.KEY) ||
        item.system.identifier !== 'custom-dnd5e-camp-supplies') return

    const quantity = (changeType === 'delete') ? 0 : data.system?.quantity ?? item.system.quantity

    // foundry.applications.instances when it moves to ApplicationV2
    const dialog = Object.values(ui.windows).find(app => app.constructor.name === 'LongRestDialog')
    if (!dialog) return

    const campSupplies = dialog.element[0].querySelector('.custom-dnd5e-camp-supplies')
    campSupplies.dataset.quantity = quantity
    const required = campSupplies.data?.required ?? 1

    const campSuppliesText = campSupplies.querySelector('p')
    campSuppliesText.innerText = game.i18n.format('CUSTOM_DND5E.available', { quantity })
    campSuppliesText.classList.toggle('custom-dnd5e-failure', !quantity)

    const spendCampSupplies = dialog.element[0].querySelector('#custom-dnd5e-spend-camp-supplies')
    const restButton = dialog.element[0].querySelector('#custom-dnd5e-rest')
    restButton.disabled = spendCampSupplies.checked && quantity < required
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
