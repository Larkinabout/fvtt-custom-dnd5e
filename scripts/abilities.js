import { CONSTANTS } from './constants.js'
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { AbilitiesForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerMenu(
        CONSTANTS.ABILITIES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ABILITIES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ABILITIES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ABILITIES.MENU.NAME),
            icon: CONSTANTS.ABILITIES.MENU.ICON,
            type: AbilitiesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ABILITIES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            requiresReload: true,
            type: Object,
            default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E.abilities)
        }
    )

    loadTemplates([
        CONSTANTS.ABILITIES.TEMPLATE.FORM,
        CONSTANTS.ABILITIES.TEMPLATE.LIST
    ])
}

/**
 * Set CONFIG.DND5E.abilities
 * @param {object} data
 */
export function setConfig (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                {
                    abbreviation: value.abbreviation,
                    ...(value.defaults !== undefined && { defaults: { ...value.defaults } }),
                    fullKey: value.fullKey,
                    label: value.label,
                    reference: value.reference,
                    type: value.type
                }
            ])
    )

    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E.abilities)) {
            resetDnd5eConfig('abilities')
        }
        return
    }

    const abilities = buildConfig(data)
    if (abilities) {
        CONFIG.DND5E.abilities = abilities
    }
}
