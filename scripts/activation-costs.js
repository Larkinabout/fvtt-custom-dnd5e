import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { ActivationCostsForm } from './forms/config-form.js'

const constants = CONSTANTS.ACTIVATION_COSTS
const property = 'activityActivationTypes'

/**
 * Register
 */
export function register () {
    if (!foundry.utils.isNewerVersion(game.dnd5e.version, '3.3.1')) return

    registerSettings()

    const templates = [
        constants.TEMPLATE.FORM,
        constants.TEMPLATE.LIST
    ]
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
            type: ActivationCostsForm,
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
