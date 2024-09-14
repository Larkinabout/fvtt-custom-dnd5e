import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { ActorSizesForm } from './forms/config-form.js'

const property = 'actorSizes'

/**
 * Register
 */
export function register () {
    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.ACTOR_SIZES.TEMPLATE.FORM,
            CONSTANTS.ACTOR_SIZES.TEMPLATE.LIST
        ]
    )

    loadTemplates([
        CONSTANTS.ACTOR_SIZES.TEMPLATE.FORM,
        CONSTANTS.ACTOR_SIZES.TEMPLATE.LIST
    ])
}

/**
 * Register settings
 */
function registerSettings () {
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
            default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
        }
    )
}

/**
 * Set CONFIG.DND5E.actorSizes
 * @param {object} data
 */
export function setConfig (data = null) {
    const buildConfig = (keys, data) => Object.fromEntries(
        keys.filter((key) => data[key].visible || data[key].visible === undefined)
            .map((key) => [
                key,
                {
                    abbreviation: game.i18n.localize(data[key].abbreviation),
                    ...(data[key].capacityMultiplier !== undefined && { capacityMultiplier: data[key].capacityMultiplier }),
                    hitDie: data[key].hitDie,
                    ...(data[key].dynamicTokenScale !== undefined && { dynamicTokenScale: data[key].dynamicTokenScale }),
                    label: game.i18n.localize(data[key].label),
                    ...(data[key].token !== undefined && { token: data[key].token })
                }
            ])
    )

    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E[property])) {
            resetDnd5eConfig(property)
        }
        return
    }

    const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data))
    config && (CONFIG.DND5E[property] = config)
}
