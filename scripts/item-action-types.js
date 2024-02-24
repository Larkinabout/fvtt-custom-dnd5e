import { CONSTANTS } from './constants.js'
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { ItemActionTypesForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerMenu(
        CONSTANTS.ITEM_ACTION_TYPES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ITEM_ACTION_TYPES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ITEM_ACTION_TYPES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ITEM_ACTION_TYPES.MENU.NAME),
            icon: CONSTANTS.ITEM_ACTION_TYPES.MENU.ICON,
            type: ItemActionTypesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ITEM_ACTION_TYPES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E.itemActionTypes
        }
    )
}

/**
 * Set CONFIG.DND5E.itemActionTypes
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
        if (checkEmpty(CONFIG.DND5E.itemActionTypes)) {
            resetDnd5eConfig('itemActionTypes')
        }
        return
    }

    const itemActionTypes = buildConfig(data)
    if (itemActionTypes) {
        CONFIG.DND5E.itemActionTypes = itemActionTypes
    }
}