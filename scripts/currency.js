import { CONSTANTS, SHEET } from './constants.js'
import { getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { CurrencyForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerMenu(
        CONSTANTS.CURRENCY.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.CURRENCY.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.CURRENCY.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.CURRENCY.MENU.NAME),
            icon: CONSTANTS.CURRENCY.MENU.ICON,
            type: CurrencyForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.CURRENCY.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E.currencies
        }
    )

    loadTemplates([
        CONSTANTS.CURRENCY.TEMPLATE.FORM,
        CONSTANTS.CURRENCY.TEMPLATE.LIST
    ])

    const setting = getSetting(CONSTANTS.CURRENCY.SETTING.KEY)
    if (!Object.keys(setting).length) {
        setSetting(CONSTANTS.CURRENCY.SETTING.KEY, CONFIG.CUSTOM_DND5E.currencies)
    }
}

/**
 * Set CONFIG.DND5E.currencies
 * @param {object} data
 */
export function setConfig (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                {
                    abbreviation: game.i18n.localize(value.abbreviation),
                    conversion: value.conversion,
                    label: game.i18n.localize(value.label)
                }
            ])
    )

    const currencies = buildConfig(data)
    if (currencies) {
        CONFIG.DND5E.currencies = currencies
    }
}

/**
 * HOOKS
 */

Hooks.on('renderCurrencyManager', (app, html, data) => {
    const setting = getSetting(CONSTANTS.CURRENCY.SETTING.KEY)

    Object.entries(setting).forEach(([key, value]) => {
        if (value.visible === false) {
            html[0].querySelector(`input[name="amount.${key}"]`)?.closest('label')?.remove()
        }
    })
})

Hooks.on('renderActorSheet', (app, html, data) => {
    const sheet = SHEET[app.constructor.name]

    const setting = getSetting(CONSTANTS.CURRENCY.SETTING.KEY)

    if (sheet.character && !sheet.legacy) {
        Object.entries(setting).forEach(([key, value]) => {
            if (value.visible === false) {
                html[0].querySelector(`.${key}`)?.closest('label')?.remove()
            }
        })
    }
})
