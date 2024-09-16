import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, getSetting, registerSetting, resetDnd5eConfig } from './utils.js'
import { ConditionsForm } from './forms/conditions-form.js'
import { buildBloodied, registerBloodied } from './house-rules.js'

export function register () {
    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.CONDITIONS.TEMPLATE.FORM,
            CONSTANTS.CONDITIONS.TEMPLATE.LIST,
            CONSTANTS.CONDITIONS.TEMPLATE.EDIT
        ]
    )

    loadTemplates([
        CONSTANTS.CONDITIONS.TEMPLATE.FORM,
        CONSTANTS.CONDITIONS.TEMPLATE.LIST,
        CONSTANTS.CONDITIONS.TEMPLATE.EDIT
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.CONDITIONS.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.CONDITIONS.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.CONDITIONS.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.CONDITIONS.MENU.NAME),
            icon: CONSTANTS.CONDITIONS.MENU.ICON,
            type: ConditionsForm,
            restricted: false,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.CONDITIONS.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: getDefault()
        }
    )
}

/**
 * Get dnd5e config
 * @param {string=null} key The key
 * @returns {object}        The conditions and status effects
 */
export function getDnd5eConfig (key = null) {
    return buildData({ key, conditionTypes: CONFIG.CUSTOM_DND5E.conditionTypes, statusEffects: CONFIG.CUSTOM_DND5E.coreStatusEffects })
}

/**
 * Get setting default
 * @returns {object} The setting
 */
function getDefault () {
    return buildData({ conditionTypes: CONFIG.DND5E.conditionTypes, statusEffects: CONFIG.statusEffects })
}

/**
 * Build setting data
 * @param {object} config The config data
 * @returns {object}           The setting data
 */
function buildData (config) {
    let data = foundry.utils.deepClone((config.key) ? { [config.key]: config.conditionTypes[config.key] } : config.conditionTypes) ?? {}

    if (!config.key && getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)) {
        const bloodied = buildBloodied()

        const conditionTypes = {}

        Object.entries(data).forEach(([key, value]) => {
            const conditionLabel = game.i18n.localize(value.label)
            if (conditionLabel > bloodied.conditionType.label && !conditionTypes.bloodied) {
                conditionTypes.bloodied = bloodied.conditionType
                conditionTypes.bloodied.sheet = true
            }
            conditionTypes[key] = value
        })

        data = conditionTypes
    }

    const setStatusEffect = (data, statusEffect) => {
        if (data[statusEffect.id]) {
            if (statusEffect._id) { data[statusEffect.id]._id = statusEffect._id }
            if (statusEffect.hud) { data[statusEffect.id].hud = statusEffect.hud }
            if (!data[statusEffect.id].pseudo) data[statusEffect.id].sheet = true
        } else {
            data[statusEffect.id] = {
                ...(statusEffect._id !== undefined && { _id: statusEffect._id }),
                ...(statusEffect.hud !== undefined && { hud: statusEffect.hud }),
                icon: statusEffect.img,
                label: statusEffect.name,
                ...(statusEffect.levels !== undefined && { levels: statusEffect.levels }),
                ...(statusEffect.pseudo !== undefined && { pseudo: statusEffect.pseudo }),
                ...(statusEffect.reference !== undefined && { reference: statusEffect.reference }),
                ...(statusEffect.riders !== undefined && { riders: statusEffect.riders }),
                ...(statusEffect.statuses !== undefined && { statuses: statusEffect.statuses })
            }
        }
    }

    if (config.key) {
        const statusEffect = config.statusEffects.filter(statusEffect => statusEffect.id === config.key)

        if (statusEffect.length) {
            setStatusEffect(data, statusEffect[0])
        }
    } else {
        config.statusEffects.forEach((statusEffect) => {
            setStatusEffect(data, statusEffect)
        })
    }

    return (config.key) ? data[config.key] : data
}

/**
 * Set CONFIG.DND5E.conditionTypes
 * Set CONFIG.statusEffects
 * @param {object} data
 */
export function setConfig (data = null) {
    const properties = ['conditionTypes', 'statusEffects']

    // Initialise the config object
    const config = {
        conditionTypes: {},
        statusEffects: []
    }

    // Exit if data is empty and reset config
    if (checkEmpty(data)) {
        properties.forEach((property) => {
            const configType = (property === 'conditionTypes') ? CONFIG.DND5E : CONFIG
            if (checkEmpty(configType[property])) {
                resetDnd5eConfig(property)
            }
        })
        return
    }

    // Populate config
    Object.entries(data)
        .filter(([_, value]) => value.visible || value.visible === undefined)
        .forEach(([key, value]) => {
            const localisedLabel = game.i18n.localize(value.label ?? value)

            if (value.sheet || value.pseudo) {
                config.conditionTypes[key] = {
                    icon: value.icon,
                    label: localisedLabel,
                    ...(value.levels && { levels: value.levels }),
                    ...(value.pseudo && { pseudo: value.pseudo }),
                    ...(value.reference !== undefined && { reference: value.reference }),
                    ...(value.riders !== undefined && { riders: value.riders }),
                    ...(value.special !== undefined && { special: value.special }),
                    ...(value.statuses !== undefined && { statuses: value.statuses })
                }
            }

            config.statusEffects.push({
                ...(value.hud !== undefined && { hud: value.hud }),
                _id: `dnd5e${key}00000000000`.substring(0, 16),
                id: key,
                img: value.icon,
                ...(value.levels !== undefined && { levels: value.levels }),
                name: localisedLabel,
                ...(value.pseudo && { pseudo: value.pseudo })
            })
        })

    // Apply the config to CONFIG.DND5E
    properties.forEach(property => {
        if (Object.keys(config[property]).length) {
            const configType = (property === 'conditionTypes') ? CONFIG.DND5E : CONFIG
            configType[property] = config[property]
        }
    })

    // If 'Apply Bloodied' is enabled, re-register Bloodied
    registerBloodied()
}
