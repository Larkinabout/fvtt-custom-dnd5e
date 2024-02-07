import { SHEET } from './constants.js'
import { getSetting, registerSetting } from './utils.js'

const CONSTANTS = {
    SETTING: {
        SHOW_DEATH_SAVES: {
            KEY: 'show-death-saves',
            HINT: 'CUSTOM_DND5E.setting.showDeathSaves.hint',
            NAME: 'CUSTOM_DND5E.setting.showDeathSaves.name'
        },
        SHOW_EXHAUSTION: {
            KEY: 'show-exhaustion',
            HINT: 'CUSTOM_DND5E.setting.showExhaustion.hint',
            NAME: 'CUSTOM_DND5E.setting.showExhaustion.name'
        },
        SHOW_INSPIRATION: {
            KEY: 'show-inspiration',
            HINT: 'CUSTOM_DND5E.setting.showInspiration.hint',
            NAME: 'CUSTOM_DND5E.setting.showInspiration.name'
        }
    }
}

export function registerSettings () {
    registerSetting(
        CONSTANTS.SETTING.SHOW_DEATH_SAVES.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.SETTING.SHOW_DEATH_SAVES.HINT),
            name: game.i18n.localize(CONSTANTS.SETTING.SHOW_DEATH_SAVES.NAME),
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        }
    )

    registerSetting(
        CONSTANTS.SETTING.SHOW_EXHAUSTION.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.SETTING.SHOW_EXHAUSTION.HINT),
            name: game.i18n.localize(CONSTANTS.SETTING.SHOW_EXHAUSTION.NAME),
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        }
    )

    registerSetting(
        CONSTANTS.SETTING.SHOW_INSPIRATION.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.SETTING.SHOW_INSPIRATION.HINT),
            name: game.i18n.localize(CONSTANTS.SETTING.SHOW_INSPIRATION.NAME),
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        }
    )
}

/**
 * HOOKS
 */
Hooks.on('renderActorSheet', (app, html, data) => {
    const sheet = SHEET[app.constructor.name]

    if (sheet.character && !sheet.legacy) {
        if (!getSetting(CONSTANTS.SETTING.SHOW_DEATH_SAVES.KEY)) { removeDeathSaves(html) }
        if (!getSetting(CONSTANTS.SETTING.SHOW_EXHAUSTION.KEY)) { removeExhaustion(html) }
        if (!getSetting(CONSTANTS.SETTING.SHOW_INSPIRATION.KEY)) { removeInspiration(html) }
    }
})

/**
 * Remove Death Saves from the character sheet
 * @param {object} html The HTML
 */
function removeDeathSaves (html) {
    const deathTray = html[0].querySelector('.death-tray')
    if (deathTray) {
        deathTray.style.display = 'none'
    }
}

/**
 * Remove Exhaustion from the character sheet
 * @param {object} html The HTML
 */
function removeExhaustion (html) {
    const exhaustion = html[0].querySelectorAll('[data-prop="system.attributes.exhaustion"]')
    exhaustion.forEach(e => e.remove())
    const ac = html[0].querySelector('.ac')
    if (ac) {
        ac.style.marginTop = '-41px'
        ac.style.width = '100%'
    }
    const lozenges = html[0].querySelector('.lozenges')
    if (lozenges) {
        lozenges.style.marginTop = '-15px'
    }
}

/**
 * Remove Inspiration from the character sheet
 * @param {object} html The HTML
 */
function removeInspiration (html) {
    const button = html[0].querySelector('button.inspiration')
    button?.remove()
}
