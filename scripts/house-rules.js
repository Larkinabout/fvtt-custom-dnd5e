import { CONSTANTS, SHEET_TYPE } from './constants.js'
import {
    Logger,
    getSetting,
    getFlag,
    setFlag,
    registerMenu,
    registerSetting,
    makeBloodied,
    unmakeBloodied,
    makeDead,
    unmakeDead,
    makeUnconscious,
    unmakeUnconscious,
    rotateToken,
    unrotateToken,
    tintToken,
    untintToken
} from './utils.js'
import { HouseRulesForm } from './forms/house-rules-form.js'

const constants = CONSTANTS.HOUSE_RULES

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()

    const templates = [constants.TEMPLATE.FORM]
    Logger.debug('Loading templates', templates)
    loadTemplates(templates)
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        constants.MENU.KEY,
        {
            hint: game.i18n.localize(constants.MENU.HINT),
            label: game.i18n.localize(constants.MENU.LABEL),
            name: game.i18n.localize(constants.MENU.NAME),
            icon: constants.MENU.ICON,
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
        CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
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
        CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY,
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
        CONSTANTS.UNCONSCIOUS.SETTING.APPLY_UNCONSCIOUS.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    registerSetting(
        CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    registerSetting(
        CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
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
        CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_TARGET_VALUE.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 10
        }
    )

    registerSetting(
        CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    registerSetting(
        CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    registerSetting(
        CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
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

    registerSetting(
        CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY,
        {
            scope: 'world',
            config: false,
            type: Number
        }
    )

    registerSetting(
        CONSTANTS.RESTING.SETTING.USE_CAMP_SUPPLIES.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )
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

    Hooks.on('createActiveEffect', (activeEffect, options, userId) => { updateTokenEffects(true, activeEffect, userId) })
    Hooks.on('deleteActiveEffect', (activeEffect, options, userId) => { updateTokenEffects(false, activeEffect, userId) })
    Hooks.on('createToken', (token, data, options, userId) => { rollNpcHp(token) })
    Hooks.on('dnd5e.preApplyDamage', recalculateDamage)
    Hooks.on('dnd5e.preRestCompleted', (actor, data) => updateDeathSaves('rest', actor, data))
    Hooks.on('dnd5e.preRollDeathSave', setDeathSavesRollMode)
    Hooks.on('dnd5e.rollAbilitySave', (actor, roll, ability) => { awardInspiration('rollAbilitySave', actor, roll) })
    Hooks.on('dnd5e.rollAbilityTest', (actor, roll, ability) => { awardInspiration('rollAbilityTest', actor, roll) })
    Hooks.on('dnd5e.rollAttack', (item, roll, ability) => { awardInspiration('rollAttack', item, roll) })
    Hooks.on('dnd5e.rollSkill', (actor, roll, ability) => { awardInspiration('rollSkill', actor, roll) })
    Hooks.on('preUpdateActor', capturePreviousHp)
    Hooks.on('updateActor', (actor, data, options, userId) => {
        if (!game.user.isGM && !game.user.id !== userId) return

        const instantDeath = updateInstantDeath(actor, data)
        updateHp(actor, data)
        if (!instantDeath) {
            const dead = updateDead(actor, data)
            updateBloodied(actor, data, dead)
            if (!dead) {
                updateMassiveDamage(actor, data)
                recalculateHealing(actor, data)
                updateUnconscious(actor, data)
                updateDeathSaves('regainHp', actor, data)
            }
        }
    })
    Hooks.on('renderActorSheet', makeDeathSavesBlind)
    Hooks.on('renderActorSheet', updateHpMeter)
}

/**
 * Register Bloodied
 * If 'Apply Bloodied', add the Bloodied status and condition
 */
export function registerBloodied () {
    if (!getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)) return

    Logger.debug('Registering Bloodied...')

    if (foundry.utils.isNewerVersion(game.system.version, '3.3.1')) {
        const coreBloodied = game.settings.get('dnd5e', 'bloodied')
        if (coreBloodied !== 'none') {
            game.settings.set('dnd5e', 'bloodied', 'none')
        }
    }

    const bloodied = buildBloodied()

    // Add bloodied to CONFIG.statusEffects
    CONFIG.statusEffects.push(bloodied.statusEffect)

    const conditionTypes = {}

    Object.entries(CONFIG.DND5E.conditionTypes).forEach(([key, value]) => {
        const conditionLabel = game.i18n.localize(value.label)
        if (conditionLabel > bloodied.conditionType.label && !conditionTypes.bloodied && !CONFIG.DND5E.conditionTypes.bloodied) {
            conditionTypes.bloodied = bloodied.conditionType
        }
        conditionTypes[key] = (key === 'bloodied') ? bloodied.conditionType : value
    })

    CONFIG.DND5E.conditionTypes = conditionTypes

    Logger.debug('Bloodied registered')
}

export function buildBloodied () {
    const label = game.i18n.localize('CUSTOM_DND5E.bloodied')
    const img = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY) ?? CONSTANTS.BLOODIED.ICON

    const data = {
        conditionType: {
            label,
            icon: img,
            reference: CONSTANTS.BLOODIED.CONDITION_UUID
        },
        statusEffect: {
            _id: 'dnd5ebloodied000',
            id: 'bloodied',
            name: label,
            img,
            reference: CONSTANTS.BLOODIED.CONDITION_UUID
        }
    }

    return data
}

/**
 * Register Negative HP
 * If 'Apply Negative HP' is enabled, set the min HP value in the schema to undefined
 */
export function registerNegativeHp () {
    if (!getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY) &&
        !getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY)) return

    Logger.debug('Registering Negative HP...')

    dnd5e.dataModels.actor.CharacterData.schema.fields.attributes.fields.hp.fields.value.min = undefined

    Logger.debug('Negative HP registered')
}

