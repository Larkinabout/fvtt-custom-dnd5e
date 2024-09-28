import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE, SHEET_TYPE } from './constants.js'
import { Logger, checkEmpty, getFlag, setFlag, unsetFlag, getSetting, registerMenu, registerSetting, makeDead } from './utils.js'
import { CountersForm } from './forms/counters-form.js'
import { CountersFormIndividual } from './forms/counters-form-individual.js'

const constants = CONSTANTS.COUNTERS

/**
 * Register Settings
 */
export function registerSettings () {
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

    registerSetting(
        constants.SETTING.CHARACTER_COUNTERS.KEY,
        {
            scope: 'world',
            config: false,
            type: Object
        }
    )

    registerSetting(
        constants.SETTING.NPC_COUNTERS.KEY,
        {
            scope: 'world',
            config: false,
            type: Object
        }
    )

    registerSetting(
        constants.SETTING.GROUP_COUNTERS.KEY,
        {
            scope: 'world',
            config: false,
            type: Object
        }
    )

    registerSetting(
        constants.SETTING.ITEM_COUNTERS.KEY,
        {
            scope: 'world',
            config: false,
            type: Object
        }
    )

    const templates = Object.values(constants.TEMPLATE)
    Logger.debug('Loading templates', templates)
    loadTemplates(templates)
}

/**
 * HOOKS
 */
Hooks.on('renderInnerActorSheet', (app, html, data) => {
    const sheetType = SHEET_TYPE[app.constructor.name]
    if (!sheetType) return

    addCounters(app, html, data, sheetType)
})

Hooks.on('renderInnerItemSheet', (app, html, data) => {
    const sheetType = SHEET_TYPE[app.constructor.name]
    if (!sheetType) return

    addCountersItem(app, html, data, sheetType)
})

Hooks.on('preUpdateActor', (actor, data, options) => {
    const currentHp = foundry.utils.getProperty(data ?? {}, 'system.attributes.hp.value')

    if (typeof currentHp === 'undefined') return

    const previousHp = actor.system.attributes.hp.value
    const halfHp = actor.system.attributes.hp.max * 0.5

    if (currentHp <= halfHp && previousHp > halfHp) {
        onTriggerHalfHp(actor)
    }
})

Hooks.on('updateActor', (actor, data, options) => {
    const hp = foundry.utils.getProperty(data ?? {}, 'system.attributes.hp.value')

    if (hp === 'undefined') return

    if (hp === 0) {
        onTriggerZeroHp(actor)
    }

    if (Object.hasOwn(data, 'flags') && data.flags[MODULE.ID] && !Object.hasOwn(data.flags[MODULE.ID], '-=counters')) {
        onTriggerCounterValue(actor, data)
    }
})

Hooks.on('deleteCombat', (combat, options, key) => {
    const combatants = combat.combatants
    combatants.forEach(combatant => {
        const actor = combatant.actor
        const flag = getFlag(actor, 'zeroHpCombatEnd')
        if (flag) {
            const setting = getCounters(actor)
            // Sort getCounters
            Object.entries(setting).forEach(([key, value]) => {
                const triggers = value.triggers
                if (!triggers) return
                triggers
                    .filter(trigger => trigger.trigger === 'zeroHpCombatEnd')
                    .forEach(trigger => handleAction(actor, key, trigger, value.type))
            })
            unsetFlag(actor, 'zeroHpCombatEnd')
        }
    })
})

Hooks.on('dnd5e.preRestCompleted', (actor, data) => {
    const restType = (data.longRest) ? 'longRest' : 'shortRest'
    onTriggerRest(restType, actor)
})

/**
 * Handler for 'zeroHp' trigger
 * @param {object} actor The actor
 */
function onTriggerZeroHp (actor) {
    const counters = getCounters(actor)

    Object.entries(counters).forEach(([source, counters2]) => {
        if (!counters2) return

        Object.entries(counters2).forEach(([key, value]) => {
            const triggers = value.triggers
            if (!triggers) return
            key = (source === 'entity') ? `counters.${key}` : key
            triggers
                .filter(trigger => trigger.trigger === 'zeroHp')
                .forEach(trigger => handleAction(actor, key, trigger, value.type))
            const zeroHpCombatEnd = triggers.find(trigger => trigger.trigger === 'zeroHpCombatEnd')
            if (actor.inCombat && zeroHpCombatEnd) {
                setFlag(actor, 'zeroHpCombatEnd', true)
            }
        })
    })
}

