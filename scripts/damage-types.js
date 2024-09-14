import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { DamageTypesForm } from './forms/config-form.js'

const property = 'damageTypes'

/**
 * Register
 */
export function register () {
    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.DAMAGE_TYPES.TEMPLATE.FORM,
            CONSTANTS.DAMAGE_TYPES.TEMPLATE.LIST
        ]
    )

    loadTemplates([
        CONSTANTS.DAMAGE_TYPES.TEMPLATE.FORM,
        CONSTANTS.DAMAGE_TYPES.TEMPLATE.LIST
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.DAMAGE_TYPES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.DAMAGE_TYPES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.DAMAGE_TYPES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.DAMAGE_TYPES.MENU.NAME),
            icon: CONSTANTS.DAMAGE_TYPES.MENU.ICON,
            type: DamageTypesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.DAMAGE_TYPES.SETTING.KEY,
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

    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E[property])) {
            resetDnd5eConfig(property)
        }
        return
    }

    const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data))
    config && (CONFIG.DND5E[property] = config)
}
