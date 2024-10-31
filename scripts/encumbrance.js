import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { EncumbranceForm } from './forms/encumbrance-form.js'

const constants = CONSTANTS.ENCUMBRANCE
const property = 'encumbrance'

/**
 * Register
 */
export function register () {
    // Return if the Variant Encumbrance + Midi module is active
    if (game.modules.get('variant-encumbrance-dnd5e')?.active) return

    registerSettings()

    const templates = [constants.TEMPLATE.FORM]
    Logger.debug('Loading templates', templates)
    loadTemplates(templates)
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        constants.MENU.KEY,
        {
            hint: game.i18n.localize(constants.MENU.HINT),
            label: game.i18n.localize(constants.MENU.LABEL),
            name: game.i18n.localize(constants.MENU.NAME),
            icon: constants.MENU.ICON,
            type: EncumbranceForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        constants.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E.encumbrance
        }
    )

    registerSetting(
        constants.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )

    registerSetting(
        constants.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )

    registerSetting(
        constants.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
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
        if (checkEmpty(CONFIG.DND5E[property])) {
            resetDnd5eConfig(property)
        }
        return
    }

    const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    const config = foundry.utils.mergeObject(defaultConfig, data)

    if (config?.effects?.encumbered?.name) config.effects.encumbered.name = game.i18n.localize(config.effects.encumbered.name)
    if (config?.effects?.exceedingCarryingCapacity?.name) config.effects.exceedingCarryingCapacity.name = game.i18n.localize(config.effects.exceedingCarryingCapacity.name)
    if (config?.effects?.heavilyEncumbered?.name) config.effects.heavilyEncumbered.name = game.i18n.localize(config.effects.heavilyEncumbered.name)

    config && (CONFIG.DND5E[property] = config)
}