/**
 * Award Inspiration
 * Triggered by the 'dnd5e.rollAbilitySave', 'dnd5e.rollAbilityTest', 'dnd5e.rollAttack' and 'dnd5e.rollSkill' hooks
 * @param {string} rollType The roll type: rollAbilitySave, rollAbilityTest, rollAttack, rollSkill
 * @param {object} entity   The entity: actor or item
 * @param {object} roll     The roll
 */
export function awardInspiration (rollType, entity, roll) {
    Logger.debug('Triggering Award Inspiration...')

    const actor = (rollType === 'rollAttack') ? entity.parent : entity

    if (actor.type === 'npc' || !getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY)?.[rollType]) return

    const awardInspirationD20Value = getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY)
    const d20Value = roll.terms[0].total

    if (awardInspirationD20Value === d20Value) {
        Logger.debug('Awarding Inspiration...', { awardInspirationD20Value, d20Value })

        let message = 'CUSTOM_DND5E.message.awardInspiration'

        if (actor.system.attributes.inspiration) {
            message = 'CUSTOM_DND5E.message.awardInspirationAlready'
        } else {
            actor.update({ 'system.attributes.inspiration': true })
        }

        ChatMessage.create({
            content: game.i18n.format(message, { name: actor.name, value: awardInspirationD20Value })
        })

        Logger.debug('Inspiration awarded')
    }
}

/**
 * Make Death Saves Blind
 * Triggered by the 'renderActorSheet' hook
 * If the 'Death Saves Roll Mode' is set to 'blindroll', remove the success and failure pips from the death saves tray
 * @param {object} app  The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
function makeDeathSavesBlind (app, html, data) {
    if (getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY) !== 'blindroll' || game.user.isGM) return

    Logger.debug('Making death saves blind...')

    const sheetType = SHEET_TYPE[app.constructor.name]

    if (!sheetType) return

    if (sheetType.character) {
        if (sheetType.legacy) {
            html[0].querySelector('.death-saves .counter-value')?.remove()
        } else {
            const pips = html[0].querySelectorAll('.death-saves .pips')
            pips && (pips.forEach(p => p.remove()))
        }
    }

    Logger.debug('Made death saves blind')
}

/**
 * Set Death Saves Roll Mode
 * Triggered by 'dnd5e.preRollDeathSave' hook
 * @param {object} actor    The actor
 * @param {object} rollData The roll data
 */
function setDeathSavesRollMode (actor, rollData) {
    Logger.debug('Setting death saves roll mode...')

    const rollMode = getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY) || 'publicroll'
    const targetValue = getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_TARGET_VALUE.KEY)

    rollData.rollMode = rollMode
    if (targetValue) rollData.targetValue = targetValue

    Logger.debug('Death saves roll mode set')
}

