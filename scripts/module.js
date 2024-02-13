import { CONSTANTS } from './constants.js'
import { getSetting } from './utils.js'
import { registerSettings as registerMiscSettings, setMaxLevel } from './misc.js'
import { registerSettings as registerAbilitiesSettings, setConfig as setAbilities } from './abilities.js'
import { registerSettings as registerArmorTypesSettings, setConfig as setArmorTypes } from './armor-types.js'
import { registerSettings as registerCurrencySettings, setConfig as setCurrency } from './currency.js'
import { registerSettings as registerDamageTypesSettings, setConfig as setDamageTypes } from './damage-types.js'
import { registerSettings as registerEncumbranceSettings, setConfig as setEncumbrance } from './encumbrance.js'
import { registerSettings as registerLanguagesSettings, setConfig as setLanguages } from './languages.js'
import { registerSettings as registerSensesSettings, setConfig as setSenses } from './senses.js'
import { registerSettings as registerSkillsSettings, setConfig as setSkills } from './skills.js'
import { registerSettings as registerCountersSettings } from './counters.js'
import { registerSettings as registerSheetSettings } from './sheet.js'
import { patchApplicationRender } from './patches/application-render.js'

/**
 * HOOKS
 */
Hooks.on('init', async () => {
    CONFIG.CUSTOM_DND5E = deepClone(CONFIG.DND5E)

    patchApplicationRender()
    registerAbilitiesSettings()
    // registerArmorTypesSettings()
    registerCountersSettings()
    registerCurrencySettings()
    registerDamageTypesSettings()
    registerEncumbranceSettings()
    registerLanguagesSettings()
    registerSensesSettings()
    registerSheetSettings()
    registerSkillsSettings()
    registerMiscSettings()

    setAbilities(getSetting(CONSTANTS.ABILITIES.SETTING.KEY) || CONFIG.CUSTOM_DND5E.abilities)
    setSkills(getSetting(CONSTANTS.SKILLS.SETTING.KEY) || {})
})

Hooks.on('ready', async () => {
    Handlebars.registerHelper({
        boolfalse: function (value) { return value === false },
        eq: function (a, b) { return a === b },
        randomId: function () { return randomID() },
        true: function (value) { return !!value },
        undef: function (value) { return typeof value === 'undefined' || value === null },
        dotNotateChild: function (parent, child) {
            if (parent) {
                return `${parent}.children.${child}`
            }
            return `${child}`
        },
        showActionValue: function (value) {
            const allowed = ['increase', 'decrease']
            return allowed.includes(value)
        },
        showTriggerValue: function (value) {
            const allowed = ['counterValue']
            return allowed.includes(value)
        }
    })

    loadTemplates([
        CONSTANTS.CONFIG.TEMPLATE.FORM,
        CONSTANTS.CONFIG.TEMPLATE.LIST
    ])

    // setArmorTypes(getSetting(CONSTANTS.ARMOR_TYPES.SETTING.KEY) || {})
    setCurrency(getSetting(CONSTANTS.CURRENCY.SETTING.KEY) || {})
    setDamageTypes(getSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY) || {})
    setEncumbrance(getSetting(CONSTANTS.ENCUMBRANCE.SETTING.KEY) || {})
    setLanguages(getSetting(CONSTANTS.LANGUAGES.SETTING.KEY) || {})
    setSenses(getSetting(CONSTANTS.SENSES.SETTING.KEY) || {})
    setMaxLevel(getSetting(CONSTANTS.MAX_LEVEL.SETTING.KEY))
})
