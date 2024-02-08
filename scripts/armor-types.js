import { CONSTANTS } from './constants.js'
import { getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { ArmorTypesForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerMenu(
        CONSTANTS.ARMOR_TYPES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ARMOR_TYPES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ARMOR_TYPES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ARMOR_TYPES.MENU.NAME),
            icon: CONSTANTS.ARMOR_TYPES.MENU.ICON,
            type: ArmorTypesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ARMOR_TYPES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E.armorTypes
        }
    )

    const setting = getSetting(CONSTANTS.ARMOR_TYPES.SETTING.KEY)
    if (!Object.keys(setting).length) {
        setSetting(CONSTANTS.ARMOR_TYPES.SETTING.KEY, CONFIG.CUSTOM_DND5E.armorTypes)
    }
}

/**
 * Set CONFIG.DND5E.armorTypes
 * @param {object} data
 */
export function setConfig (data) {
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

    CONFIG.DND5E.armorTypes = buildConfig(data)
}
