import { CONSTANTS } from './constants.js'
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
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
            default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E.armorTypes)
        }
    )
}

/**
 * Set CONFIG.DND5E.armorTypes
 * @param {object} data
 */
export function setConfig (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                game.i18n.localize(value.label)
            ])
    )

    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E.armorTypes)) {
            resetDnd5eConfig('armorTypes')
        }
        return
    }

    const armorTypes = buildConfig(data)
    if (armorTypes) {
        CONFIG.DND5E.armorTypes = armorTypes
    }
}
