import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { SpellSchoolsForm } from './forms/config-form.js'

const property = 'spellSchools'

/**
 * Register
 */
export function register () {
    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.SPELL_SCHOOLS.TEMPLATE.FORM,
            CONSTANTS.SPELL_SCHOOLS.TEMPLATE.LIST
        ]
    )

    loadTemplates([
        CONSTANTS.SPELL_SCHOOLS.TEMPLATE.FORM,
        CONSTANTS.SPELL_SCHOOLS.TEMPLATE.LIST
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.SPELL_SCHOOLS.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.SPELL_SCHOOLS.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.SPELL_SCHOOLS.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.SPELL_SCHOOLS.MENU.NAME),
            icon: CONSTANTS.SPELL_SCHOOLS.MENU.ICON,
            type: SpellSchoolsForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.SPELL_SCHOOLS.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            requiresReload: true,
            type: Object,
            default: CONFIG.CUSTOM_DND5E[property]
        }
    )
}

/**
 * Set CONFIG.DND5E.spellSchools
 * @param {object} data
 */
export function setConfig (data = null) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                {
                    fullKey: value.fullKey,
                    icon: value.icon,
                    label: game.i18n.localize(value.label),
                    reference: value.reference
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
