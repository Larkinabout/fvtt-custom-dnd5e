import { CONSTANTS, SHEET_TYPE } from './constants.js'
import { checkEmpty, getFlag, getSetting, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { ItemRarityForm } from './forms/config-form.js'

const property = 'itemRarity'

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.ITEM_RARITY.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ITEM_RARITY.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ITEM_RARITY.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ITEM_RARITY.MENU.NAME),
            icon: CONSTANTS.ITEM_RARITY.MENU.ICON,
            type: ItemRarityForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ITEM_RARITY.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E[property]
        }
    )
}

/**
 * Register hooks
 */
function registerHooks () {
}

/**
 * Set CONFIG.DND5E.itemRarity
 * @param {object} data
 */
export function setConfig (data = null) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                game.i18n.localize(value.label || value)
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
