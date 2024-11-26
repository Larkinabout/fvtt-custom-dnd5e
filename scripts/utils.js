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
        if (game.settings && game.settings.get(MODULE.ID, CONSTANTS.DEBUG.SETTING.KEY)) {
            if (!data) {
                console.log(`${MODULE.NAME} Debug | ${message}`)
                return
            }
            const dataClone = foundry.utils.deepClone(data)
            console.log(`${MODULE.NAME} Debug | ${message}`, dataClone)
        }
    }
}

/**
 * Check whether the variable is empty
 * @param {} data The data
 * @returns {boolean}
 */
export function checkEmpty (data) {
    return (data && typeof data === 'object' && !Object.keys(data).length) || (data !== false && !data)
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
 * Open a document
 * @param {string} uuid The UUID
 */
export async function openDocument (uuid) {
    const document = await fromUuid(uuid)
    if (document) {
        document.sheet.render(true)
    }
}

/**
 * Reset the dnd5e config to its default
 * @param {string} property The property
 */
export function resetDnd5eConfig (property) {
    CONFIG.DND5E[property] = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    Logger.debug(`Config 'CONFIG.DND5E.${property}' reset to default`)
    return CONFIG.DND5E[property]
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
 * Get parts of a die
 * @param {string} input The die input
 * @returns {object|null}     The die parts
 */
export function getDieParts (input) {
    if (!input) return null

    const regex = /\b(\d+)[dD](\d+)\b/
    const match = input.match(regex)
    if (match) {
        return {
            number: parseInt(match[1], 10),
            faces: parseInt(match[2], 10)
        }
    } else {
        return null
    }
}

/**
 * Get flag
 * @param {object} entity The entity
 * @param {string} key    The flag key
 * @returns
 */
export function getFlag (entity, key) {
    const flag = entity.getFlag(MODULE.ID, key)
    return (flag || flag === 0) ? flag : null
}

/**
 * Set flag
 * @param {object} entity The entity
 * @param {string} key    The flag key
 * @returns
 */
export async function setFlag (entity, key, value) {
    Logger.debug('Setting flag...', { entity, key, value })
    await entity.setFlag(MODULE.ID, key, value)
    Logger.debug('Flag set', { entity, key, value })
}

/**
 * Unset flag
 * @param {object} entity The entity
 * @param {string} key    The flag key
 * @returns
 */
export async function unsetFlag (entity, key) {
    Logger.debug('Unsetting flag...', { entity, key })
    await entity.unsetFlag(MODULE.ID, key)
    Logger.debug('Flag unset', { entity, key })
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
        Logger.debug(`Setting '${key}' not found. Searching world settings storage...`)
        const worldStorage = game.settings.storage.get('world').find(value => value.key === `${MODULE.ID}.${key}`)

        if (worldStorage !== undefined) return worldStorage.value

        Logger.debug(`Setting '${key}' not found. Searching client settings storage...`)

        const clientStorage = game.settings.storage.get('client')[`${MODULE.ID}.${key}`]

        if (clientStorage !== undefined) return clientStorage

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
 * Reset setting
 * @public
 * @param {string} key   The setting key
 */
export async function resetSetting (key) {
    const setting = game.settings.settings.get(`${MODULE.ID}.${key}`)
    if (setting) {
        const value = setting.default
        if (typeof value !== 'undefined') {
            await game.settings.set(MODULE.ID, key, value)
        } else {
            Logger.debug(`Setting '${key}' default not defined`)
        }
        Logger.debug(`Setting '${key}' reset to '${value}'`)
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

/**
 * Make the actor bloodied
 * @param {object} actor The actor
 */
export async function makeBloodied (actor) {
    if (!actor.effects.get('dnd5ebloodied000') && !actor.system.traits.ci.value.has('bloodied')) {
        Logger.debug('Making Bloodied...', actor)
        const cls = getDocumentClass('ActiveEffect')
        const effect = await cls.fromStatusEffect('bloodied')
        effect.updateSource({ id: 'dnd5ebloodied000', _id: 'dnd5ebloodied000' })
        await cls.create(effect, { parent: actor, keepId: true })
        Logger.debug('Bloodied made', actor)
    }
}

/**
 * Unmake the actor bloodied
 * @param {object} actor The actor
 */
export async function unmakeBloodied (actor) {
    Logger.debug('Unmaking Bloodied...', actor)
    const effect = actor.effects.get('dnd5ebloodied000')
    await effect?.delete()
    Logger.debug('Bloodied unmade', actor)
}

/**
 * Make the actor unconscious
 * @param {object} actor The actor
 */
export async function makeUnconscious (actor) {
    if (!actor.effects.get('dnd5eunconscious') && !actor.system.traits.ci.value.has('unconscious')) {
        Logger.debug('Making Unconscious...', actor)
        const cls = getDocumentClass('ActiveEffect')
        const effect = await cls.fromStatusEffect('unconscious')
        effect.updateSource({ id: 'dnd5eunconscious', _id: 'dnd5eunconscious', 'flags.core.overlay': true })
        await cls.create(effect, { parent: actor, keepId: true })
        Logger.debug('Unconscious made', actor)
    }
}

/**
 * Unmake the actor unconscious
 * @param {object} actor The actor
 */
export async function unmakeUnconscious (actor) {
    Logger.debug('Unmaking Unconscious...', actor)
    const effect = actor.effects.get('dnd5eunconscious')
    await effect?.delete()
    Logger.debug('Unconscious unmade', actor)
}

/**
 * Rotate token
 * @param {object} token    The token
 * @param {number} rotation The angle of rotation
 */
export async function rotateToken (token, rotation) {
    if (token.document.rotation === rotation) return

    Logger.debug('Rotating token', { token, rotation })

    const flag = getFlag(token.document, 'rotation')
    if (!flag && flag !== 0) {
        await setFlag(token.document, 'rotation', token.document.rotation)
    }

    token.document.update({ rotation })

    Logger.debug('Token rotated', { token, rotation })
}

/**
 * Unrotate token
 * @param {object} token The token
 */
export async function unrotateToken (token) {
    const rotation = getFlag(token.document, 'rotation')

    if (token.document.rotation === rotation) return

    Logger.debug('Unrotating token', { token, rotation })

    if (rotation || rotation === 0) {
        token.document.update({ rotation })
        await unsetFlag(token.document, 'rotation')
    }

    Logger.debug('Token unrotated', { token, rotation })
}

/**
 * Tint token
 * @param {object} token The token
 * @param {string} tint  The hex color
 */
export async function tintToken (token, tint) {
    if (token?.document?.texture?.tint === tint) return

    Logger.debug('Tinting token', { token, tint })

    if (!getFlag(token.document, 'tint')) {
        await setFlag(token.document, 'tint', token.document.texture.tint)
    }

    token.document.update({ texture: { tint } })

    Logger.debug('Token tinted', { token, tint })
}

/**
 * Untint token
 * @param {object} token The token
 */
export async function untintToken (token) {
    const tint = getFlag(token.document, 'tint')

    if (token?.document?.texture?.tint === tint) return

    Logger.debug('Untinting token', { token, tint })

    if (tint || tint === null) {
        token.document.update({ texture: { tint } })
        await unsetFlag(token.document, 'tint')
    }

    Logger.debug('Token untinted', { token, tint })
}

/**
 * Make the actor dead
 * Set HP to 0
 * Set Death Saves failures to 3
 * Apply 'Dead' status effect
 * @param {object} actor The actor
 * @param {object} data  The data
 */
export async function makeDead (actor, data = null) {
    Logger.debug('Making Dead...', actor)
    const applyNegativeHp = getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY)
    if (data) {
        if (!applyNegativeHp) { foundry.utils.setProperty(data, 'system.attributes.hp.value', 0) }
        foundry.utils.setProperty(data, 'system.attributes.death.failure', 3)
    } else {
        const data = {
            ...(!applyNegativeHp && { 'system.attributes.hp.value': 0 }),
            ...(actor.type === 'character' && { 'system.attributes.death.failure': 3 })
        }
        actor.update(data)
    }

    if (getSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY) && actor.effects.has('dnd5ebloodied000')) {
        unmakeBloodied(actor)
    }

    if (actor.effects.get('dnd5edead0000000')) return

    const cls = getDocumentClass('ActiveEffect')
    const effect = await cls.fromStatusEffect('dead')
    effect.updateSource({ 'flags.core.overlay': true })
    await cls.create(effect, { parent: actor, keepId: true })

    Logger.debug('Dead made', actor)
}

/**
 * Unmake the actor dead
 * @param {object} actor The actor
 */
export async function unmakeDead (actor) {
    Logger.debug('Unmaking Dead...', actor)
    const effect = actor.effects.get('dnd5edead0000000')
    await effect?.delete()
    Logger.debug('Dead unmade', actor)
}
