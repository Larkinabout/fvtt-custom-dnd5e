import { CONSTANTS, SHEET_TYPE } from './constants.js'
import { getFlag, getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { ActorSizesForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerMenu(
        CONSTANTS.ACTOR_SIZES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ACTOR_SIZES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ACTOR_SIZES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ACTOR_SIZES.MENU.NAME),
            icon: CONSTANTS.ACTOR_SIZES.MENU.ICON,
            type: ActorSizesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ACTOR_SIZES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E.actorSizes
        }
    )

    loadTemplates([
        CONSTANTS.ACTOR_SIZES.TEMPLATE.FORM,
        CONSTANTS.ACTOR_SIZES.TEMPLATE.LIST
    ])

    const setting = getSetting(CONSTANTS.ACTOR_SIZES.SETTING.KEY)
    if (!Object.keys(setting).length) {
        setSetting(CONSTANTS.ACTOR_SIZES.SETTING.KEY, CONFIG.CUSTOM_DND5E.actorSizes)
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
                {
                    abbreviation: game.i18n.localize(value.abbreviation),
                    ...(value.capacityMultiplier !== undefined && { capacityMultiplier: value.capacityMultiplier }),
                    ...(value.dynamicTokenScale !== undefined && { dynamicTokenScale: value.dynamicTokenScale }),
                    label: game.i18n.localize(value.label),
                    ...(value.token !== undefined && { token: value.token })
                }
            ])
    )

    const actorSizes = buildConfig(data)
    if (actorSizes) {
        CONFIG.DND5E.actorSizes = actorSizes
    }
}
