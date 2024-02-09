import { CONSTANTS, SHEET } from './constants.js'
import { getSetting, registerMenu, registerSetting } from './utils.js'
import { SheetForm } from './forms/sheet-form.js'

export function registerSettings () {
    registerMenu(
        CONSTANTS.SHEET.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.SHEET.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.SHEET.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.SHEET.MENU.NAME),
            icon: CONSTANTS.SHEET.MENU.ICON,
            type: SheetForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.SHEET.SETTING.BANNER_IMAGE.KEY,
        {
            scope: 'world',
            config: false,
            type: String
        }
    )

    registerSetting(
        CONSTANTS.SHEET.SETTING.SHOW_DEATH_SAVES.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: true
        }
    )

    registerSetting(
        CONSTANTS.SHEET.SETTING.SHOW_ENCUMBRANCE.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: true
        }
    )

    registerSetting(
        CONSTANTS.SHEET.SETTING.SHOW_EXHAUSTION.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: true
        }
    )

    registerSetting(
        CONSTANTS.SHEET.SETTING.SHOW_INSPIRATION.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: true
        }
    )

    registerSetting(
        CONSTANTS.SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: true
        }
    )

    loadTemplates([
        CONSTANTS.SHEET.TEMPLATE.FORM
    ])
}

/**
 * HOOKS
 */
Hooks.on('renderActorSheet', (app, html, data) => {
    const sheet = SHEET[app.constructor.name]

    if (sheet.character && !sheet.legacy) {
        setBannerImage(html)
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_DEATH_SAVES.KEY)) { removeDeathSaves(html) }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_ENCUMBRANCE.KEY)) { removeEncumbrance(html) }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_EXHAUSTION.KEY)) { removeExhaustion(html) }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_INSPIRATION.KEY)) { removeInspiration(html) }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY)) { removeManageCurrency(html) }
    }
})

/**
 * Set banner image the character sheet
 * @param {object} html The HTML
 */
function setBannerImage (html) {
    const bannerImage = getSetting(CONSTANTS.SHEET.SETTING.BANNER_IMAGE.KEY)

    if (!bannerImage) return

    const sheetHeader = html[0].querySelector('.sheet-header')
    if (sheetHeader) {
        sheetHeader.style.background = `transparent url("${bannerImage}") no-repeat center / cover`
    }
}

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
 * Remove Encumbrance from the character sheet
 * @param {object} html The HTML
 */
function removeEncumbrance (html) {
    const encumbranceCard = html[0].querySelector('.encumbrance.card')
    if (encumbranceCard) {
        encumbranceCard?.remove()
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

/**
 * Remove Manage Currency from the character sheet
 * @param {object} html The HTML
 */
function removeManageCurrency (html) {
    const button = html[0].querySelector('.inventory .currency > button')
    button?.remove()
}