/**
 * Recalculate Damage
 * Triggered by the 'dnd5e.preApplyDamage' hook
 * If 'Apply Negative HP' or 'Apply Instant Death' is enabled, recalculate damage to apply a negative value to HP
 * @param {object} actor   The actor
 * @param {number} amount  The damage amount
 * @param {object} updates The properties to update
 * @param {object} options The damage options
 */
function recalculateDamage (actor, amount, updates, options) {
    if (!getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY) &&
        !getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY)) return

    Logger.debug('Recalculating damage...')

    const hpMax = actor?.system?.attributes?.hp?.max ?? 0
    const hpTemp = actor?.system?.attributes?.hp?.temp ?? 0
    const hpValue = actor?.system?.attributes?.hp?.value ?? 0
    const startHp = (getSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY)) ? 0 : hpValue
    const newHpValue = amount > 0
        ? hpValue - Math.max((amount - hpTemp), 0)
        : Math.min(startHp - amount, hpMax)

    updates['system.attributes.hp.value'] = newHpValue

    Logger.debug('Damage recalculated')
}

/**
 * Recalculate Healing
 * Triggered by the 'updateActor' hook
 * If 'Apply Negative HP' and 'Heal from 0 HP' are enabled, recalculate healing to increase HP from zero instead of the negative value
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function recalculateHealing (actor, data) {
    if (!getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY) ||
        !getSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY)) return

    Logger.debug('Recalculating healing...')

    const currentHp = data?.system?.attributes?.hp?.value

    if (typeof currentHp === 'undefined') return

    const previousHp = getFlag(actor, 'previousHp')

    if (previousHp < 0 && currentHp > previousHp) {
        const diff = currentHp - previousHp
        data.system.attributes.hp.value = diff
    }

    Logger.debug('Healing recalculated')
}

/**
 * Roll NPC HP
 * Triggered by the 'preCreateToken' hook
 * @param {object} token The token
 */
async function rollNpcHp (token) {
    const actor = token?.actor

    if (actor?.type !== 'npc') return
    if (!getSetting(CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY)) return

    Logger.debug('Rolling NPC HP...', token)

    const formula = actor.system.attributes.hp.formula

    if (!formula) return

    const r = Roll.create(formula)
    await r.evaluate()

    if (!r.total) return

    actor.update({ 'system.attributes.hp': { value: r.total, max: r.total } }, { isRest: true })

    Logger.debug('NPC HP rolled', { token, hp: r.total })
}

/**
 * Update Bloodied
 * Triggered by the 'updateActor' hook
 * If 'Apply Bloodied' is enabled, apply or remove the Bloodied condition and other token effects based on the HP change
 * @param {object} actor The actor
 * @param {object} data  The data
 * @param {boolean} dead Whether or not the actor is dead
 */
function updateBloodied (actor, data, dead) {
    if (!getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)) return false

    Logger.debug('Updating Bloodied...')

    const currentHp = data?.system?.attributes?.hp?.value
    const maxHp = data?.system?.attributes?.hp?.max ?? actor?.system?.attributes?.hp?.max

    if (typeof currentHp === 'undefined') return null

    const halfHp = Math.ceil((maxHp ?? actor.system.attributes.hp.max) * 0.5)
    const deathFailures = data?.system?.attributes?.death?.failure ?? actor?.system?.attributes?.death?.failure ?? 0

    if (currentHp <= halfHp &&
        !actor.effects.has('dnd5ebloodied000') &&
        deathFailures !== 3 &&
        !(dead && getSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY))
    ) {
        makeBloodied(actor)
        Logger.debug('Bloodied updated', { bloodied: true })
        return true
    } else if (
        (currentHp > halfHp && actor.effects.has('dnd5ebloodied000')) ||
        (dead && getSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY))
    ) {
        unmakeBloodied(actor)
        Logger.debug('Bloodied updated', { bloodied: false })
        return false
    }

    Logger.debug('Bloodied not updated')
    return false
}

