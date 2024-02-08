import { CONSTANTS, SHEET } from './constants.js'
import { getFlag, getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { SensesForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
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
            default: CONFIG.CUSTOM_DND5E.senses
        }
    )

    const setting = getSetting(CONSTANTS.SENSES.SETTING.KEY)
    if (!Object.keys(setting).length) {
        setSetting(CONSTANTS.SENSES.SETTING.KEY, CONFIG.CUSTOM_DND5E.senses)
    }
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
                value.children
                    ? { label: value.label, children: buildConfig(value.children) }
                    : value.label
            ])
    )

    const senses = buildConfig(data)
    if (senses) {
        CONFIG.DND5E.senses = senses
    }
}

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
    const actorSheetType = SHEET[app.constructor.name]

    const senses = getSetting(CONSTANTS.SENSES.SETTING.KEY)
    Object.entries(senses).forEach(([key, value]) => {
        const flag = getFlag(app.document, key)
        if (flag) {
            data.senses[key] = (actorSheetType.legacy) ? `${value.label} ${flag}` : { label: value.label, value: flag }
        }
    })
})
