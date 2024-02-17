import { CONSTANTS } from './constants.js'
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { EncumbranceForm } from './forms/encumbrance-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
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

    loadTemplates([
        CONSTANTS.ENCUMBRANCE.TEMPLATE.FORM
    ])
}

/**
 * Set CONFIG.DND5E.encumbrance
 * @param {object} data
 */
export function setConfig (data) {
    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E.encumbrance)) {
            resetDnd5eConfig('encumbrance')
        }
        return
    }

    CONFIG.DND5E.encumbrance = data
}
