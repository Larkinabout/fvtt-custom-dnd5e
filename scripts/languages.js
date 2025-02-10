import { CONSTANTS } from './constants.js'
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { LanguagesForm } from './forms/config-form.js'

const property = 'languages'

/**
 * Register
 */
export function register () {
    registerSettings()
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.LANGUAGES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.LANGUAGES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.LANGUAGES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.LANGUAGES.MENU.NAME),
            icon: CONSTANTS.LANGUAGES.MENU.ICON,
            type: LanguagesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.LANGUAGES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
        }
    )
}

/**
 * Set CONFIG.DND5E.languages
 * @param {object} data
 */
export function setConfig (data = null) {
    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E[property])) {
            resetDnd5eConfig(property)
        }
        return
    }

    const buildConfig = (keys, data) => Object.fromEntries(
        keys.filter((key) => data[key].visible || data[key].visible === undefined)
            .map((key) => [
                key,
                data[key].children
                    ? { label: game.i18n.localize(data[key].label), children: buildConfig(Object.keys(data[key].children), data[key].children) }
                    : game.i18n.localize(data[key]?.label || data[key])
            ])
    )

    const coreConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    const currentConfig = foundry.utils.deepClone(CONFIG.DND5E[property])
    const mergedConfig = foundry.utils.mergeObject(foundry.utils.mergeObject(coreConfig, currentConfig), data)
    const config = buildConfig(Object.keys(mergedConfig), mergedConfig)
    config && (CONFIG.DND5E[property] = config)
}
