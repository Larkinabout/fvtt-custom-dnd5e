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
        CONSTANTS.SHEET.SETTING.AUTO_FADE_SHEET.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    registerSetting(
        CONSTANTS.SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
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
        if (html[0].classList.contains('app')) {
            if (getSetting(CONSTANTS.SHEET.SETTING.AUTO_FADE_SHEET.KEY)) { enableAutoFade(html) }
            if (getSetting(CONSTANTS.SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY)) { enableAutoMinimise(app, html) }
        }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_DEATH_SAVES.KEY)) { removeDeathSaves(html) }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_ENCUMBRANCE.KEY)) { removeEncumbrance(html) }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_EXHAUSTION.KEY)) { removeExhaustion(html) }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_INSPIRATION.KEY)) { removeInspiration(html) }
        if (!getSetting(CONSTANTS.SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY)) { removeManageCurrency(html) }
    }
})

/**
 * Enable auto-fade
 * @param {object} html The html
 */
function enableAutoFade (html) {
    html[0].addEventListener('mouseleave', (event) => { reduceOpacity(event, html) })
    html[0].addEventListener('mouseenter', (event) => { increaseOpacity(event, html) })
}

/**
 * Reduce opacity
 * @param {object} event The event
 * @param {object} html  The html
 */
function reduceOpacity (event, html) {
    if (event.ctrlKey) return
    html[0].style.transition = 'opacity 0.2s ease 0s'
    html[0].style.opacity = '0.2'
}

/**
 * Increase opacity
 * @param {object} event The event
 * @param {object} html  The html
 */
function increaseOpacity (event, html) {
    const id = html[0].id
    if (!id || event.ctrlKey) return
    if (event?.target?.closest(`#${id}`)) {
        html[0].style.opacity = ''
    }
}

/**
 * Enable auto-minimise
 * @param {object} html The html
 */
function enableAutoMinimise (app, html) {
    html[0].addEventListener('mouseleave', (event) => { minimise(event, app) })
    html[0].addEventListener('mouseenter', (event) => { maximise(event, app) })
}

/**
 * Minimise sheet
 * @param {object} event The event
 * @param {object} html  The html
 */
function minimise (event, app) {
    if (event.ctrlKey) return
    app.minimize(event)
}

/**
 * Maximise sheet
 * @param {object} event The event
 * @param {object} html  The html
 */
function maximise (event, app) {
    if (event.ctrlKey) return
    app.maximize(event)
    app.bringToTop()
}

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
