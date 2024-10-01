import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE, SHEET_TYPE } from './constants.js'
import { Logger, checkEmpty, getFlag, setFlag, unsetFlag, getSetting, registerMenu, registerSetting, makeDead } from './utils.js'
import { CountersForm } from './forms/counters-form.js'
import { CountersFormIndividual } from './forms/counters-form-individual.js'

const constants = CONSTANTS.COUNTERS

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()
}

/**
 * Register dettings
 */
function registerSettings () {
    const settings = [
        constants.SETTING.CHARACTER_COUNTERS.KEY,
        constants.SETTING.NPC_COUNTERS.KEY,
        constants.SETTING.GROUP_COUNTERS.KEY,
        constants.SETTING.ITEM_COUNTERS.KEY
    ]

    settings.forEach(key => registerSetting(key, { scope: 'world', config: false, type: Object }))

    registerMenu(
        constants.MENU.KEY,
        {
            hint: game.i18n.localize(constants.MENU.HINT),
            label: game.i18n.localize(constants.MENU.LABEL),
            name: game.i18n.localize(constants.MENU.NAME),
            icon: constants.MENU.ICON,
            type: CountersForm,
            restricted: true,
            scope: 'world'
        }
    )

    const templates = Object.values(constants.TEMPLATE)
    Logger.debug('Loading templates', templates)
    loadTemplates(templates)
}

/**
 * Register hooks
 */
function registerHooks () {
    Hooks.on('renderInnerActorSheet', addCounters)
    Hooks.on('renderInnerItemSheet', addCounters)
    Hooks.on('preUpdateActor', handlePreUpdateActor)
    Hooks.on('updateActor', handleUpdateActor)
    Hooks.on('deleteCombat', handleDeleteCombat)
    Hooks.on('dnd5e.preRestCompleted', handleRest)
}

/**
 * Handle actor pre-update triggers
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function handlePreUpdateActor (actor, data) {
    const currentHp = foundry.utils.getProperty(data, 'system.attributes.hp.value')
    const previousHp = actor.system.attributes.hp.value
    const halfHp = actor.system.attributes.hp.max * 0.5
    if (currentHp !== undefined && currentHp <= halfHp && previousHp > halfHp) processTriggers({ actor, triggerType: 'halfHp' })
}

/**
 * Handle actor update triggers
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function handleUpdateActor (actor, data) {
    const hp = foundry.utils.getProperty(data, 'system.attributes.hp.value')
    if (hp === 0) processTriggers({ actor, triggerType: 'zeroHp', followUpFlag: 'zeroHpCombatEnd' })
    if (hasDataChanged(data)) processTriggers({ actor, data, triggerType: 'counterValue' })
}

/**
 * Handle end of combat triggers
 * @param {object} combat The combat
 */
function handleDeleteCombat (combat) {
    combat.combatants.forEach(combatant => {
        const actor = combatant.actor
        if (getFlag(actor, 'zeroHpCombatEnd')) {
            processTriggers({ actor, triggerType: 'zeroHpCombatEnd' })
            unsetFlag(actor, 'zeroHpCombatEnd')
        }
    })
}

/**
 * Handle rest triggers
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function handleRest (actor, data) {
    const restType = data.longRest ? 'longRest' : 'shortRest'
    processTriggers({ actor, triggerType: restType })
}

/**
 * Whether the counter's value has changed
 * @param {object} data The data
 * @returns             Whether the counter's value has changed
 */
function hasDataChanged (data) {
    return Object.hasOwn(data, 'flags') &&
        data.flags[MODULE.ID] && !Object.hasOwn(data.flags[MODULE.ID], '-=counters')
}

/**
 * Process the triggers for the given actor based on the trigger type
 * @param {Actor} actor           The actor
 * @param {string} triggerType    The trigger type, e.g., 'zeroHp', 'halfHp', 'longRest'
 * @param {string} [followUpFlag] Optional: flag to set for follow-up actions (e.g., 'zeroHpCombatEnd')
 */
function processTriggers ({ actor, data = null, triggerType, followUpFlag = null }) {
    const counters = getCounters(actor)

    // Iterate through each counter and check if it has an action that matches the triggerType
    for (const [counterKey, counter] of Object.entries(counters)) {
        if (!counter.triggers) continue
        for (const trigger of counter.triggers) {
            if (trigger.trigger === triggerType) {
                handleAction(counterKey, counter, trigger, { actor, data })
            }
        }
    }

    // Optionally set a follow-up flag for later processing (e.g., at the end of combat)
    if (followUpFlag) {
        setFlag(actor, followUpFlag, true)
    }
}

/**
 * Handle trigger actions
 * @param {string} counterKey The counter key
 * @param {object} counter    The counter
 * @param {object} trigger    The trigger
 * @param {*} Misc            Other objects, e.g., actor, data
 */
