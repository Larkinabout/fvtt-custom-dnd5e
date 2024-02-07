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
            default: CONSTANTS.DAMAGE_TYPES.SETTING.DEFAULT
        }
    )

    const languages = getSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY)
    if (!Object.keys(languages).length) {
        setSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY, CONSTANTS.DAMAGE_TYPES.SETTING.DEFAULT)
    }

    loadTemplates([
        CONSTANTS.DAMAGE_TYPES.TEMPLATE.FORM,
        CONSTANTS.DAMAGE_TYPES.TEMPLATE.LIST
    ])
}

/**
 * Set CONFIG.DND5E.damageTypes
 * @param {object} data
 */
export function setDamageTypes (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible)
            .map(([key, value]) => [
                key,
                value.children
                    ? { label: value.label, children: buildConfig(value.children) }
                    : value.label
            ])
    )

    CONFIG.DND5E.damageTypes = buildConfig(data)
}
