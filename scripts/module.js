import { CONSTANTS } from './constants.js'
import { getSetting } from './utils.js'
import { registerSettings as registerMiscSettings, setMaxLevel } from './misc.js'
import { registerSettings as registerArmorTypesSettings, setArmorTypes } from './armor-types.js'
import { registerSettings as registerDamageTypesSettings, setDamageTypes } from './damage-types.js'
import { registerSettings as registerLanguagesSettings, setLanguages } from './languages.js'
import { registerSettings as registerSensesSettings, setSenses } from './senses.js'
import { registerSettings as registerCountersSettings } from './counters.js'
import { registerSettings as registerSheetSettings } from './sheet.js'
import { patchApplicationRender } from './patches/application-render.js'

/**
 * HOOKS
 */
Hooks.on('init', async () => {
    patchApplicationRender()
})

Hooks.on('ready', async () => {
    CONFIG.CUSTOM_DND5E = deepClone(CONFIG.DND5E)

    registerCountersSettings()
    // registerArmorTypesSettings()
    registerDamageTypesSettings()
    registerLanguagesSettings()
    registerSensesSettings()
    registerMiscSettings()
    registerSheetSettings()

    Handlebars.registerHelper({
        boolfalse: function (value) { return value === false },
        true: function (value) { return !!value },
        undef: function (value) { return typeof value === 'undefined' || value === null }
    })

    loadTemplates([
        CONSTANTS.CONFIG.TEMPLATE.FORM,
        CONSTANTS.CONFIG.TEMPLATE.LIST
    ])

    // setArmorTypes(getSetting(CONSTANTS.ARMOR_TYPES.SETTING.KEY) || {})
    setDamageTypes(getSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY) || {})
    setLanguages(getSetting(CONSTANTS.LANGUAGES.SETTING.KEY) || {})
    setSenses(getSetting(CONSTANTS.SENSES.SETTING.KEY) || {})
    setMaxLevel(getSetting(CONSTANTS.MAX_LEVEL.SETTING.KEY))
})
