import { CONSTANTS, SHEET_TYPE } from './constants.js'
import { checkEmpty, getSetting, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { CurrencyForm } from './forms/config-form.js'

const property = 'currencies'

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()

    loadTemplates([
        CONSTANTS.CURRENCY.TEMPLATE.FORM,
        CONSTANTS.CURRENCY.TEMPLATE.LIST
    ])
}

/**
 * Register settings
 */
function registerSettings () {
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
            default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
        }
    )
}

/**
 * Register hooks
 */
function registerHooks () {
    Hooks.on('renderCurrencyManager', (app, html, data) => {
        const setting = getSetting(CONSTANTS.CURRENCY.SETTING.KEY)

        Object.entries(setting).forEach(([key, value]) => {
            if (value.visible === false) {
                html[0].querySelector(`input[name="amount.${key}"]`)?.closest('label')?.remove()
            }
        })
    })

    Hooks.on('renderActorSheet', (app, html, data) => {
        const sheetType = SHEET_TYPE[app.constructor.name]

        const setting = getSetting(CONSTANTS.CURRENCY.SETTING.KEY)

        if (sheetType.character && !sheetType.legacy) {
            Object.entries(setting).forEach(([key, value]) => {
                if (value.visible === false) {
                    html[0].querySelector(`.${key}`)?.closest('label')?.remove()
                }
            })
        }
    })
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

    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E[property])) {
            resetDnd5eConfig(property)
        }
        return
    }

    const config = buildConfig(data)
    config && (CONFIG.DND5E[property] = config)
}