function handleAction (counterKey, counter, trigger, { actor, data }) {
    switch (trigger.action) {
    case 'check':
        checkCheckbox(actor, counterKey)
        break
    case 'uncheck':
        uncheckCheckbox(actor, counterKey)
        break
    case 'increase':
        increaseCounter(actor, counterKey, trigger, counter.type)
        break
    case 'decrease':
        decreaseCounter(actor, counterKey, trigger, counter.type)
        break
    case 'dead':
        {
            const counterValue = getCounterValue(data, counterKey)
            if (counterValue >= trigger.triggerValue) {
                makeDead(actor)
            }
        }
        break
    }
}

/**
 * Increase a counter by the trigger's action value
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} trigger The trigger
 * @param {string} type    The counter type
*/
function increaseCounter (actor, key, trigger, type) {
    switch (type) {
    case 'fraction':
        increaseFraction(actor, key, trigger.actionValue)
        break
    case 'number':
        increaseNumber(actor, key, trigger.actionValue)
        break
    }
}

/**
 * Decrease a counter by the trigger's action value
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} trigger The trigger
 * @param {string} type    The counter type
 */
function decreaseCounter (actor, key, trigger, type) {
    switch (type) {
    case 'fraction':
        decreaseFraction(actor, key, trigger.actionValue)
        break
    case 'number':
        decreaseNumber(actor, key, trigger.actionValue)
        break
    }
}

/**
 * Get the current value of a counter
 *
 * @param {object} data       The data
 * @param {string} counterKey The counter key
 * @returns {number|null}     The counter value
 */
function getCounterValue (data, counterKey) {
    return data.flags[MODULE.ID][counterKey]?.value ?? data.flags[MODULE.ID][counterKey] ?? null
}

/**
 * Add counters to the sheet
 * @param {object} app  The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
async function addCounters (app, html, data) {
    const sheetType = SHEET_TYPE[app.constructor.name]
    if (!sheetType) return

    const entity = sheetType.item ? app : app.actor
    const counters = mergeCounters(entity, sheetType.countersSetting)

    if (!data?.editable && checkEmpty(counters)) return

    renderCountersTab(sheetType, html)
    const container = await insertCounters(sheetType, counters, app, html, data)

    if (!Object.keys(counters).length) {
        container.classList?.add('empty')
    }

    setupCounterInteractions(entity, counters, container, data.editable)
}

/**
 * Merge world and entity counters
 */
function mergeCounters (entity, settingKey) {
    if (entity.document) entity = entity.document
    const worldCounters = game.settings.get(MODULE.ID, settingKey)
    const entityCounters = getFlag(entity, 'counters') ?? {}

    return {
        ...processCounters('world', worldCounters, entity),
        ...processCounters('entity', entityCounters, entity)
    }
}

/**
 * Process counters
 */
function processCounters (type, counters, entity) {
    return Object.entries(foundry.utils.deepClone(counters))
        .filter(([_, counter]) => counter.visible && game.user.role >= (counter.viewRole ?? 1))
        .reduce((acc, [key, counter]) => {
            counter.property = (type === 'entity' && ['checkbox', 'number'].includes(counter.type)) ? `${key}.value` : key
            counter.canEdit = (!counter.editRole || game.user.role >= counter.editRole)
            if (['checkbox', 'number'].includes(counter.type)) {
                counter.value = entity.getFlag(MODULE.ID, counter.property)
            }
            if (counter.type === 'fraction') {
                counter.value = entity.getFlag(MODULE.ID, `${key}.value`) ?? 0
                counter.canEditMax = (!counter.max && counter.canEdit)
                counter.max = counter.max ?? entity.getFlag(MODULE.ID, `${key}.max`) ?? 0
            }
            if (counter.type === 'successFailure') {
                counter.success = entity.getFlag(MODULE.ID, `${key}.success`) ?? 0
                counter.failure = entity.getFlag(MODULE.ID, `${key}.failure`) ?? 0
            }
            acc[(type === 'entity' ? `counters.${key}` : key)] = counter
            return acc
        }, {})
}

/**
 * Render the counter tab for sheet with navigation tabs, e.g., items and groups
 */
function renderCountersTab (sheetType, html) {
    if (sheetType.group || sheetType.item) {
        const nav = html[0].querySelector('nav.sheet-navigation.tabs')
        const navItem = document.createElement('a')
        navItem.classList.add('item')
        navItem.setAttribute('data-tab', 'custom-dnd5e-counters')
        navItem.textContent = game.i18n.localize('CUSTOM_DND5E.counters')
        nav.appendChild(navItem)
    }
}

/**
 * Insert counters template into the HTML
 */