/**
 * Update Dead
 * Triggered by the 'updateActor' hook
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function updateDead (actor, data) {
    if (actor.type !== 'npc') return false
    if (!getSetting(CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY)) return false

    Logger.debug('Updating Dead...')

    const currentHp = data?.system?.attributes?.hp?.value

    if (typeof currentHp === 'undefined') return null

    if (currentHp <= 0) {
        makeDead(actor, data)
        Logger.debug('Dead updated', { dead: true })
        return true
    } else {
        unmakeDead(actor, data)
        Logger.debug('Dead updated', { dead: false })
        return false
    }
}

/**
 * Update Unconscious
 * Triggered by the 'updateActor' hook
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function updateUnconscious (actor, data) {
    if (actor.type !== 'character') return false
    if (!getSetting(CONSTANTS.UNCONSCIOUS.SETTING.APPLY_UNCONSCIOUS.KEY)) return false

    Logger.debug('Updating Unconscious...')

    const currentHp = data?.system?.attributes?.hp?.value

    if (typeof currentHp === 'undefined') return null

    if (currentHp <= 0) {
        makeUnconscious(actor, data)
        Logger.debug('Unconscious updated', { unconscious: true })
        return true
    } else {
        unmakeUnconscious(actor, data)
        Logger.debug('Unconscious updated', { unconscious: false })
        return false
    }
}

/**
 * Update Death Saves
 * Triggered by the 'updateActor' hook
 * @param {string} source regainHp or rest
 * @param {object} actor  The actor
 * @param {object} data   The data
 */
function updateDeathSaves (source, actor, data) {
    if (actor.type !== 'character') return

    const removeDeathSaves = getSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY)

    Logger.debug('Updating Death Saves...')

    const updateDeathSavesByType = (type) => {
        const currentValue = actor.system.attributes.death[type]

        if (typeof currentValue === 'undefined') return

        if (source === 'regainHp' && removeDeathSaves.regainHp[type] < 3 && foundry.utils.hasProperty(data, 'system.attributes.hp.value')) {
            const previousHp = getFlag(actor, 'previousHp')
            const newValue = (previousHp === 0) ? Math.max(currentValue - removeDeathSaves.regainHp[type], 0) : currentValue
            foundry.utils.setProperty(data, `system.attributes.death.${type}`, newValue)
        } else if (source === 'rest') {
            const restType = (data?.longRest) ? 'longRest' : 'shortRest'

            if (removeDeathSaves[restType][type] === 0) return

            const newValue = Math.max(currentValue - removeDeathSaves[restType][type], 0)
            foundry.utils.setProperty(data.updateData, `system.attributes.death.${type}`, newValue)
        }
    }

    updateDeathSavesByType('success')
    updateDeathSavesByType('failure')

    Logger.debug('Death Saves updated')
}

/**
 * Update HP
 * Triggered by the 'updateActor' hook
 * If 'Apply Negative HP' is disabled and HP is below 0, set HP to 0.
 * This will happen where 'Apply Instant Death' is enabled as negative HP is used to initially calculate whether Instant Death applies
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function updateHp (actor, data) {
    if (getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY)) return

    Logger.debug('Updating HP...')

    const currentHp = data?.system?.attributes?.hp?.value

    if (typeof currentHp === 'undefined') return

    if (currentHp < 0) {
        data.system.attributes.hp.value = 0
    }

    Logger.debug('HP updated')
}

/**
 * Update HP Meter
 * Triggered by the 'renderActorSheet' hook
 * If the current HP is negative, update the HP meter to show a red bar
 * @param {object} app  The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
function updateHpMeter (app, html, data) {
    const sheetType = SHEET_TYPE[app.constructor.name]

    if (!sheetType || sheetType.legacy || !sheetType.character) return

    Logger.debug('Updating HP meter...')

    const actor = app.actor
    const hpValue = actor.system.attributes.hp.value
    const hpMax = actor.system.attributes.hp.max

    if (hpValue >= 0) return

    const meter = html[0].querySelector('.meter.hit-points')
    meter.classList.add('negative')

    const progress = html[0].querySelector('.progress.hit-points')
    const pct = Math.abs(hpValue / hpMax) * 100
    progress.style = `--bar-percentage: ${pct}%;`

    Logger.debug('HP meter updated')
}

/**
 * Update Instant Death
 * Triggered by the 'updateActor' hook and called by the 'recalculateDamage' function
 * @param {object} actor The actor
 * @param {object} data  The data
 * @returns {boolean} Whether instant death is applied
 */
function updateInstantDeath (actor, data) {
    if (actor.type !== 'character' || !getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY)) return false

    Logger.debug('Updating Instant Death...')

    const currentHp = data?.system?.attributes?.hp?.value
    const maxHp = actor.system.attributes.hp.max

    if (currentHp < 0 && Math.abs(currentHp) >= maxHp) {
        const tokenEffects = makeDead(actor, data)
        ChatMessage.create({
            content: game.i18n.format('CUSTOM_DND5E.message.instantDeath', { name: actor.name })
        })
        return tokenEffects
    }

    Logger.debug('Instant Death updated...')

    return false
}

