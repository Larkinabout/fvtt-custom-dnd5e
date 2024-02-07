import { CONSTANTS } from './constants.js'
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
            default: CONSTANTS.SENSES.SETTING.DEFAULT
        }
    )

    const languages = getSetting(CONSTANTS.SENSES.SETTING.KEY)
    if (!Object.keys(languages).length) {
        setSetting(CONSTANTS.SENSES.SETTING.KEY, CONSTANTS.SENSES.SETTING.DEFAULT)
    }
}

/**
 * Set CONFIG.DND5E.senses
 * @param {object} data
 */
export function setSenses (data) {
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

    CONFIG.DND5E.senses = buildConfig(data)
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

// Doesn't currently exist but hopefully soon
/* Hooks.on('getDataActorSheet5eCharacter2', (actor, data) => {
    const senses = getSetting(CONSTANTS.SENSES.SETTING.KEY)
    Object.entries(senses).forEach(([key, value]) => {
        const flag = getFlag(actor, key)
        if (flag) data.senses[key] = { label: value.label, value: flag }
    })
}) */