async function insertCounters (sheetType, counters, app, html, data) {
    const context = { editable: data.editable, counters }
    if (app._tabs[0].active === 'custom-dnd5e-counters') {
        context.active = ' active'
    }
    const template = await renderTemplate(sheetType.template, context)
    const element = html[0].querySelector(sheetType.insert.class)
    element.insertAdjacentHTML(sheetType.insert.position, template)
    return element.querySelector('#custom-dnd5e-counters')
}

/**
 * Setup counter click and key interactions
 * @param {object} entity    The entity, e.g., actor, item
 * @param {object} counters  The counters
 * @param {*} container      The container DOM element for the counters
 * @param {boolean} editable Whether the sheet is editable
 */
function setupCounterInteractions (entity, counters, container, editable) {
    if (!container) return

    // If sheet is set to editable, add the config button
    if (editable) {
        const configButton = container.querySelector('#custom-dnd5e-counters-edit-button')
        configButton?.addEventListener('click', () => openForm(entity))
    }

    if (entity.document) entity = entity.document

    Object.entries(counters).forEach(([key, counter]) => {
        if (!counter.canEdit) return

        const counterElement = container.querySelector(`[data-id="${key}"]`)
        const links = counterElement.querySelectorAll('.custom-dnd5e-counters-link')
        const inputs = counterElement.querySelectorAll('input')

        switch (counter.type) {
        case 'fraction':
            links[0].addEventListener('click', () => increaseFraction(entity, key))
            links[0].addEventListener('contextmenu', () => decreaseFraction(entity, key))
            inputs.forEach(input => {
                input.addEventListener('click', selectInputContent)
                if (input.dataset?.input === 'value') {
                    input.addEventListener('keyup', () => checkValue(input, entity, key), true)
                }
            })
            break
        case 'number':
            links[0].addEventListener('click', () => { increaseNumber(entity, counter.property) })
            links[0].addEventListener('contextmenu', () => decreaseNumber(entity, counter.property))
            inputs.forEach(input => {
                input.addEventListener('click', selectInputContent)
                if (input.dataset?.input === 'value') {
                    input.addEventListener('keyup', () => checkValue(input, entity, key), true)
                }
            })
            break
        case 'successFailure':
            links.forEach(link => {
                if (link.dataset?.input === 'success') {
                    link.addEventListener('click', () => increaseSuccess(entity, key))
                    link.addEventListener('contextmenu', () => decreaseSuccess(entity, key))
                } else if (link.dataset?.input === 'failure') {
                    link.addEventListener('click', () => increaseFailure(entity, key))
                    link.addEventListener('contextmenu', () => decreaseFailure(entity, key))
                }
            })
            inputs.forEach(input => {
                input.addEventListener('click', selectInputContent)
            })
        }
    })
}

/**
 * Open the individual counters form
 * @param {object} entity The entity
 */
function openForm (entity) {
    const form = new CountersFormIndividual(entity)
    form.render(true)
}

/**
 * Select content of an input element
 * @param {object} event The event
 */
function selectInputContent (event) {
    const input = event.target
    input.select()
    input.focus()
}

/**
 * Check input value against max
 * @param {object} input      The input element
 * @param {object} entity     The entity: actor or item
 * @param {object} counterKey The counter key
 */
function checkValue (input, entity, key) {
    const max = getMax(entity, key) ?? entity.getFlag(MODULE.ID, `${key}.max`)
    if (max && input.value > max) {
        input.value = max
    }
}

/**
 * Check checkbox counter
 * @param {object} entity     The entity: actor or item
 * @param {string} counterKey The counter key
 */
export function checkCheckbox (entity, counterKey) {
    counterKey = (counterKey.startsWith('counters.')) ? `${counterKey}.value` : counterKey
    entity.setFlag(MODULE.ID, counterKey, true)
}

/**
 * Uncheck checkbox counter
 * @param {object} entity     The entity: actor or item
 * @param {string} counterKey The counter key
 */
export function uncheckCheckbox (entity, counterKey) {
    counterKey = (counterKey.startsWith('counters.')) ? `${counterKey}.value` : counterKey
    entity.setFlag(MODULE.ID, counterKey, false)
}

/**
 * Decrease fraction counter
 * @param {object} entity      The entity: actor or item
 * @param {string} counterKey  The counter key
 * @param {number} actionValue The action value
 */
export function decreaseFraction (entity, counterKey, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.value`) ?? 0
    const newValue = Math.max(oldValue - actionValue, 0)
    if (oldValue > 0) {
        entity.setFlag(MODULE.ID, `${counterKey}.value`, newValue)
    }
}

/**
 * Increase fraction counter
 * @param {object} entity      The entity: actor or item
 * @param {string} counterKey  The counter key
 * @param {number} actionValue The action value
 */
export function increaseFraction (entity, counterKey, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.value`) ?? 0
    const maxValue = getMax(entity, counterKey) ?? entity.getFlag(MODULE.ID, `${counterKey}.max`)
    const newValue = oldValue + actionValue

    if (!maxValue || newValue <= maxValue) {
        entity.setFlag(MODULE.ID, `${counterKey}.value`, newValue)
    } else {
        ui.notifications.info(game.i18n.localize('CUSTOM_DND5E.reachedCounterLimit'))
    }
}

