import { CONSTANTS } from './constants.js'
import { getSetting } from './utils.js'
import { register as registerAbilities, setConfig as setAbilities } from './abilities.js'
import { register as registerActorSizes, setConfig as setActorSizes } from './actor-sizes.js'
import { register as registerArmorCalculations, setConfig as setArmorCalculations } from './armor-calculations.js'
import { register as registerArmorTypes, setConfig as setArmorTypes } from './armor-types.js'
import { registerSettings as registerCounters } from './counters.js'
import { register as registerCurrency, setConfig as setCurrency } from './currency.js'
import { register as registerDamageTypes, setConfig as setDamageTypes } from './damage-types.js'
import { register as registerDebug } from './debug.js'
import { register as registerEncumbrance, setConfig as setEncumbrance } from './encumbrance.js'
import { register as registerItemActionTypes, setConfig as setItemActionTypes } from './item-action-types.js'
import { register as registerItemActivationCostTypes, setConfig as setItemActivationCostTypes } from './item-activation-cost-types.js'
import { register as registerItemProperties, setConfig as setItemProperties } from './item-properties.js'
import { register as registerLanguages, setConfig as setLanguages } from './languages.js'
import { register as registerMigration, migrate } from './migration.js'
import { register as registerMisc, setMaxLevel, addBloodiedStatus } from './misc.js'
import { register as registerSenses, setConfig as setSenses } from './senses.js'
import { register as registerSheet } from './sheet.js'
import { register as registerSkills, setConfig as setSkills } from './skills.js'
import { register as registerSpellSchools, setConfig as setSpellSchools } from './spell-schools.js'
import { patchApplicationRender } from './patches/application-render.js'

/**
 * HOOKS
 */
Hooks.on('init', async () => {
    CONFIG.CUSTOM_DND5E = deepClone(CONFIG.DND5E)

    patchApplicationRender()
    registerMigration()
    registerAbilities()
    registerActorSizes()
    registerArmorCalculations()
    // registerArmorTypes()
    registerCounters()
    registerCurrency()
    registerDamageTypes()
    registerEncumbrance()
    registerItemActionTypes()
    registerItemActivationCostTypes()
    registerItemProperties()
    registerLanguages()
    registerSenses()
    registerSheet()
    registerSkills()
    registerSpellSchools()
    registerMisc()
    registerDebug()

    setAbilities(getSetting(CONSTANTS.ABILITIES.SETTING.KEY))
    setSkills(getSetting(CONSTANTS.SKILLS.SETTING.KEY))
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

    setActorSizes(getSetting(CONSTANTS.ACTOR_SIZES.SETTING.KEY) || {})
    setArmorCalculations(getSetting(CONSTANTS.ARMOR_CALCULATIONS.SETTING.KEY) || {})
    // setArmorTypes(getSetting(CONSTANTS.ARMOR_TYPES.SETTING.KEY) || {})
    setCurrency(getSetting(CONSTANTS.CURRENCY.SETTING.KEY) || {})
    setDamageTypes(getSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY) || {})
    setEncumbrance(getSetting(CONSTANTS.ENCUMBRANCE.SETTING.KEY) || {})
    setItemActionTypes(getSetting(CONSTANTS.ITEM_ACTION_TYPES.SETTING.KEY))
    setItemActivationCostTypes(getSetting(CONSTANTS.ITEM_ACTIVATION_COST_TYPES.SETTING.KEY))
    setItemProperties(getSetting(CONSTANTS.ITEM_PROPERTIES.SETTING.KEY))
    setLanguages(getSetting(CONSTANTS.LANGUAGES.SETTING.KEY) || {})
    setSenses(getSetting(CONSTANTS.SENSES.SETTING.KEY) || {})
    setSpellSchools(getSetting(CONSTANTS.SPELL_SCHOOLS.SETTING.KEY) || {})
    setMaxLevel(getSetting(CONSTANTS.MAX_LEVEL.SETTING.KEY))
    addBloodiedStatus()

    migrate()
})
