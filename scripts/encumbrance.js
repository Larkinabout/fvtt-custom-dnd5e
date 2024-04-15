import { MODULE, CONSTANTS, SHEET_TYPE } from './constants.js'
import { Logger, checkEmpty, getSetting, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { EncumbranceForm } from './forms/encumbrance-form.js'

/**
 * Register
 */
export function register () {
    // Return if the Variant Encumbrance + Midi module is active
    if (game.modules.get('variant-encumbrance-dnd5e')?.active) return

    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.ENCUMBRANCE.TEMPLATE.FORM
        ]
    )

    loadTemplates([
        CONSTANTS.ENCUMBRANCE.TEMPLATE.FORM
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.ENCUMBRANCE.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ENCUMBRANCE.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ENCUMBRANCE.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ENCUMBRANCE.MENU.NAME),
            icon: CONSTANTS.ENCUMBRANCE.MENU.ICON,
            type: EncumbranceForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ENCUMBRANCE.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E.encumbrance
        }
    )

    registerSetting(
        CONSTANTS.ENCUMBRANCE.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )

    registerSetting(
        CONSTANTS.ENCUMBRANCE.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )

    registerSetting(
        CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )
}

/**
 * Set CONFIG.DND5E.encumbrance
 * @param {object} data
 */
export function setConfig (data = null) {
    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E.encumbrance)) {
            resetDnd5eConfig('encumbrance')
        }
        return
    }

    data && (CONFIG.DND5E.encumbrance = data)
}
