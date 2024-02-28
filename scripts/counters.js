import { CONSTANTS, MODULE, SHEET_TYPE } from './constants.js'
import { checkEmpty, getFlag, setFlag, unsetFlag, getSetting, registerMenu, registerSetting, makeDead } from './utils.js'
import { CountersForm } from './forms/counters-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerMenu(
        CONSTANTS.COUNTERS.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.COUNTERS.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.COUNTERS.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.COUNTERS.MENU.NAME),
            icon: CONSTANTS.COUNTERS.MENU.ICON,
            type: CountersForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY,
        {
            scope: 'world',
            config: false,
            type: Object
        }
    )

    registerSetting(
        CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY,
        {
            scope: 'world',
            config: false,
            type: Object
        }
    )

    loadTemplates([
        CONSTANTS.COUNTERS.TEMPLATE.FORM,
        CONSTANTS.COUNTERS.TEMPLATE.LIST,
        CONSTANTS.COUNTERS.TEMPLATE.ADVANCED_OPTIONS_FORM,
        CONSTANTS.COUNTERS.TEMPLATE.ADVANCED_OPTIONS_LIST
    ])
}

/**
 * HOOKS
 */
Hooks.on('renderActorSheet', (app, html, data) => {
    const actorSheetType = SHEET_TYPE[app.constructor.name]

    if (actorSheetType) {
        actorSheetType.legacy
            ? addCountersLegacy(app, html, data, actorSheetType)
            : addCounters(app, html, data, actorSheetType)
    }
})

Hooks.on('preUpdateActor', (actor, data, options) => {
    const currentHp = getProperty(data ?? {}, 'system.attributes.hp.value')
    const previousHp = actor.system.attributes.hp.value
    const halfHp = actor.system.attributes.hp.max * 0.5

    if (typeof currentHp !== 'undefined' && currentHp <= halfHp && previousHp > halfHp) {
        onTriggerHalfHp(actor)
    }
})

Hooks.on('updateActor', (actor, data, options) => {
    const hp = getProperty(data ?? {}, 'system.attributes.hp.value')

    if (hp === 0) {
        onTriggerZeroHp(actor)
    }

    if (Object.hasOwn(data, 'flags') && data.flags[MODULE.ID]) {
        onTriggerCounterValue(actor, data)
    }
})

