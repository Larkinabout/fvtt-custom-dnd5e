import { MODULE } from './constants.js'

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
        if (!data) {
            console.log(`${MODULE.NAME} Debug | ${message}`)
            return
        }
        const dataClone = deepClone(data)
        console.log(`${MODULE.NAME} Debug | ${message}`, dataClone)
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
