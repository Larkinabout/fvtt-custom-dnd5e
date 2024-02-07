import { CONSTANTS } from './constants.js'
import { getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { LanguagesForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
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
            default: CONFIG.CUSTOM_DND5E.languages
        }
    )

    const languages = getSetting(CONSTANTS.LANGUAGES.SETTING.KEY)
    if (!Object.keys(languages).length) {
        setSetting(CONSTANTS.LANGUAGES.SETTING.KEY, CONFIG.CUSTOM_DND5E.languages)
    }
}

/**
 * Set CONFIG.DND5E.languages
 * @param {object} data
 */
export function setLanguages (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible)
            .map(([key, value]) => [
                key,
                value.children
                    ? { label: value.label, children: buildConfig(value.children) }
                    : value.label
            ])
    )

    CONFIG.DND5E.languages = buildConfig(data)
}
