import { MODULE, CONSTANTS } from './constants.js'
import { registerMenu, registerSetting } from './utils.js'
import { DebugForm } from './forms/debug-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerMenu(
        CONSTANTS.DEBUG.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.DEBUG.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.DEBUG.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.DEBUG.MENU.NAME),
            icon: CONSTANTS.DEBUG.MENU.ICON,
            type: DebugForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.DEBUG.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    loadTemplates([
        CONSTANTS.DEBUG.TEMPLATE.FORM
    ])
}

export async function exportData () {
    const data = {}
    data.setting = Object.fromEntries([...game.settings.settings].filter(setting => setting[0].includes('custom-dnd5e')))
    data.configDnd5e = {
        abilities: CONFIG.DND5E.abilities,
        actorSizes: CONFIG.DND5E.actorSizes,
        currencies: CONFIG.DND5E.currencies,
        damageTypes: CONFIG.DND5E.damageTypes,
        encumbrance: CONFIG.DND5E.encumbrance,
        itemProperties: CONFIG.DND5E.itemProperties,
        languages: CONFIG.DND5E.languages,
        maxLevel: CONFIG.DND5E.maxLevel,
        senses: CONFIG.DND5E.senses,
        skills: CONFIG.DND5E.skills,
        validProperties: CONFIG.DND5E.validProperties
    }
    if (data) {
        saveDataToFile(JSON.stringify(data, null, 2), 'text/json', `${MODULE.ID}.json`)
    }
}