/**
 * Handler for 'halfHp' trigger
 * @param {object} actor The actor
 */
function onTriggerHalfHp (actor) {
    const counters = getCounters(actor)

    Object.entries(counters).forEach(([source, counters2]) => {
        if (!counters2) return

        Object.entries(counters2).forEach(([key, value]) => {
            const triggers = value.triggers
            if (!triggers) return
            key = (source === 'entity') ? `counters.${key}` : key
            triggers
                .filter(trigger => trigger.trigger === 'halfHp')
                .forEach(trigger => handleAction(actor, key, trigger, value.type))
        })
    })
}

/**
 * Handler for 'counterValue' trigger
 * @param {object} actor The actor
 * @param {object} data  The update data
 */
function onTriggerCounterValue (actor, data) {
    const counters = getCounters(actor)

    Object.entries(counters).forEach(([source, counters2]) => {
        if (!counters2) return

        Object.entries(counters2).forEach(([key, value]) => {
            key = (source === 'entity') ? `counters.${key}` : key
            const counterValue = (source === 'entity') ? data.flags[MODULE.ID][key]?.value : data.flags[MODULE.ID][key]
            if (!counterValue && counterValue !== 0) return
            const triggers = value.triggers
            if (!triggers) return
            triggers
                .filter(trigger => trigger.trigger === 'counterValue' && trigger.triggerValue === counterValue)
                .forEach(trigger => handleAction(actor, key, trigger, value.type))
        })
    })
}

/**
 * Handler for 'longRest' and 'shortRest' triggers
 * @param {string} restType The rest type: longRest or shortRest
 * @param {object} actor    The actor=
 */
function onTriggerRest (restType, actor) {
    const counters = getCounters(actor)

    Object.entries(counters).forEach(([source, counters2]) => {
        if (!counters2) return

        Object.entries(counters2).forEach(([key, value]) => {
            const triggers = value.triggers
            if (!triggers) return
            key = (source === 'entity') ? `counters.${key}` : key
            triggers
                .filter(trigger => trigger.trigger === restType)
                .forEach(trigger => handleAction(actor, key, trigger, value.type))
        })
    })
}

/**
 * Handler for a trigger action
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} trigger The trigger
 * @param {string} type    The counter type
 */
function handleAction (actor, key, trigger, type) {
    switch (trigger.action) {
    case 'check':
        checkCheckbox(actor, key)
        break
    case 'uncheck':
        uncheckCheckbox(actor, key)
        break
    case 'increase':
        handleIncreaseAction(actor, key, trigger, type)
        break
    case 'decrease':
        handleDecreaseAction(actor, key, trigger, type)
        break
    case 'dead':
        makeDead(actor)
        break
    }
}

/**
 * Handler for the 'increase' action
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} trigger The trigger
 * @param {string} type    The counter type
*/
function handleIncreaseAction (actor, key, trigger, type) {
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
 * Handler for the 'decrease' action
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} trigger The trigger
 * @param {string} type    The counter type
 */