/**
 * Update Massive Damage
 * Triggered by the 'updateActor' hook and called by the 'recalculateDamage' function
 * @param {object} actor The actor
 * @param {object} data  The data
 * @returns {boolean} Whether instant death is applied
 */
function updateMassiveDamage (actor, data) {
    if (actor.type !== 'character' || !getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY)) return false

    Logger.debug('Updating Massive Damage...')

    const previousHp = getFlag(actor, 'previousHp')
    const currentHp = data?.system?.attributes?.hp?.value

    if (previousHp <= currentHp) return

    const diffHp = previousHp - currentHp
    const maxHp = actor.system.attributes.hp.max
    const halfMaxHp = Math.floor(maxHp / 2)

    if (diffHp >= halfMaxHp) {
        createMassiveDamageCard(actor, data)
        Logger.debug('Massive Death updated', { massiveDamage: true })
        return true
    }

    Logger.debug('Massive Death updated', { massiveDamage: false })
    return false
}

/**
 * Capture previous HP
 * @param {object} actor The actor
 * @param {object} data The data
 */
async function capturePreviousHp (actor, data, options, userId) {
    if (game.user.id !== userId || !actor.isOwner) return

    const currentHp = data?.system?.attributes?.hp?.value
    if (currentHp === undefined) return

    Logger.debug('Capturing previous HP...')

    await setFlag(actor, 'previousHp', actor.system.attributes.hp.value)

    Logger.debug('Previous HP captured', { previousHp: actor.system.attributes.hp.value })
}

/**
 * Update Token Effects
 * Triggered by the 'createActiveEffect' and 'deleteActiveEffect' hooks
 * @param {boolean} active      Whether the active effect is active
 * @param {object} activeEffect The active effect
 */
function updateTokenEffects (active, activeEffect, userId) {
    if (!game.user.isGM && (game.user.id !== userId || !game.user.hasPermission('TOKEN_CONFIGURE'))) return

    let prone = [...activeEffect.statuses].includes('prone')
    let bloodied = [...activeEffect.statuses].includes('bloodied')
    let dead = [...activeEffect.statuses].includes('dead')

    if (!prone && !bloodied && !dead) return

    let tint = null
    let rotation = null

    const actor = activeEffect.parent
    prone = (active && prone) || actor.effects.has('dnd5eprone000000')
    bloodied = (active && bloodied) || actor.effects.has('dnd5ebloodied000')
    dead = (active && dead) || actor.effects.has('dnd5edead0000000')

    Logger.debug('Updating token effects...', { bloodied, dead, prone })

    if (dead) {
        tint = getSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY)
        rotation = getSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY)
    } else {
        if (bloodied) { tint = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY) }
        if (prone) { rotation = getSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY) }
    }

    if (tint) {
        actor.getActiveTokens().forEach(token => tintToken(token, tint))
    } else {
        actor.getActiveTokens().forEach(token => untintToken(token, tint))
    }

    if (rotation) {
        actor.getActiveTokens().forEach(token => rotateToken(token, rotation))
    } else {
        actor.getActiveTokens().forEach(token => unrotateToken(token, rotation))
    }

    Logger.debug('Token effects updated')
}

async function createMassiveDamageCard (actor, data) {
    const dataset = { ability: 'con', dc: '15', type: 'save' }
    let label = game.i18n.format('EDITOR.DND5E.Inline.DC', { dc: 15, check: game.i18n.localize(CONFIG.DND5E.abilities.con.label) })
    label = game.i18n.format('EDITOR.DND5E.Inline.SaveLong', { save: label })
    const MessageClass = getDocumentClass('ChatMessage')
    const chatData = {
        user: game.user.id,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        content: await renderTemplate(CONSTANTS.MESSAGE.TEMPLATE.ROLL_REQUEST_CARD, {
            buttonLabel: `<i class="fas fa-shield-heart"></i>${label}`,
            hiddenLabel: `<i class="fas fa-shield-heart"></i>${label}`,
            description: game.i18n.format('CUSTOM_DND5E.message.massiveDamage', { name: actor.name }),
            dataset: { ...dataset, action: 'rollRequest' }
        }),
        speaker: MessageClass.getSpeaker({ user: game.user })
    }
    return MessageClass.create(chatData)
}
