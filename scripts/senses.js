import { CONSTANTS, SHEET_TYPE } from './constants.js'
import { checkEmpty, getFlag, getSetting, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { SensesForm } from './forms/config-form.js'

const property = 'senses'

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.SENSES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.SENSES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.SENSES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.SENSES.MENU.NAME),
            icon: CONSTANTS.SENSES.MENU.ICON,
            type: SensesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.SENSES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E[property]
        }
    )
}

/**
 * Register hooks
 */
function registerHooks () {
    Hooks.on('renderActorSensesConfig', (app, html, data) => {
        const actor = data.document
        const systemSenses = ['blindsight', 'darkvision', 'tremorsense', 'truesight']
        const inputs = html[0].querySelectorAll('input[type="number"]')
        inputs.forEach(input => {
            const key = input.name.split('.').pop()
            if (!systemSenses.includes(key)) {
                input.name = `flags.custom-dnd5e.${key}`
                const flag = getFlag(actor, key)
                if (flag) {
                    input.value = flag
                }
            }
        })
    })

    /**
     * This uses a hook added by the Application._render patch.
     * To replace for ApplicationV2
     */
    Hooks.on('preRenderActorSheet', (app, data) => {
        const actorSheetType = SHEET_TYPE[app.constructor.name]

        const senses = getSetting(CONSTANTS.SENSES.SETTING.KEY)
        Object.entries(senses).forEach(([key, value]) => {
            const flag = getFlag(app.document, key)
            if (flag) {
                if (!Object.hasOwn(data, 'senses')) {
                    data.senses = {}
                }
                data.senses[key] = (actorSheetType.legacy)
                    ? `${value.label} ${flag}`
                    : { label: value.label, value: flag }
            }
        })
    })
}

/**
 * Set CONFIG.DND5E.senses
 * @param {object} data
 */
export function setConfig (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                game.i18n.localize(value.label || value)
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
