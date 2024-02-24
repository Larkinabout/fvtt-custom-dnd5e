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
        CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY,
        {
            name: game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.NAME),
            hint: game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.HINT),
            scope: 'world',
            config: true,
            type: Number,
            default: 1
        }
    )

    registerSetting(
        CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY,
        {
            name: game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.NAME),
            hint: game.i18n.localize(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.HINT),
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
    const hitDieValue = item.system.advancement.find(adv => adv.type === 'HitPoints' && adv.hitDieValue)?.hitDieValue || 1
    const minimumValue = Math.min(getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY) || 1, hitDieValue)
    if (!minimumValue || minimumValue === 1) return
    const reroll = (getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY)) ? 'r' : 'rr'
    const value = minimumValue - 1
    rollData.formula = `1${item.system.hitDice}${reroll}${value}`
})

Hooks.on('renderHitPointsFlow', (app, html, data) => {
    const minimumValue = getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY)
    if (minimumValue > 1) {
        const rerollOnce = getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY)
        const note = (rerollOnce) ? 'CUSTOM_DND5E.dialog.levelUpHitPointsRerollOnce.note' : 'CUSTOM_DND5E.dialog.levelUpHitPointsRerollForever.note'
        const h3 = html[0].querySelector('form h3')
        const p = document.createElement('p')
        p.classList.add('custom-dnd5e-advice', 'notes')
        p.textContent = game.i18n.format(note, { minimumValue })
        h3.appendChild(p)
    }

    if (!getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY)) {
        const averageLabel = html[0].querySelector('.averageLabel')
        averageLabel && (averageLabel.innerHTML = '')
    }
})
