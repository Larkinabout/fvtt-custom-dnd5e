import { CONSTANTS } from './constants.js'
import { getSetting } from './utils.js'
import { registerSettings as registerMiscSettings, setMaxLevel } from './misc.js'
import { registerSettings as registerAbilitiesSettings, setConfig as setAbilities } from './abilities.js'
import { registerSettings as registerActorSizesSettings, setConfig as setActorSizes } from './actor-sizes.js'
import { registerSettings as registerArmorTypesSettings, setConfig as setArmorTypes } from './armor-types.js'
import { registerSettings as registerCountersSettings } from './counters.js'
import { registerSettings as registerCurrencySettings, setConfig as setCurrency } from './currency.js'
import { registerSettings as registerDamageTypesSettings, setConfig as setDamageTypes } from './damage-types.js'
import { registerSettings as registerDebugSettings } from './debug.js'
import { register as registerEncumbrance, setConfig as setEncumbrance } from './encumbrance.js'
import { registerSettings as registerItemActionTypesSettings, setConfig as setItemActionTypes } from './item-action-types.js'
import { registerSettings as registerItemActivationCostTypesSettings, setConfig as setItemActivationCostTypes } from './item-activation-cost-types.js'
import { registerSettings as registerItemPropertiesSettings, setConfig as setItemProperties } from './item-properties.js'
import { registerSettings as registerLanguagesSettings, setConfig as setLanguages } from './languages.js'
import { registerSettings as registerMigrationSettings, migrate } from './migration.js'
import { registerSettings as registerSensesSettings, setConfig as setSenses } from './senses.js'
import { registerSettings as registerSheetSettings } from './sheet.js'
import { registerSettings as registerSkillsSettings, setConfig as setSkills } from './skills.js'
import { patchApplicationRender } from './patches/application-render.js'

/**
 * HOOKS
 */
Hooks.on('init', async () => {
    CONFIG.CUSTOM_DND5E = deepClone(CONFIG.DND5E)

    patchApplicationRender()
    registerMigrationSettings()
    registerAbilitiesSettings()
    registerActorSizesSettings()
    // registerArmorTypesSettings()
    registerCountersSettings()
    registerCurrencySettings()
    registerDamageTypesSettings()
    registerEncumbrance()
    registerItemActionTypesSettings()
    registerItemActivationCostTypesSettings()
    registerItemPropertiesSettings()
    registerLanguagesSettings()
    registerSensesSettings()
    registerSheetSettings()
    registerSkillsSettings()
    registerMiscSettings()
    registerDebugSettings()

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
    // setArmorTypes(getSetting(CONSTANTS.ARMOR_TYPES.SETTING.KEY) || {})
    setCurrency(getSetting(CONSTANTS.CURRENCY.SETTING.KEY) || {})
    setDamageTypes(getSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY) || {})
    setEncumbrance(getSetting(CONSTANTS.ENCUMBRANCE.SETTING.KEY) || {})
    setItemActionTypes(getSetting(CONSTANTS.ITEM_ACTION_TYPES.SETTING.KEY))
    setItemActivationCostTypes(getSetting(CONSTANTS.ITEM_ACTIVATION_COST_TYPES.SETTING.KEY))
    setItemProperties(getSetting(CONSTANTS.ITEM_PROPERTIES.SETTING.KEY))
    setLanguages(getSetting(CONSTANTS.LANGUAGES.SETTING.KEY) || {})
    setSenses(getSetting(CONSTANTS.SENSES.SETTING.KEY) || {})
    setMaxLevel(getSetting(CONSTANTS.MAX_LEVEL.SETTING.KEY))

    migrate()
})
