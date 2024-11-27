import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { SkillsForm } from './forms/config-form.js'

const property = 'skills'

/**
 * Register
 */
export function register () {
    registerSettings()

    const templates = [
        CONSTANTS.SKILLS.TEMPLATE.FORM,
        CONSTANTS.SKILLS.TEMPLATE.LIST
    ]
    Logger.debug('Loading templates', templates)
    loadTemplates(templates)
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.SKILLS.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.SKILLS.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.SKILLS.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.SKILLS.MENU.NAME),
            icon: CONSTANTS.SKILLS.MENU.ICON,
            type: SkillsForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.SKILLS.SETTING.KEY,
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
 * Set CONFIG.DND5E.skills
 * @param {object} data
 */
export function setConfig (data = null) {
    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E[property])) {
            resetDnd5eConfig(property)
        }
        return
    }

    const buildConfig = (keys, data) => Object.fromEntries(
        keys.filter((key) => data[key].visible || data[key].visible === undefined)
            .map((key) => [
                key,
                {
                    ability: data[key].ability,
                    fullKey: data[key].fullKey,
                    icon: data[key].icon,
                    label: game.i18n.localize(data[key].label),
                    reference: data[key].reference,
                    rollMode: data[key].rollMode ?? 'default'
                }
            ])
    )

    const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data))
    config && (CONFIG.DND5E[property] = config)
}
