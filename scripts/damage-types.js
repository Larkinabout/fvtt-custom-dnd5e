import { CONSTANTS } from './constants.js'
import { c5eLoadTemplates, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { DamageTypesForm } from './forms/config-form.js'

const constants = CONSTANTS.DAMAGE_TYPES
const property = 'damageTypes'

/**
 * Register
 */
export function register () {
    registerSettings()

    const templates = [
        constants.TEMPLATE.FORM,
        constants.TEMPLATE.LIST
    ]
    c5eLoadTemplates(templates)
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        constants.MENU.KEY,
        {
            hint: game.i18n.localize(constants.MENU.HINT),
            label: game.i18n.localize(constants.MENU.LABEL),
            name: game.i18n.localize(constants.MENU.NAME),
            icon: constants.MENU.ICON,
            type: DamageTypesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        constants.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E[property]
        }
    )
}

/**
 * Set CONFIG.DND5E.damageTypes
 * @param {object} data
 */
export function setConfig (data = null) {
    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E[property])) {
            resetDnd5eConfig(property)
        }
        return
    }

    const buildConfig = (keys, data) => Object.fromEntries(
        keys.filter((key) => data[key].visible || data[key].visible === undefined)
            .map((key) => [
                key,
                {
                    color: data[key].color,
                    icon: data[key].icon,
                    ...(data[key].isPhysical !== undefined && { isPhysical: data[key].isPhysical }),
                    label: game.i18n.localize(data[key].label),
                    reference: data[key].reference
                }
            ])
    )

    const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data))
    config && (CONFIG.DND5E[property] = config)
}
