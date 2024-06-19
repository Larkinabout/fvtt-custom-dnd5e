import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { ArmorCalculationsForm } from './forms/config-form.js'

const property = 'armorClasses'

/**
 * Register
 */
export function register () {
    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.ARMOR_CALCULATIONS.TEMPLATE.FORM,
            CONSTANTS.ARMOR_CALCULATIONS.TEMPLATE.LIST
        ]
    )

    loadTemplates([
        CONSTANTS.ARMOR_CALCULATIONS.TEMPLATE.FORM,
        CONSTANTS.ARMOR_CALCULATIONS.TEMPLATE.LIST
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.ARMOR_CALCULATIONS.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ARMOR_CALCULATIONS.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ARMOR_CALCULATIONS.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ARMOR_CALCULATIONS.MENU.NAME),
            icon: CONSTANTS.SKILLS.MENU.ICON,
            type: ArmorCalculationsForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ARMOR_CALCULATIONS.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            requiresReload: true,
            type: Object,
            default: CONFIG.CUSTOM_DND5E[property]
        }
    )
}

/**
 * Set CONFIG.DND5E.skills
 * @param {object} data
 */
export function setConfig (data = null) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                {
                    formula: value.formula,
                    label: game.i18n.localize(value.label)
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
