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
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                {
                    color: value.color,
                    icon: value.icon,
                    ...(value.isPhysical !== undefined && { isPhysical: value.isPhysical }),
                    label: game.i18n.localize(value.label),
                    reference: value.reference
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
    const config = buildConfig(foundry.utils.mergeObject(defaultConfig, data))
    config && (CONFIG.DND5E[property] = config)
}
