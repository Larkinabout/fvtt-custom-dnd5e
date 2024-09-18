import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { ActivationCostsForm } from './forms/config-form.js'

const property = 'activityActivationTypes'

/**
 * Register
 */
export function register () {
    if (!foundry.utils.isNewerVersion(game.dnd5e.version, '3.3.1')) return

    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.ACTIVATION_COSTS.TEMPLATE.FORM,
            CONSTANTS.ACTIVATION_COSTS.TEMPLATE.LIST
        ]
    )

    loadTemplates([
        CONSTANTS.ACTIVATION_COSTS.TEMPLATE.FORM,
        CONSTANTS.ACTIVATION_COSTS.TEMPLATE.LIST
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.ACTIVATION_COSTS.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ACTIVATION_COSTS.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ACTIVATION_COSTS.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ACTIVATION_COSTS.MENU.NAME),
            icon: CONSTANTS.ACTIVATION_COSTS.MENU.ICON,
            type: ActivationCostsForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ACTIVATION_COSTS.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E[property]
        }
    )
}

/**
 * Set CONFIG.DND5E.activityActivationTypes
 * @param {object} data
 */
export function setConfig (data = null) {
    const buildConfig = (keys, data) => Object.fromEntries(
        keys.filter((key) => data[key].visible || data[key].visible === undefined)
            .map((key) => [
                key,
                {
                    ...(data[key].group !== undefined && { group: data[key].group }),
                    label: game.i18n.localize(data[key].label),
                    ...(data[key].scalar !== undefined && { scalar: data[key].scalar })
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