Hooks.on('deleteCombat', (combat, options, key) => {
    const combatants = combat.combatants
    combatants.forEach(combatant => {
        const actor = combatant.actor
        const flag = getFlag(actor, 'zeroHpCombatEnd')
        if (flag) {
            const setting = getSettingByActorType(actor)
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

/**
 * Handler for 'zeroHp' trigger
 * @param {object} actor The actor
 */
function onTriggerZeroHp (actor) {
    const setting = getSettingByActorType(actor)

    if (!setting) return

    Object.entries(setting).forEach(([key, value]) => {
        const triggers = value.triggers
        if (!triggers) return
        triggers
            .filter(trigger => trigger.trigger === 'zeroHp')
            .forEach(trigger => handleAction(actor, key, trigger, value.type))
        const zeroHpCombatEnd = triggers.find(trigger => trigger.trigger === 'zeroHpCombatEnd')
        if (actor.inCombat && zeroHpCombatEnd) {
            setFlag(actor, 'zeroHpCombatEnd', true)
        }
    })
}

/**
 * Handler for 'halfHp' trigger
 * @param {object} actor The actor
 */
function onTriggerHalfHp (actor) {
    const setting = getSettingByActorType(actor)

    if (!setting) return

    Object.entries(setting).forEach(([key, value]) => {
        const triggers = value.triggers
        if (!triggers) return
        triggers
            .filter(trigger => trigger.trigger === 'halfHp')
            .forEach(trigger => handleAction(actor, key, trigger, value.type))
    })
}

/**
 * Handler for 'counterValue' trigger
 * @param {object} actor The actor
 * @param {object} data  The update data
 */
function onTriggerCounterValue (actor, data) {
    const setting = getSettingByActorType(actor)

    if (!setting) return

    Object.entries(setting).forEach(([key, value]) => {
        const counterValue = data.flags[MODULE.ID][key]
        if (!counterValue && counterValue !== 0) return
        const triggers = value.triggers
        if (!triggers) return
        triggers
            .filter(trigger => trigger.trigger === 'counterValue' && trigger.triggerValue === counterValue)
            .forEach(trigger => handleAction(actor, key, trigger, value.type))
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
 * @param {object} app            The app
 * @param {object} html           The HTML
 * @param {object} data           The data
 * @param {string} actorSheetType The actor sheet type
 */
function addCounters (app, html, data, actorSheetType) {
    const actor = app.actor
    const counters = game.settings.get(MODULE.ID, actorSheetType.countersSetting)

    if (checkEmpty(counters)) return

    const detailsRightDiv = html[0].querySelector('.tab.details > .right')
    const detailsRightTopDiv = detailsRightDiv.querySelector('.top')
    const countersDiv = createCountersDiv()
    const ul = countersDiv.appendChild(document.createElement('ul'))

    for (const [key, counter] of Object.entries(counters)) {
        if (!counter.visible || (counter.viewRole && game.user.role < counter.viewRole)) continue

        ul.appendChild(createCounterItem(actor, key, counter))
    }

    if (Object.values(counters).some(c => !c.system && c.visible)) {
        detailsRightTopDiv.after(countersDiv)
    }
}

/**
 * Create the Counters section
 * @returns {object} The DIV
 */
function createCountersDiv () {
    const div = document.createElement('div')
    div.classList.add('custom-dnd5e-counters-counters')

    const h3 = document.createElement('h3')
    h3.setAttribute('class', 'icon')
    div.appendChild(h3)

    const i = document.createElement('i')
    i.classList.add('fas', 'fa-scroll')
    h3.appendChild(i)

    const span = document.createElement('span')
    span.setAttribute('class', 'roboto-upper')
    span.textContent = game.i18n.localize('CUSTOM_DND5E.counters')
    h3.appendChild(span)

    return div
}

function createCounterItem (actor, key, counter) {
    let li = null
    switch (counter.type) {
    case 'checkbox': li = createCheckbox(actor, key, counter); break
    case 'number': li = createNumber(actor, key, counter); break
    case 'successFailure': li = createSuccessFailure(actor, key, counter); break
    case 'fraction': li = createFraction(actor, key, counter)
    }
    return li
}

/**
 * Create a checkbox counter
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} counter The counter
 * @returns {object}       The LI
 */
function createCheckbox (actor, key, counter) {
    const li = document.createElement('li')
    li.classList.add('custom-dnd5e-counters-counter', 'flexrow', key)

    const label = document.createElement('label')
    label.setAttribute('class', 'flexrow')
    li.appendChild(label)

    const h4 = document.createElement('h4')
    label.appendChild(h4)

    if (!counter.editRole || game.user.role >= counter.editRole) {
        const a = document.createElement('a')
        a.textContent = counter.label
        h4.appendChild(a)
    } else {
        h4.textContent = counter.label
    }

    const input = document.createElement('input')
    input.setAttribute('type', 'checkbox')
    input.setAttribute('name', `flags.${MODULE.ID}.${key}`)
    input.checked = actor.getFlag(MODULE.ID, key) || false
    input.setAttribute('value', actor.getFlag(MODULE.ID, key) || false)
    input.setAttribute('placeholder', 'false')
    input.setAttribute('data-dtype', 'Boolean')
    if (counter.editRole && game.user.role < counter.editRole) {
        input.setAttribute('disabled', 'true')
    }
    label.appendChild(input)

    return li
}

/**
 * Create a fraction counter
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} counter The counter
 * @returns {object}       The LI
 */
function createFraction (actor, key, counter) {
    const settingMax = getMax(actor, key)

    const li = document.createElement('li')
    li.classList.add('custom-dnd5e-counters-counter', 'flexrow', key)

    const h4 = document.createElement('h4')
    li.appendChild(h4)

    if (!counter.editRole || game.user.role >= counter.editRole) {
        const a = document.createElement('a')
        a.textContent = counter.label
        a.addEventListener('click', () => decreaseFraction(actor, key))
        a.addEventListener('contextmenu', () => increaseFraction(actor, key))
        h4.appendChild(a)
    } else {
        h4.textContent = counter.label
    }

    const div = document.createElement('div')
    div.classList.add('custom-dnd5e-counters-counter-value', 'custom-dnd5e-counters-fraction', key)
    li.appendChild(div)

    const divGroup = document.createElement('div')
    divGroup.classList.add('custom-dnd5e-counters-fraction-group', key)
    div.appendChild(divGroup)

    const inputValue = document.createElement('input')
    inputValue.setAttribute('type', 'number')
    inputValue.setAttribute('name', `flags.${MODULE.ID}.${key}.value`)
    inputValue.setAttribute('value', actor.getFlag(MODULE.ID, `${key}.value`))
    inputValue.setAttribute('placeholder', '0')
    inputValue.setAttribute('data-dtype', 'Number')
    if (counter.editRole && game.user.role < counter.editRole) {
        inputValue.classList.add('disabled')
        inputValue.setAttribute('disabled', 'true')
    } else {
        inputValue.addEventListener('click', event => selectInputContent(event))
        inputValue.addEventListener('keyup', () => checkValue(inputValue, actor, key))
    }
    divGroup.appendChild(inputValue)

    const span = document.createElement('span')
    span.classList.add('dnd5d-custom-counters-separator')
    span.textContent = '/'
    divGroup.appendChild(span)

    const inputMax = document.createElement('input')
    inputMax.setAttribute('type', 'number')
    inputMax.setAttribute('name', `flags.${MODULE.ID}.${key}.max`)
    inputMax.setAttribute('value', settingMax || actor.getFlag(MODULE.ID, `${key}.max`))
    inputMax.setAttribute('placeholder', '0')
    inputMax.setAttribute('data-dtype', 'Number')
    if ((counter.editRole && game.user.role < counter.editRole) || settingMax) {
        inputMax.classList.add('disabled')
        inputMax.setAttribute('disabled', 'true')
    } else {
        inputMax.addEventListener('click', event => selectInputContent(event))
    }
    divGroup.appendChild(inputMax)

    return li
}

/**
 * Create a number counter
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} counter The counter
 * @returns {object}       The LI
 */
function createNumber (actor, key, counter) {
    const li = document.createElement('li')
    li.classList.add('custom-dnd5e-counters-counter', 'flexrow', key)
    const h4 = document.createElement('h4')
    li.appendChild(h4)

    if (!counter.editRole || game.user.role >= counter.editRole) {
        const a = document.createElement('a')
        a.textContent = counter.label
        a.addEventListener('click', () => { increaseNumber(actor, key) })
        a.addEventListener('contextmenu', () => decreaseNumber(actor, key))
        h4.appendChild(a)
    } else {
        h4.textContent = counter.label
    }

    const div = document.createElement('div')
    div.classList.add('custom-dnd5e-counters-counter-value', 'custom-dnd5e-counters-number')
    li.appendChild(div)
    const input = document.createElement('input')
    input.setAttribute('type', 'number')
    input.setAttribute('name', `flags.${MODULE.ID}.${key}`)
    input.setAttribute('value', actor.getFlag(MODULE.ID, key) || 0)
    input.setAttribute('placeholder', '0')
    input.setAttribute('data-dtype', 'Number')
    if (counter.editRole && game.user.role < counter.editRole) {
        input.classList.add('disabled')
        input.setAttribute('disabled', 'true')
    } else {
        input.addEventListener('click', event => selectInputContent(event))
        input.addEventListener('keyup', () => checkValue(input, actor, key), true)
    }
    div.appendChild(input)

    return li
}

/**
 * Create a success/failure counter
 * @param {object} actor   The actor
 * @param {string} key     The counter key
 * @param {object} counter The counter
 * @returns {object}       The LI
 */
function createSuccessFailure (actor, key, counter) {
    const li = document.createElement('li')
    li.classList.add('custom-dnd5e-counters-counter', 'flexrow', key)

    const h4 = document.createElement('h4')
    h4.textContent = counter.label
    li.appendChild(h4)

    const div = document.createElement('div')
    div.classList.add('custom-dnd5e-counters-counter-value', 'custom-dnd5e-counters-success-failure', key)
    li.appendChild(div)

    const iSuccess = document.createElement('i')
    iSuccess.classList.add('fas', 'fa-check')

    if (!counter.editRole || game.user.role >= counter.editRole) {
        const aSuccess = document.createElement('a')
        aSuccess.addEventListener('click', () => increaseSuccess(actor, key))
        aSuccess.addEventListener('contextmenu', () => decreaseSuccess(actor, key))
        div.appendChild(aSuccess)
        aSuccess.appendChild(iSuccess)
    } else {
        div.appendChild(iSuccess)
    }

    const inputSuccess = document.createElement('input')
    inputSuccess.setAttribute('type', 'number')
    inputSuccess.setAttribute('name', `flags.${MODULE.ID}.${key}.success`)
    inputSuccess.setAttribute('value', actor.getFlag(MODULE.ID, `${key}.success`) || 0)
    inputSuccess.setAttribute('placeholder', '0')
    inputSuccess.setAttribute('data-dtype', 'Number')

    if (counter.editRole && game.user.role < counter.editRole) {
        inputSuccess.classList.add('disabled')
        inputSuccess.setAttribute('disabled', 'true')
    } else {
        inputSuccess.addEventListener('click', event => selectInputContent(event))
        inputSuccess.addEventListener('keyup', () => checkValue(inputSuccess, actor, key), true)
    }

    div.appendChild(inputSuccess)

    const iFailure = document.createElement('i')
    iFailure.classList.add('fas', 'fa-times')

    if (!counter.editRole || game.user.role >= counter.editRole) {
        const aFailure = document.createElement('a')
        aFailure.addEventListener('click', () => increaseFailure(actor, key))
        aFailure.addEventListener('contextmenu', () => decreaseFailure(actor, key))
        div.appendChild(aFailure)
        aFailure.appendChild(iFailure)
    } else {
        div.appendChild(iFailure)
    }

    const inputFailure = document.createElement('input')
    inputFailure.setAttribute('type', 'number')
    inputFailure.setAttribute('name', `flags.${MODULE.ID}.${key}.failure`)
    inputFailure.setAttribute('value', actor.getFlag(MODULE.ID, `${key}.failure`) || 0)
    inputFailure.setAttribute('placeholder', '0')
    inputFailure.setAttribute('data-dtype', 'Number')

    if (counter.editRole && game.user.role < counter.editRole) {
        inputFailure.classList.add('disabled')
        inputFailure.setAttribute('disabled', 'true')
    } else {
        inputFailure.addEventListener('click', event => selectInputContent(event))
        inputFailure.addEventListener('keyup', () => checkValue(inputFailure, actor, key), true)
    }

    div.appendChild(inputFailure)

    return li
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
 * @param {object} input The input
 * @param {object} actor The actor
 * @param {object} key   The counter key
 */
function checkValue (input, actor, key) {
    const max = getMax(actor, key) || actor.getFlag(MODULE.ID, `${key}.max`)
    if (max && input.value > max) {
        input.value = max
    }
}

function decreaseFraction (actor, key) {
    const value = actor.getFlag(MODULE.ID, `${key}.value`)
    if (value) {
        actor.setFlag(MODULE.ID, `${key}.value`, value - 1)
    }
}

function increaseFraction (actor, key) {
    const value = actor.getFlag(MODULE.ID, `${key}.value`) || 0
    const max = getMax(actor, key) || actor.getFlag(MODULE.ID, `${key}.max`)

    if (!max || value < max) {
        actor.setFlag(MODULE.ID, `${key}.value`, value + 1)
    }
}

function decreaseNumber (actor, key) {
    const value = actor.getFlag(MODULE.ID, key)
    if (value) {
        actor.setFlag(MODULE.ID, key, value - 1)
    }
}

function increaseNumber (actor, key) {
    const value = actor.getFlag(MODULE.ID, key) || 0
    const max = getMax(actor, key)

    if (!max || value < max) {
        actor.setFlag(MODULE.ID, key, value + 1)
    }
}

function decreaseSuccess (actor, key) {
    const value = actor.getFlag(MODULE.ID, `${key}.success`)
    if (value) {
        actor.setFlag(MODULE.ID, `${key}.success`, value - 1)
    }
}

function increaseSuccess (actor, key) {
    const value = actor.getFlag(MODULE.ID, `${key}.success`) || 0
    const max = getMax(actor, key)

    if (!max || value < max) {
        actor.setFlag(MODULE.ID, `${key}.success`, value + 1)
    }
}

function decreaseFailure (actor, key) {
    const value = actor.getFlag(MODULE.ID, `${key}.failure`)
    if (value) {
        actor.setFlag(MODULE.ID, `${key}.failure`, value - 1)
    }
}

function increaseFailure (actor, key) {
    const value = actor.getFlag(MODULE.ID, `${key}.failure`) || 0
    const max = getMax(actor, key)

    if (!max || value < max) {
        actor.setFlag(MODULE.ID, `${key}.failure`, value + 1)
    }
}

function getSettingByActorType (actor, key = null) {
    const settingKey = (actor.type === 'character')
        ? CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY
        : CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY
    return (key) ? getSetting(settingKey)[key] : getSetting(settingKey)
}

function getMax (actor, key) {
    const settingKey = (actor.type === 'character')
        ? CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY
        : CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY
    return getSetting(settingKey)[key]?.max
}

/**
 * Add counters to the legacy sheet
 * @param {object} app            The app
 * @param {object} html           The HTML
 * @param {object} data           The data
 * @param {string} actorSheetType The actor sheet type
 */
function addCountersLegacy (app, html, data, actorSheetType) {
    const counters = game.settings.get(MODULE.ID, actorSheetType.countersSetting)

    if (checkEmpty(counters)) return

    const countersDiv = html.find('.counters')

    for (const [key, counter] of Object.entries(counters)) {
        if (!counter.visible || counter.type === 'fraction' || (counter.viewRolle && game.user.role < counter.viewRole)) {
            continue
        }

        const counterDiv = document.createElement('div')
        counterDiv.classList.add('counter', 'flexrow', key)

        const h4 = document.createElement('h4')
        const h4Text = document.createTextNode(counter.label)
        h4.append(h4Text)

        const counterValueDiv = document.createElement('div')
        counterValueDiv.classList.add('counter-value')

        const counterInput1 = document.createElement('input')
        const counterInput2 = document.createElement('input')

        if (counter.editRole && game.user.role < counter.editRole) {
            counterInput1.classList.add('disabled')
            counterInput1.setAttribute('disabled', 'true')
            counterInput2.classList.add('disabled')
            counterInput2.setAttribute('disabled', 'true')
        }

        switch (counter.type) {
        case 'checkbox':
            counterInput1.setAttribute('type', 'checkbox')
            counterInput1.setAttribute('name', `flags.${MODULE.ID}.${key}`)
            counterInput1.checked = app.actor.getFlag(MODULE.ID, key) || false
            counterInput1.setAttribute('value', app.actor.getFlag(MODULE.ID, key) || false)
            counterInput1.setAttribute('placeholder', 'false')
            counterInput1.setAttribute('data-dtype', 'Boolean')
            break
        case 'number':
            counterInput1.setAttribute('type', 'text')
            counterInput1.setAttribute('name', `flags.${MODULE.ID}.${key}`)
            counterInput1.setAttribute('value', app.actor.getFlag(MODULE.ID, key) || 0)
            counterInput1.setAttribute('placeholder', '0')
            counterInput1.setAttribute('data-dtype', 'Number')
            break
        case 'successFailure':
            counterInput1.setAttribute('type', 'text')
            counterInput1.setAttribute('name', `flags.${MODULE.ID}.${key}.success`)
            counterInput1.setAttribute('value', app.actor.getFlag(MODULE.ID, `${key}.success`) || 0)
            counterInput1.setAttribute('placeholder', '0')
            counterInput1.setAttribute('data-dtype', 'Number')
            counterInput2.setAttribute('type', 'text')
            counterInput2.setAttribute('name', `flags.${MODULE.ID}.${key}.failure`)
            counterInput2.setAttribute('value', app.actor.getFlag(MODULE.ID, `${key}.failure`) || 0)
            counterInput2.setAttribute('placeholder', '0')
            counterInput2.setAttribute('data-dtype', 'Number')
            break
        }

        countersDiv[0].appendChild(counterDiv)
        counterDiv.appendChild(h4)
        counterDiv.appendChild(counterValueDiv)

        if (counter.type === 'successFailure') {
            const iSuccess = document.createElement('i')
            const iFailure = document.createElement('i')

            iSuccess.classList.add('fas', 'fa-check')
            iFailure.classList.add('fas', 'fa-times')

            counterValueDiv.appendChild(iSuccess)
            counterValueDiv.appendChild(counterInput1)
            counterValueDiv.appendChild(iFailure)
            counterValueDiv.appendChild(counterInput2)
        } else {
            counterValueDiv.appendChild(counterInput1)
        }
    }
}