/**
 * Decrease number counter
 * @param {object} entity      The entity: actor or item
 * @param {string} counterKey  The counter key
 * @param {number} actionValue The action value
 */
export function decreaseNumber (entity, counterKey, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, counterKey) ?? 0
    const newValue = Math.max(oldValue - actionValue, 0)
    if (oldValue > 0) {
        entity.setFlag(MODULE.ID, counterKey, newValue)
    }
}

/**
 * Increase number counter
 * @param {object} entity      The entity: actor or item
 * @param {string} counterKey  The counter key
 * @param {number} actionValue The action value
 */
export function increaseNumber (entity, counterKey, actionValue = 1) {
    const originalKey = counterKey
    counterKey = (counterKey.startsWith('counters.')) ? `${counterKey}.value` : counterKey
    const oldValue = entity.getFlag(MODULE.ID, counterKey) ?? 0
    const maxValue = getMax(entity, counterKey) ?? entity.getFlag(MODULE.ID, `${originalKey}.max`)
    const newValue = oldValue + actionValue

    if (!maxValue || newValue <= maxValue) {
        entity.setFlag(MODULE.ID, counterKey, newValue)
    } else {
        ui.notifications.info(game.i18n.localize('CUSTOM_DND5E.reachedCounterLimit'))
    }
}

/**
 * Decrease success on success/failure counter
 * @param {object} entity      The entity: actor or item
 * @param {string} counterKey  The counter key
 * @param {number} actionValue The action value
 */
export function decreaseSuccess (entity, counterKey, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.success`) ?? 0
    const newValue = Math.max(oldValue - actionValue, 0)
    if (oldValue > 0) {
        entity.setFlag(MODULE.ID, `${counterKey}.success`, newValue)
    }
}

/**
 * Increase success on success/failure counter
 * @param {object} entity      The entity: actor or item
 * @param {string} counterKey  The counter key
 * @param {number} actionValue The action value
 */
export function increaseSuccess (entity, counterKey, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.success`) ?? 0
    const maxValue = getMax(entity, counterKey) ?? entity.getFlag(MODULE.ID, `${counterKey}.max`)
    const newValue = (maxValue) ? Math.min(oldValue + actionValue, maxValue) : oldValue + actionValue

    if (!maxValue || newValue <= maxValue) {
        entity.setFlag(MODULE.ID, `${counterKey}.success`, newValue)
    }
}

/**
 * Decrease failure on successFailure counter
 * @param {object} entity      The entity: actor or item
 * @param {string} counterKey   The counter key
 * @param {number} actionValue The action value
 */
export function decreaseFailure (entity, counterKey, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.failure`) ?? 0
    const newValue = Math.max(oldValue - actionValue, 0)
    if (oldValue > 0) {
        entity.setFlag(MODULE.ID, `${counterKey}.failure`, newValue)
    }
}

/**
 * Increase failure on successFailure counter
 * @param {object} entity      The entity: actor or item
 * @param {string} counterKey  The counter key
 * @param {number} actionValue The action value
 */
export function increaseFailure (entity, counterKey, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.failure`) ?? 0
    const maxValue = getMax(entity, counterKey) || entity.getFlag(MODULE.ID, `${counterKey}.max`)
    const newValue = (maxValue) ? Math.min(oldValue + actionValue, maxValue) : oldValue + actionValue

    if (!maxValue || newValue <= maxValue) {
        entity.setFlag(MODULE.ID, `${counterKey}.failure`, newValue)
    }
}

/**
 * Get counter setting by the entity
 * @param {object} entity The entity: actor or item
 * @param {string} key    The counter key
 * @returns {object}      The counter setting
 */
function getCounters (entity, key = null) {
    const type = (entity.documentName === 'Actor') ? entity.type : 'item'
    const settingKey = SETTING_BY_ENTITY_TYPE.COUNTERS[type]

    if (!key) {
        return mergeCounters(entity, settingKey)
    }

    if (key.startsWith('counters.')) {
        return getFlag(entity, key)
    }

    return getSetting(settingKey)[key]
}

/**
 * Get the counter's max value
 * @param {object} entity The entity: actor or item
 * @param {string} key    The counter key
 * @returns {number}      The max value
 */
function getMax (entity, key) {
    const setting = getCounters(entity, key)
    return setting?.max
}