function handleDecreaseAction (actor, key, trigger, type) {
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
 * Add counters to the sheet
 * @param {object} app       The app
 * @param {object} html      The HTML
 * @param {object} data      The data
 * @param {string} sheetType The actor sheet type
 */
async function addCounters (app, html, data, sheetType) {
    const entity = (!sheetType.item) ? app.actor : app
    const counters = {}
    const worldCounters = game.settings.get(MODULE.ID, sheetType.countersSetting)
    const entityCounters = (sheetType.character || sheetType.npc) ? getFlag(entity, 'counters') ?? {} : {}

    Object.entries(foundry.utils.deepClone(worldCounters))
        .filter(([key, counter]) => counter.visible && game.user.role >= (counter.viewRole ?? 1))
        .forEach(([key, counter]) => {
            counter.canEdit = (!counter.editRole || game.user.role >= counter.editRole)
            counter.property = key
            if (['checkbox', 'number'].includes(counter.type)) {
                counter.value = entity.getFlag(MODULE.ID, key)
            }
            if (counter.type === 'fraction') {
                counter.value = entity.getFlag(MODULE.ID, `${key}.value`) ?? 0
                counter.max = counter.max ?? entity.getFlag(MODULE.ID, `${key}.max`) ?? 0
            }
            if (counter.type === 'successFailure') {
                counter.success = entity.getFlag(MODULE.ID, `${key}.success`) ?? 0
                counter.failure = entity.getFlag(MODULE.ID, `${key}.failure`) ?? 0
            }
            counters[key] = counter
        })

    Object.entries(entityCounters)
        .filter(([key, counter]) => counter.visible && game.user.role >= (counter.viewRole ?? 1))
        .forEach(([key, counter]) => {
            counter.canEdit = (!counter.editRole || game.user.role >= counter.editRole)
            counter.property = (['checkbox', 'number'].includes(counter.type)) ? `${key}.value` : key
            if (['checkbox', 'number'].includes(counter.type)) {
                counter.property = `${key}.value`
                counter.value = entity.getFlag(MODULE.ID, counter.property)
            }
            if (counter.type === 'fraction') {
                counter.property = key
                counter.value = entity.getFlag(MODULE.ID, `${key}.value`)
                counter.canEditMax = (!counter.max && counter.canEdit)
                counter.max = counter.max ?? entity.getFlag(MODULE.ID, `${key}.max`)
            }
            if (counter.type === 'successFailure') {
                counter.property = key
                counter.success = entity.getFlag(MODULE.ID, `${key}.success`) ?? 0
                counter.failure = entity.getFlag(MODULE.ID, `${key}.failure`) ?? 0
            }
            counters[`counters.${key}`] = counter
        })

    if (!data?.editable && checkEmpty(counters)) return

    // Add tab to navigation for group sheets
    if (sheetType.group || sheetType.item) {
        const nav = html[0].querySelector('nav.sheet-navigation.tabs')
        const navItem = document.createElement('a')
        navItem.classList.add('item')
        navItem.setAttribute('data-tab', 'custom-dnd5e-counters')
        navItem.textContent = game.i18n.localize('CUSTOM_DND5E.counters')
        nav.appendChild(navItem)
    }

    const context = { editable: data.editable, counters }
    if (app._tabs[0].active === 'custom-dnd5e-counters') {
        context.active = ' active'
    }
    const template = await renderTemplate(sheetType.template, context)
    const container = html[0].querySelector(sheetType.insert.class)
    container.insertAdjacentHTML(sheetType.insert.position, template)

    const countersContainer = container.querySelector('#custom-dnd5e-counters')
    if (!countersContainer) return

    // If sheet is set to editable, add the config button
    if (data.editable) {
        const configButton = countersContainer.querySelector('#custom-dnd5e-counters-config-button')
        configButton?.addEventListener('click', () => openForm(entity))
    }

    Object.entries(counters).forEach(([key, counter]) => {
        if (!counter.canEdit) return

        const counterElement = countersContainer.querySelector(`[data-id="${key}"]`)
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

    if (!Object.keys(counters).length) {
        countersContainer.classList?.add('empty')
    }
}

function openForm (entity) {
    const form = new CountersFormIndividual(entity)
    form.render(true)
}

/**
 * Select content of an input
 * @param {object} event The event
 */
function selectInputContent (event) {
    const input = event.target
    input.select()
    input.focus()
}

/**
 * Check input value against max
 * @param {object} input  The input
 * @param {object} entity The entity: actor or item
 * @param {object} key    The counter key
 */
function checkValue (input, entity, key) {
    const max = getMax(entity, key) || entity.getFlag(MODULE.ID, `${key}.max`)
    if (max && input.value > max) {
        input.value = max
    }
}

/**
 * Check checkbox counter
 * @param {object} entity The entity: actor or item
 * @param {string} key    The counter key
 */
function checkCheckbox (entity, key) {
    key = (key.startsWith('counters.')) ? `${key}.value` : key
    entity.setFlag(MODULE.ID, key, true)
}

/**
 * Uncheck checkbox counter
 * @param {object} entity The entity: actor or item
 * @param {string} key    The counter key
 */
function uncheckCheckbox (entity, key) {
    key = (key.startsWith('counters.')) ? `${key}.value` : key
    entity.setFlag(MODULE.ID, key, false)
}

/**
 * Decrease fraction counter
 * @param {object} entity      The entity: actor or item
 * @param {string} key         The counter key
 * @param {number} actionValue The action value
 */
function decreaseFraction (entity, key, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${key}.value`) || 0
    const newValue = Math.max(oldValue - actionValue, 0)
    if (oldValue > 0) {
        entity.setFlag(MODULE.ID, `${key}.value`, newValue)
    }
}

/**
 * Increase fraction counter
 * @param {object} entity      The entity: actor or item
 * @param {string} key         The counter key
 * @param {number} actionValue The action value
 */
function increaseFraction (entity, key, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${key}.value`) || 0
    const maxValue = getMax(entity, key) || entity.getFlag(MODULE.ID, `${key}.max`)
    const newValue = (maxValue) ? Math.min(oldValue + actionValue, maxValue) : oldValue + actionValue

    if (!maxValue || newValue <= maxValue) {
        entity.setFlag(MODULE.ID, `${key}.value`, newValue)
    }
}

/**
 * Decrease number counter
 * @param {object} entity      The entity: actor or item
 * @param {string} key         The counter key
 * @param {number} actionValue The action value
 */
function decreaseNumber (entity, key, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, key) || 0
    const newValue = Math.max(oldValue - actionValue, 0)
    if (oldValue > 0) {
        entity.setFlag(MODULE.ID, key, newValue)
    }
}

/**
 * Increase number counter
 * @param {object} entity      The entity: actor or item
 * @param {string} key         The counter key
 * @param {number} actionValue The action value
 */
function increaseNumber (entity, key, actionValue = 1) {
    const originalKey = key
    key = (key.startsWith('counters.')) ? `${key}.value` : key
    const oldValue = entity.getFlag(MODULE.ID, key) || 0
    const maxValue = getMax(entity, key) || entity.getFlag(MODULE.ID, `${originalKey}.max`)
    const newValue = (maxValue) ? Math.min(oldValue + actionValue, maxValue) : oldValue + actionValue

    if (!maxValue || newValue <= maxValue) {
        entity.setFlag(MODULE.ID, key, newValue)
    }
}

/**
 * Decrease success on successFailure counter
 * @param {object} entity      The entity: actor or item
 * @param {string} key         The counter key
 * @param {number} actionValue The action value
 */
function decreaseSuccess (entity, key, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${key}.success`) || 0
    const newValue = Math.max(oldValue - actionValue, 0)
    if (oldValue > 0) {
        entity.setFlag(MODULE.ID, `${key}.success`, newValue)
    }
}

/**
 * Increase success on successFailure counter
 * @param {object} entity      The entity: actor or item
 * @param {string} key         The counter key
 * @param {number} actionValue The action value
 */
function increaseSuccess (entity, key, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${key}.success`) || 0
    const maxValue = getMax(entity, key) || entity.getFlag(MODULE.ID, `${key}.max`)
    const newValue = (maxValue) ? Math.min(oldValue + actionValue, maxValue) : oldValue + actionValue

    if (!maxValue || newValue <= maxValue) {
        entity.setFlag(MODULE.ID, `${key}.success`, newValue)
    }
}

/**
 * Decrease failure on successFailure counter
 * @param {object} entity      The entity: actor or item
 * @param {string} key         The counter key
 * @param {number} actionValue The action value
 */
function decreaseFailure (entity, key, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${key}.failure`) || 0
    const newValue = Math.max(oldValue - actionValue, 0)
    if (oldValue > 0) {
        entity.setFlag(MODULE.ID, `${key}.failure`, newValue)
    }
}

/**
 * Increase failure on successFailure counter
 * @param {object} entity      The entity: actor or item
 * @param {string} key         The counter key
 * @param {number} actionValue The action value
 */
function increaseFailure (entity, key, actionValue = 1) {
    const oldValue = entity.getFlag(MODULE.ID, `${key}.failure`) || 0
    const maxValue = getMax(entity, key) || entity.getFlag(MODULE.ID, `${key}.max`)
    const newValue = (maxValue) ? Math.min(oldValue + actionValue, maxValue) : oldValue + actionValue

    if (!maxValue || newValue <= maxValue) {
        entity.setFlag(MODULE.ID, `${key}.failure`, newValue)
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
        return {
            world: getSetting(settingKey),
            entity: getFlag(entity, 'counters')
        }
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
