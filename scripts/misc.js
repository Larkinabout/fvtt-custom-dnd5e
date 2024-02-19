import { CONSTANTS } from './constants.js'
import { getSetting, registerSetting } from './utils.js'

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
        CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL_1.SETTING.KEY,
        {
            name: game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL_1.SETTING.NAME),
            hint: game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL_1.SETTING.HINT),
            scope: 'world',
            config: true,
            type: Boolean,
            default: false
        }
    )

    registerSetting(
        CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY,
        {
            name: game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.NAME),
            hint: game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.HINT),
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        }
    )
}

/**
 * Set CONFIG.DND5E.maxLevel
 */
export function setMaxLevel (maxLevel = null) {
    CONFIG.DND5E.maxLevel = maxLevel || CONFIG.CUSTOM_DND5E.maxLevel
}

Hooks.on('dnd5e.preRollClassHitPoints', (actor, item, rollData, messageData) => {
    if (!getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL_1.SETTING.KEY)) return
    rollData.formula = `1${item.system.hitDice}rr1`
})

Hooks.on('renderHitPointsFlow', (app, html, data) => {
    if (getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL_1.SETTING.KEY)) {
        const h3 = html[0].querySelector('form h3')
        const p = document.createElement('p')
        p.classList.add('custom-dnd5e-advice', 'notes')
        p.textContent = game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL_1.DIALOG.NOTE)
        h3.appendChild(p)
    }

    if (!getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY)) {
        const averageLabel = html[0].querySelector('.averageLabel')
        averageLabel && (averageLabel.innerHTML = '')
    }
})
