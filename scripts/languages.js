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
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                value.children
                    ? { label: game.i18n.localize(value.label), children: buildConfig(value.children) }
                    : game.i18n.localize(value?.label || value)
            ])
    )

    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E[property])) {
            resetDnd5eConfig(property)
        }
        return
    }

    const config = buildConfig(data)
    config && (CONFIG.DND5E[property] = config)
}
