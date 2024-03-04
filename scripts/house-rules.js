import { CONSTANTS, SHEET_TYPE } from './constants.js'
import { getSetting, registerMenu, registerSetting, makeBloodied, unmakeBloodied, rotateToken, unrotateToken, tintToken, untintToken } from './utils.js'
import { HouseRulesForm } from './forms/house-rules-form.js'

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.HOUSE_RULES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.HOUSE_RULES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.HOUSE_RULES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.HOUSE_RULES.MENU.NAME),
            icon: CONSTANTS.HOUSE_RULES.MENU.ICON,
            type: HouseRulesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )

    registerSetting(
        CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    registerSetting(
        CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: true
        }
    )

    registerSetting(
        CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false,
            requiresReload: true
        }
    )

    registerSetting(
        CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY,
        {
            scope: 'world',
            config: false,
            type: String,
            default: CONSTANTS.BLOODIED.ICON
        }
    )

    registerSetting(
        CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY,
        {
            scope: 'world',
            config: false,
            type: String,
            default: '#ff0000'
        }
    )

    registerSetting(
        CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY,
        {
            scope: 'world',
            config: false,
            type: Number
        }
    )

    registerSetting(
        CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY,
        {
            scope: 'world',
            config: false,
            type: String
        }
    )

    registerSetting(
        CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY,
        {
            scope: 'world',
            config: false,
            type: String,
            default: 'publicroll'
        }
    )

    registerSetting(
        CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: {
                regainHp: { success: 3, failure: 3 },
                shortRest: { success: 0, failure: 0 },
                longRest: { success: 0, failure: 0 }
            }
        }
    )

    registerSetting(
        CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY,
        {
            scope: 'world',
            config: false,
            type: Number
        }
    )

    registerSetting(
        CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: {}
        }
    )

    loadTemplates([
        CONSTANTS.HOUSE_RULES.TEMPLATE.FORM
    ])
}

/**
 * Register hooks
 */
function registerHooks () {
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

    Hooks.on('preUpdateActor', (actor, data, options) => {
        const currentHp = data?.system?.attributes?.hp?.value
        const previousHp = actor.system.attributes.hp.value
        const halfHp = Math.ceil(actor.system.attributes.hp.max * 0.5)

        if (typeof currentHp === 'undefined') return

        const applyBloodied = getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)

        if (applyBloodied) {
            if (currentHp <= halfHp && previousHp > halfHp) {
                makeBloodied(actor)
            } else if (currentHp > halfHp && previousHp <= halfHp) {
                unmakeBloodied(actor)
            }
        }

        if (actor.type !== 'character') return

        const removeDeathSaves = getSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY)

        const adjustDeathSaves = (type) => {
            if (removeDeathSaves.regainHp[type] >= 3) return
            const currentValue = data?.system?.attributes?.death?.[type]
            if (typeof currentValue !== 'undefined') {
                const previousValue = actor.system.attributes.death[type]
                const newValue = (previousHp === 0) ? Math.max(previousValue - removeDeathSaves.regainHp[type], 0) : previousValue
                data.system.attributes.death[type] = newValue
            }
        }

        adjustDeathSaves('success')
        adjustDeathSaves('failure')
    })

    Hooks.on('dnd5e.preRestCompleted', (actor, data) => {
        const removeDeathSaves = getSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY)

        const restType = (data.longRest) ? 'longRest' : 'shortRest'

        const adjustDeathSaves = (type) => {
            if (removeDeathSaves[restType][type] === 0) return
            const currentValue = actor?.system?.attributes?.death?.[type]
            if (typeof currentValue !== 'undefined') {
                const newValue = Math.max(currentValue - removeDeathSaves[restType][type], 0)
                setProperty(data.updateData, `system.attributes.death.${type}`, newValue)
            }
        }

        adjustDeathSaves('success')
        adjustDeathSaves('failure')
    })

    Hooks.on('renderActorSheet', (app, html, data) => {
        makeDeathSavesBlind(app, html)
    })

    Hooks.on('dnd5e.preRollDeathSave', (actor, rollData) => {
        setDeathSavesRollMode(rollData)
    })

    Hooks.on('applyTokenStatusEffect', (token, statusEffect, applied) => {
        if (statusEffect !== 'dead') return

        const rotation = getSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY)
        const tint = getSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY)

        rotation && ((applied) ? rotateToken(token, rotation) : unrotateToken(token))
        tint && ((applied) ? tintToken(token, tint) : untintToken(token))
    })

    Hooks.on('dnd5e.rollAbilitySave', (actor, roll, ability) => { awardInspiration('rollAbilitySave', actor, roll) })
    Hooks.on('dnd5e.rollAbilityTest', (actor, roll, ability) => { awardInspiration('rollAbilityTest', actor, roll) })
    Hooks.on('dnd5e.rollAttack', (item, roll, ability) => { awardInspiration('rollAttack', item, roll) })
    Hooks.on('dnd5e.rollSkill', (actor, roll, ability) => { awardInspiration('rollSkill', actor, roll) })
}

/**
 * Award Inspiration
 * @param {string} rollType The roll type: rollAbilitySave, rollAbilityTest, rollAttack, rollSkill
 * @param {object} entity   The entity: actor or item
 * @param {object} roll     The roll
 */
export function awardInspiration (rollType, entity, roll) {
    const actor = (rollType === 'rollAttack') ? entity.parent : entity

    if (actor.type === 'npc' || !getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY)?.[rollType]) return

    const awardInspirationD20Value = getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY)
    const d20Value = roll.terms.find(term => term.faces === 20).total

    if (awardInspirationD20Value === d20Value) {
        actor.update({ 'system.attributes.inspiration': true })
        ChatMessage.create({
            content: game.i18n.format('CUSTOM_DND5E.message.awardInspiration', { name: actor.name, value: awardInspirationD20Value })
        })
    }
}

/**
 * Add Bloodied status to CONFIG.statusEffects
 */
export function registerBloodiedStatus () {
    if (!getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)) return

    const label = game.i18n.localize('CUSTOM_DND5E.bloodied')
    const icon = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY) ?? CONSTANTS.BLOODIED.ICON

    // Add bloodied to CONFIG.statusEffects
    CONFIG.statusEffects.push({
        id: 'bloodied',
        name: label,
        icon
    })

    // Add bloodied to CONFIG.DND5E.conditionTypes
    const conditionTypes = {}

    Object.entries(CONFIG.DND5E.conditionTypes).forEach(([key, value]) => {
        const conditionLabel = game.i18n.localize(value.label)
        if (conditionLabel > label && !conditionTypes.bloodied) {
            conditionTypes.bloodied = { label, icon }
        }
        conditionTypes[key] = value
    })

    CONFIG.DND5E.conditionTypes = conditionTypes
}

/**
 * Make death saves blind
 * @param {object} app  The app
 * @param {object} html The HTML
 */
function makeDeathSavesBlind (app, html) {
    if (getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY !== 'blind') || game.user.isGM) return

    const sheetType = SHEET_TYPE[app.constructor.name]

    if (sheetType.character) {
        if (sheetType.legacy) {
            html[0].querySelector('.death-saves .counter-value')?.remove()
        } else {
            const pips = html[0].querySelectorAll('.death-saves .pips')
            pips && (pips.forEach(p => p.remove()))
        }
    }
}

/**
 * Set the roll mode for death saves
 * @param {object} rollData The roll data
 */
function setDeathSavesRollMode (rollData) {
    const rollMode = getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY) || 'publicroll'
    rollData.rollMode = rollMode
}
