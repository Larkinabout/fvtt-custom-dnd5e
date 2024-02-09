import { CONSTANTS, SHEET } from './constants.js'
import { getFlag, getSetting, setSetting, registerSetting } from './utils.js'

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
}

/**
 * Set CONFIG.DND5E.maxLevel
 */
export function setMaxLevel (maxLevel = null) {
    CONFIG.DND5E.maxLevel = maxLevel || CONFIG.CUSTOM_DND5E.maxLevel
}
