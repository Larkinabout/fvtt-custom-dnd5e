import { CONSTANTS, MODULE } from './constants.js'

/**
 * Console logger
 */
export class Logger {
    static info (message, notify = false) {
        if (notify) ui.notifications.info(`${MODULE.NAME} | ${message}`)
        else console.log(`${MODULE.NAME} Info | ${message}`)
    }

    static error (message, notify = false) {
        if (notify) ui.notifications.error(`${MODULE.NAME} | ${message}`)
        else console.error(`${MODULE.NAME} Error | ${message}`)
    }

    static debug (message, data) {
        if (game.settings && getSetting(CONSTANTS.DEBUG.SETTING.KEY)) {
            if (!data) {
                console.log(`${MODULE.NAME} Debug | ${message}`)
                return
            }
            const dataClone = deepClone(data)
            console.log(`${MODULE.NAME} Debug | ${message}`, dataClone)
        }
    }
}

/**
 * Delete a property from an object using a dot notated key.
 * @param {object} object The object to update
 * @param {string} key    The string key
 * @returns {boolean}     Whether the property was deleted
 */
export function deleteProperty (object, key) {
    const keys = key.split('.')

    for (let i = 0; i < keys.length - 1; i++) {
        object = object[keys[i]]

        if (!object) {
            return false
        }
    }

    const lastKey = keys[keys.length - 1]
    delete object[lastKey]
    return true
}

/**
 * Register menu
 * @param {string} key     The setting key
 * @param {object} options The setting options
 */
export function registerMenu (key, options) {
    game.settings.registerMenu(MODULE.ID, key, options)
}

/**
 * Register setting
 * @param {string} key     The setting key
 * @param {object} options The setting options
 */
export function registerSetting (key, options) {
    game.settings.register(MODULE.ID, key, options)
}

/**
 * Get flag
 * @param {object} entity The entity
 * @param {string} key    The flag key
 * @returns
 */
export function getFlag (entity, key) {
    return entity.getFlag(MODULE.ID, key) || null
}

/**
 * Set flag
 * @param {object} entity The entity
 * @param {string} key    The flag key
 * @returns
 */
export async function setFlag (entity, key, value) {
    await entity.setFlag(MODULE.ID, key, value)
}

/**
 * Unset flag
 * @param {object} entity The entity
 * @param {string} key    The flag key
 * @returns
 */
export async function unsetFlag (entity, key) {
    await entity.unsetFlag(MODULE.ID, key)
}

/**
* Get setting
* @public
* @param {string} key               The setting key
* @param {string=null} defaultValue The setting default value
* @returns {*}                      The setting value
*/
export function getSetting (key, defaultValue = null) {
    let value = defaultValue ?? null
    try {
        value = game.settings.get(MODULE.ID, key)
    } catch {
        Logger.debug(`Setting '${key}' not found`)
    }
    return value
}

/**
* Get dnd5e setting
* @public
* @param {string} key               The setting key
* @param {string=null} defaultValue The setting default value
* @returns {*}                      The setting value
*/
export function getDnd5eSetting (key, defaultValue = null) {
    let value = defaultValue ?? null
    try {
        value = game.settings.get('dnd5e', key)
    } catch {
        Logger.debug(`Setting '${key}' not found`)
    }
    return value
}

/**
 * Set setting
 * @public
 * @param {string} key   The setting key
 * @param {string} value The setting value
 */
export async function setSetting (key, value) {
    if (game.settings.settings.get(`${MODULE.ID}.${key}`)) {
        await game.settings.set(MODULE.ID, key, value)
        Logger.debug(`Setting '${key}' set to '${value}'`)
    } else {
        Logger.debug(`Setting '${key}' not found`)
    }
}

/**
 * Set dnd5e setting
 * @public
 * @param {string} key   The setting key
 * @param {string} value The setting value
 */
export async function setDnd5eSetting (key, value) {
    if (game.settings.settings.get(`dnd5e.${key}`)) {
        await game.settings.set('dnd5e', key, value)
        Logger.debug(`Setting '${key}' set to '${value}'`)
    } else {
        Logger.debug(`Setting '${key}' not found`)
    }
}

export function appendDeleteButton (parentElement, inputName) {
    const button = document.createElement('button')
    button.setAttribute('type', 'button')
    button.setAttribute('data-tooltip', 'Delete')
    button.setAttribute('data-action', 'delete')
    button.classList.add('flex0', 'delete-button')
    parentElement.appendChild(button)

    const i = document.createElement('i')
    i.classList.add('fas', 'fa-xmark')
    button.appendChild(i)

    const input = document.createElement('input')
    input.setAttribute('id', 'delete')
    input.setAttribute('name', inputName)
    input.setAttribute('type', 'hidden')
    input.setAttribute('value', 'false')
    parentElement.appendChild(input)

    return button
}

export function appendFormFields (parentElement) {
    const div = document.createElement('div')
    div.setAttribute('class', 'form-fields')
    parentElement.appendChild(div)
    return div
}

export function appendFormGroup (parentElement) {
    const div = document.createElement('div')
    div.classList.add('form-group')
    parentElement.appendChild(div)
    return div
}

export function appendFormGroupLabel (formGroupElement, labelValue) {
    const label = document.createElement('label')
    label.classList.add('flex1')
    label.style.minWidth = '80px'
    label.style.maxWidth = '100px'
    label.textContent = labelValue
    formGroupElement.appendChild(label)
    return label
}

export function appendSelect (parentElement, selectId, selectName) {
    const select = document.createElement('select')
    select.setAttribute('id', selectId)
    select.setAttribute('name', selectName)
    parentElement.appendChild(select)
    return select
}

export function appendSelectOption (selectElement, optionValue, optionTextContent, hidden = false) {
    const option = document.createElement('option')
    option.setAttribute('id', optionValue)
    option.setAttribute('value', optionValue)
    if (hidden) option.classList.add('hidden')
    option.textContent = optionTextContent
    selectElement.appendChild(option)
    return option
}

/**
 * Make the actor dead
 * Set HP to 0
 * Set Death Saves failures to 3
 * Apply 'Dead' status effect
 * @param {object} actor The actor
 */
export async function makeDead (actor) {
    const data = { 'system.attributes.hp.value': 0 }
    if (actor.type === 'character') {
        data['system.attributes.death.failure'] = 3
    }
    actor.update(data)
    const existing = actor.effects.get('dnd5edead0000000')

    if (existing) { return }

    const effectData = foundry.utils.deepClone(CONFIG.statusEffects.find(ef => ef.id === 'dead'))
    effectData.statuses = ['dead']
    const cls = getDocumentClass('ActiveEffect')
    const effect = await cls.fromStatusEffect(effectData)
    effect.updateSource({ 'flags.core.overlay': true })
    await cls.create(effect, { parent: actor, keepId: true })
}
