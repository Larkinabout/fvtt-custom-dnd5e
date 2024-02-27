import { MODULE, CONSTANTS } from './constants.js'
import { getSetting, registerMenu, registerSetting } from './utils.js'
import { DebugForm } from './forms/debug-form.js'

/**
 * Register
 */
export function register () {
    registerSettings()

    loadTemplates([
        CONSTANTS.DEBUG.TEMPLATE.FORM
    ])
}

/**
 * Register settings
 */
function registerSettings () {
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
}

/**
 * Exports settings and config data to JSON file
 */
export async function exportData () {
    const data = {
        customDnd5eVersion: game.modules.get(MODULE.ID).version,
        dnd5eVersion: game.system.version,
        foundryVttVersion: game.version,
        setting: Object.fromEntries(
            [...game.settings.settings]
                .filter(setting => setting[0].includes(MODULE.ID))
                .map(setting => [setting[1].key, getSetting(setting[1].key)])
        ),
        configDnd5e: {
            abilities: CONFIG.DND5E.abilities,
            abilityActivationTypes: CONFIG.DND5E.abilityActivationTypes,
            actorSizes: CONFIG.DND5E.actorSizes,
            armorClasses: CONFIG.DND5E.armorClasses,
            currencies: CONFIG.DND5E.currencies,
            damageTypes: CONFIG.DND5E.damageTypes,
            encumbrance: CONFIG.DND5E.encumbrance,
            itemActionTypes: CONFIG.DND5E.itemActionTypes,
            itemProperties: CONFIG.DND5E.itemProperties,
            languages: CONFIG.DND5E.languages,
            maxLevel: CONFIG.DND5E.maxLevel,
            senses: CONFIG.DND5E.senses,
            skills: CONFIG.DND5E.skills,
            spellSchools: CONFIG.DND5E.spellSchools,
            validProperties: CONFIG.DND5E.validProperties
        }
    }

    saveDataToFile(JSON.stringify(data, null, 2), 'text/json', `${MODULE.ID}.json`)
}
