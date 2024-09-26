import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { AbilitiesForm } from './forms/config-form.js'

const property = 'abilities'

/**
 * Register
 */
export function register () {
    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.ABILITIES.TEMPLATE.FORM,
            CONSTANTS.ABILITIES.TEMPLATE.LIST
        ]
    )

    loadTemplates([
        CONSTANTS.ABILITIES.TEMPLATE.FORM,
        CONSTANTS.ABILITIES.TEMPLATE.LIST
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.ABILITIES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ABILITIES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ABILITIES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ABILITIES.MENU.NAME),
            icon: CONSTANTS.ABILITIES.MENU.ICON,
            type: AbilitiesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ABILITIES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            requiresReload: true,
            type: Object,
            default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
        }
    )
}

/**
 * Set CONFIG.DND5E.abilities
 * @param {object} data
 */
export function setConfig (data = null) {
    const buildConfig = (keys, data) => Object.fromEntries(
        keys.filter((key) => data[key].visible || data[key].visible === undefined)
            .map((key) => [
                key,
                {
                    abbreviation: game.i18n.localize(data[key].abbreviation),
                    ...(data[key].defaults !== undefined && { defaults: { ...data[key].defaults } }),
                    fullKey: data[key].fullKey,
                    ...(data[key].improvement === false && { improvement: data[key].improvement }),
                    label: game.i18n.localize(data[key].label),
                    reference: data[key].reference,
                    type: data[key].type
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
    const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data))
    config && (CONFIG.DND5E[property] = config)
}
