import { CONSTANTS } from './constants.js'
import { Logger, getSetting, registerSetting } from './utils.js'
import { register as registerHouseRules, registerNegativeHp } from './house-rules.js'
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
import { register as registerItemRarity, setConfig as setItemRarity } from './item-rarity.js'
import { register as registerLanguages, setConfig as setLanguages } from './languages.js'
import { register as registerMigration, migrate } from './migration.js'
import { register as registerMisc, setMaxLevel } from './misc.js'
import { register as registerSenses, setConfig as setSenses } from './senses.js'
import { register as registerSheet } from './sheet.js'
import { register as registerSkills, setConfig as setSkills } from './skills.js'
import { register as registerSpellSchools, setConfig as setSpellSchools } from './spell-schools.js'
import { register as registerRadialStatusEffects } from './radial-status-effects.js'
import { patchApplicationRender } from './patches/application-render.js'
import { patchPrepareEncumbrance } from './patches/prepare-encumbrance.js'
import { registerCharacterSheet } from './sheets/character-sheet.js'

/**
 * HOOKS
 */
Hooks.on('init', async () => {
    CONFIG.CUSTOM_DND5E = foundry.utils.deepClone(CONFIG.DND5E)

    registerSetting(
        CONSTANTS.DEBUG.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    patchApplicationRender()
    patchPrepareEncumbrance()
    registerMigration()
    registerHouseRules()
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
    registerItemRarity()
    registerLanguages()
    registerSenses()
    registerSheet()
    registerSkills()
    registerSpellSchools()
    registerMisc()
    registerRadialStatusEffects()
    registerDebug()

    registerCharacterSheet()

    setAbilities(getSetting(CONSTANTS.ABILITIES.SETTING.KEY))
    setActorSizes(getSetting(CONSTANTS.ACTOR_SIZES.SETTING.KEY))
    setArmorCalculations(getSetting(CONSTANTS.ARMOR_CALCULATIONS.SETTING.KEY))
    // setArmorTypes(getSetting(CONSTANTS.ARMOR_TYPES.SETTING.KEY))
    setCurrency(getSetting(CONSTANTS.CURRENCY.SETTING.KEY))
    setDamageTypes(getSetting(CONSTANTS.DAMAGE_TYPES.SETTING.KEY))
    setEncumbrance(getSetting(CONSTANTS.ENCUMBRANCE.SETTING.KEY))
    setItemActionTypes(getSetting(CONSTANTS.ITEM_ACTION_TYPES.SETTING.KEY))
    setItemActivationCostTypes(getSetting(CONSTANTS.ITEM_ACTIVATION_COST_TYPES.SETTING.KEY))
    setItemProperties(getSetting(CONSTANTS.ITEM_PROPERTIES.SETTING.KEY))
    setItemRarity(getSetting(CONSTANTS.ITEM_RARITY.SETTING.KEY))
    setLanguages(getSetting(CONSTANTS.LANGUAGES.SETTING.KEY))
    setSenses(getSetting(CONSTANTS.SENSES.SETTING.KEY))
    setSkills(getSetting(CONSTANTS.SKILLS.SETTING.KEY))
    setSpellSchools(getSetting(CONSTANTS.SPELL_SCHOOLS.SETTING.KEY))
    setMaxLevel(getSetting(CONSTANTS.MAX_LEVEL.SETTING.KEY))

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.CONFIG.TEMPLATE.FORM,
            CONSTANTS.CONFIG.TEMPLATE.LIST,
            CONSTANTS.SHEET.TEMPLATE.CHARACTER_SHEET_2,
            CONSTANTS.SHEET.TEMPLATE.CHARACTER_DETAILS,
            CONSTANTS.MESSAGE.TEMPLATE.ROLL_REQUEST_CARD
        ]
    )

    loadTemplates([
        CONSTANTS.CONFIG.TEMPLATE.FORM,
        CONSTANTS.CONFIG.TEMPLATE.LIST,
        CONSTANTS.SHEET.TEMPLATE.CHARACTER_SHEET_2,
        CONSTANTS.SHEET.TEMPLATE.CHARACTER_DETAILS,
        CONSTANTS.MESSAGE.TEMPLATE.ROLL_REQUEST_CARD
    ])
})

Hooks.on('ready', async () => {
    Handlebars.registerHelper({
        customDnd5eBoolFalse: function (value) { return value === false },
        customDnd5eEq: function (a, b) { return a === b },
        customDnd5eRandomId: function () { return randomID() },
        customDnd5eTrue: function (value) { return !!value },
        customDnd5eUndef: function (value) { return typeof value === 'undefined' || value === null },
        customDnd5eDotNotateChild: function (parent, child) {
            if (parent) {
                return `${parent}.children.${child}`
            }
            return `${child}`
        },
        customDnd5eShowActionValue: function (value) {
            const allowed = ['increase', 'decrease']
            return allowed.includes(value)
        },
        customDnd5eShowTriggerValue: function (value) {
            const allowed = ['counterValue']
            return allowed.includes(value)
        }
    })

    registerNegativeHp()

    migrate()
})
