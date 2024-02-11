import { CONSTANTS } from './constants.js'
import { registerSetting } from './utils.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerSetting(
        CONSTANTS.MAX_LEVEL.SETTING.KEY,
        {
            name: game.i18n.localize(CONSTANTS.MAX_LEVEL.SETTING.NAME),
            scope: 'world',
            config: true,
            type: Number,
            default: CONFIG.CUSTOM_DND5E.maxLevel,
            onChange: (value) => { setMaxLevel(value) }
        }
    )

    registerSetting(
        CONSTANTS.DEBUG.SETTING.KEY,
        {
            name: game.i18n.localize(CONSTANTS.DEBUG.SETTING.NAME),
            scope: 'world',
            config: true,
            type: Boolean,
            default: false
        }
    )
}

/**
 * Set CONFIG.DND5E.maxLevel
 */
export function setMaxLevel (maxLevel = null) {
    CONFIG.DND5E.maxLevel = maxLevel || CONFIG.CUSTOM_DND5E.maxLevel
}
