import { CONSTANTS } from './constants.js'
import { getFlag, getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { SkillsForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
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
            default: CONFIG.CUSTOM_DND5E.skills
        }
    )

    loadTemplates([
        CONSTANTS.SKILLS.TEMPLATE.FORM,
        CONSTANTS.SKILLS.TEMPLATE.LIST
    ])

    const setting = getSetting(CONSTANTS.SKILLS.SETTING.KEY)
    if (!Object.keys(setting).length) {
        setSetting(CONSTANTS.SKILLS.SETTING.KEY, CONFIG.CUSTOM_DND5E.skills)
    }
}

/**
 * Set CONFIG.DND5E.skills
 * @param {object} data
 */
export function setConfig (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                {
                    ability: value.ability,
                    fullKey: value.fullKey,
                    icon: value.icon,
                    label: value.label,
                    reference: value.reference
                }
            ])
    )

    const skills = buildConfig(data)
    if (skills) {
        CONFIG.DND5E.skills = skills
    }
}
