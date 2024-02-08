import { CONSTANTS } from './constants.js'
import { getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { DamageTypesForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
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
            default: CONFIG.CUSTOM_DND5E.damageTypes
        }
    )

    loadTemplates([
        CONSTANTS.DAMAGE_TYPES.TEMPLATE.FORM,
        CONSTANTS.DAMAGE_TYPES.TEMPLATE.LIST
    ])

    const setting = getSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY)
    if (!Object.keys(setting).length) {
        setSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY, CONFIG.CUSTOM_DND5E.damageTypes)
    }
}

/**
 * Set CONFIG.DND5E.damageTypes
 * @param {object} data
 */
export function setConfig (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                {
                    label: value.label,
                    icon: value.icon,
                    reference: value.reference
                }
            ])
    )

    const damageTypes = buildConfig(data)
    if (damageTypes) {
        CONFIG.DND5E.damageTypes = damageTypes
    }
}
