import { CONSTANTS, SHEET_TYPE } from './constants.js'
import { Logger, getSetting, registerMenu, registerSetting, makeBloodied, unmakeBloodied, rotateToken, unrotateToken, tintToken, untintToken, makeDead } from './utils.js'
import { HouseRulesForm } from './forms/house-rules-form.js'

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()
    registerBloodied()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.HOUSE_RULES.TEMPLATE.FORM
        ]
    )

    loadTemplates([
        CONSTANTS.HOUSE_RULES.TEMPLATE.FORM
    ])
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

    Hooks.on('applyTokenStatusEffect', updateDead)
    Hooks.on('createActiveEffect', (activeEffect, options, id) => { updateProne(true, activeEffect) })
    Hooks.on('deleteActiveEffect', (activeEffect, options, id) => { updateProne(false, activeEffect) })
    Hooks.on('dnd5e.preApplyDamage', recalculateDamage)
    Hooks.on('dnd5e.preRestCompleted', (actor, data) => updateDeathSaves('rest', actor, data))
    Hooks.on('dnd5e.preRollDeathSave', setDeathSavesRollMode)
    Hooks.on('dnd5e.rollAbilitySave', (actor, roll, ability) => { awardInspiration('rollAbilitySave', actor, roll) })
    Hooks.on('dnd5e.rollAbilityTest', (actor, roll, ability) => { awardInspiration('rollAbilityTest', actor, roll) })
    Hooks.on('dnd5e.rollAttack', (item, roll, ability) => { awardInspiration('rollAttack', item, roll) })
    Hooks.on('dnd5e.rollSkill', (actor, roll, ability) => { awardInspiration('rollSkill', actor, roll) })
    Hooks.on('preUpdateActor', (actor, data, options) => {
        const instantDeath = updateInstantDeath(actor, data)
        updateHp(actor, data)
        if (!instantDeath) {
            updateMassiveDamage(actor, data)
            recalculateHealing(actor, data)
            updateBloodied(actor, data)
            updateDeathSaves('regainHp', actor, data)
        }
    })
    Hooks.on('renderActorSheet', makeDeathSavesBlind)
    Hooks.on('renderActorSheet', updateHpMeter)
}

/**
 * Register Bloodied
 * If 'Apply Bloodied', addd the Bloodied status and condition
 */
export function registerBloodied () {
    if (!getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)) return

    const label = game.i18n.localize('CUSTOM_DND5E.bloodied')
    const icon = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY) ?? CONSTANTS.BLOODIED.ICON

    // Add bloodied to CONFIG.statusEffects
    CONFIG.statusEffects.push({
        id: 'bloodied',
        name: label,
        icon
    })

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
 * Register Negative HP
 * If 'Apply Negative HP' is enabled, set the min HP value in the schema to undefined
 */
export function registerNegativeHp () {
    if (!getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY) &&
        !getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY)) return

    dnd5e.dataModels.actor.CharacterData.schema.fields.attributes.fields.hp.fields.value.min = undefined
}

/**
 * Award Inspiration
 * Triggered by the 'dnd5e.rollAbilitySave', 'dnd5e.rollAbilityTest', 'dnd5e.rollAttack' and 'dnd5e.rollSkill' hooks
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
 * Make Death Saves Blind
 * Triggered by the 'renderActorSheet' hook
 * If the 'Death Saves Roll Mode' is set to 'blind', remove the success and failure pips from the death saves tray
 * @param {object} app  The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
function makeDeathSavesBlind (app, html, data) {
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
 * Set Death Saves Roll Mode
 * Triggered by 'dnd5e.preRollDeathSave' hook
 * @param {object} actor    The actor
 * @param {object} rollData The roll data
 */
function setDeathSavesRollMode (actor, rollData) {
    const rollMode = getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY) || 'publicroll'
    rollData.rollMode = rollMode
}

/**
 * Recalculate Damage
 * Trigger by the 'dnd5e.preApplyDamage' hook
 * If 'Apply Negative HP' is enabled, recalculate damage to apply a negative value to HP
 * @param {object} actor   The actor
 * @param {number} amount  The damage amount
 * @param {object} updates The properties to update
 * @param {object} options The damage options
 */
function recalculateDamage (actor, amount, updates, options) {
    const hpMax = actor?.system?.attributes?.hp?.max ?? 0
    const hpTemp = actor?.system?.attributes?.hp?.temp ?? 0
    const hpValue = actor?.system?.attributes?.hp?.value ?? 0
    const newHpTemp = amount > 0 ? Math.max(hpTemp - amount, 0) : 0
    const startHp = (getSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO)) ? 0 : hpValue
    const newHpValue = amount > 0
        ? hpValue - (amount - hpTemp)
        : Math.min(startHp - amount, hpMax)

    updates['system.attributes.hp.temp'] = newHpTemp
    updates['system.attributes.hp.value'] = newHpValue
}

/**
 * Recalculate Healing
 * Triggered by the 'preUpdateActor' hook
 * If 'Apply Negative HP' and 'Heal from 0 HP' are enabled, recalculate healing to increase HP from zero instead of the negative value
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function recalculateHealing (actor, data) {
    if (!getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY) ||
        !getSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY)) return

    const currentHp = data?.system?.attributes?.hp?.value

    if (typeof currentHp === 'undefined') return

    const previousHp = actor.system.attributes.hp.value

    if (previousHp < 0 && currentHp > previousHp) {
        const diff = currentHp - previousHp
        data.system.attributes.hp.value = diff
    }
}

/**
 * Update Bloodied
 * Triggered by the 'preUpdateActor' hook
 * If 'Apply Bloodied' is enabled, apply or remove the Bloodied condition and other token effects based on the HP change
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function updateBloodied (actor, data) {
    if (!getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)) return

    const currentHp = data?.system?.attributes?.hp?.value

    if (typeof currentHp === 'undefined') return

    const previousHp = actor.system.attributes.hp.value
    const halfHp = Math.ceil(actor.system.attributes.hp.max * 0.5)
    const deathFailures = data?.system?.attributes?.death?.failure ?? actor?.system?.attributes?.death?.failure ?? 0

    if (currentHp <= halfHp && previousHp > halfHp && deathFailures !== 3) {
        makeBloodied(actor)
    } else if (currentHp > halfHp && previousHp <= halfHp) {
        unmakeBloodied(actor)
    }
}

/**
 * Update Dead
 * Triggered by the 'applyTokenStatusEffect' hook
 * @param {object} token        The token
 * @param {string} statusEffect The status effect
 * @param {boolean} applied     Whether the status effect is being applied
 */
function updateDead (token, statusEffect, applied) {
    if (statusEffect !== 'dead') return

    const rotation = getSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY)
    const tint = getSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY)

    rotation && ((applied) ? rotateToken(token, rotation) : unrotateToken(token))
    tint && ((applied) ? tintToken(token, tint) : untintToken(token))
}

/**
 * Update Death Saves
 * Triggered by the 'preUpdateActor' hook
 * @param {string} source regainHp or rest
 * @param {object} actor  The actor
 * @param {object} data   The data
 */
function updateDeathSaves (source, actor, data) {
    if (actor.type !== 'character') return

    const removeDeathSaves = getSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY)

    const updateDeathSavesByType = (type) => {
        const currentValue = actor.system.attributes.death[type]

        if (typeof currentValue === 'undefined') return

        if (source === 'regainHp' && removeDeathSaves.regainHp[type] < 3 && hasProperty(data, 'system.attributes.hp.value')) {
            const previousHp = actor.system.attributes.hp.value
            const newValue = (previousHp === 0) ? Math.max(currentValue - removeDeathSaves.regainHp[type], 0) : currentValue
            setProperty(data, `system.attributes.death.${type}`, newValue)
        } else if (source === 'rest') {
            const restType = (data?.longRest) ? 'longRest' : 'shortRest'

            if (removeDeathSaves[restType][type] === 0) return

            const newValue = Math.max(currentValue - removeDeathSaves[restType][type], 0)
            setProperty(data.updateData, `system.attributes.death.${type}`, newValue)
        }
    }

    updateDeathSavesByType('success')
    updateDeathSavesByType('failure')
}

/**
 * Update HP
 * Triggered by the 'preUpdateActor' hook
 * If 'Apply Negative HP' is disabled and HP is below 0, set HP to 0.
 * This will happen where 'Apply Instant Death' is enabled as negative HP is used to initially calculate whether Instant Death applies
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function updateHp (actor, data) {
    if (getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY)) return

    const currentHp = data?.system?.attributes?.hp?.value

    if (typeof currentHp === 'undefined') return

    if (currentHp < 0) {
        data.system.attributes.hp.value = 0
    }
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
    if (SHEET_TYPE[app.constructor.name].legacy || !SHEET_TYPE[app.constructor.name].character) return

    const actor = app.actor
    const hpValue = actor.system.attributes.hp.value
    const hpMax = actor.system.attributes.hp.max

    if (hpValue >= 0) return

    const meter = html[0].querySelector('.meter.hit-points')
    meter.classList.add('negative')

    const progress = html[0].querySelector('.progress.hit-points')
    const pct = Math.abs(hpValue / hpMax) * 100
    progress.style = `--bar-percentage: ${pct}%;`
}

/**
 * Update Instant Death
 * Triggered by the 'preUpdateActor' hook and called by the 'recalculateDamage' function
 * @param {object} actor The actor
 * @param {object} data  The data
 * @returns {boolean} Whether instant death is applied
 */
function updateInstantDeath (actor, data) {
    if (actor.type !== 'character' || !getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY)) return false

    const currentHp = data?.system?.attributes?.hp?.value
    const maxHp = actor.system.attributes.hp.max

    if (currentHp < 0 && Math.abs(currentHp) >= maxHp) {
        makeDead(actor, data)
        ChatMessage.create({
            content: game.i18n.format('CUSTOM_DND5E.message.instantDeath', { name: actor.name })
        })
        return true
    }

    return false
}

/**
 * Update Massive Damage
 * Triggered by the 'preUpdateActor' hook and called by the 'recalculateDamage' function
 * @param {object} actor The actor
 * @param {object} data  The data
 * @returns {boolean} Whether instant death is applied
 */
function updateMassiveDamage (actor, data) {
    if (actor.type !== 'character' || !getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY)) return false

    const previousHp = actor.system.attributes.hp.value
    const currentHp = data?.system?.attributes?.hp?.value

    if (previousHp <= currentHp) return

    const diffHp = previousHp - currentHp
    const maxHp = actor.system.attributes.hp.max
    const halfMaxHp = Math.floor(maxHp / 2)

    if (diffHp >= halfMaxHp) {
        createMassiveDamageCard(actor, data)
        return true
    }

    return false
}

/**
 * Update Prone
 * Called by the 'updateToken' function
 * @param {object} token        The token
 * @param {string} statusEffect The status effect
 * @param {boolean} applied     Whether the status effect is being applied
 */
function updateProne (active, activeEffect) {
    if (![...activeEffect.statuses].includes('prone')) return

    const rotation = getSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY)

    if (!rotation) return

    const tokens = activeEffect.parent.getActiveTokens()

    tokens.forEach(token => {
        ((active) ? rotateToken(token, rotation) : unrotateToken(token))
    })
}

async function createMassiveDamageCard (actor, data) {
    const dataset = { ability: 'con', dc: '15', type: 'save' }
    let label = game.i18n.format('EDITOR.DND5E.Inline.DC', { dc: 15, check: game.i18n.localize(CONFIG.DND5E.abilities.con.label) })
    label = game.i18n.format('EDITOR.DND5E.Inline.SaveLong', { save: label })
    const MessageClass = getDocumentClass('ChatMessage')
    const chatData = {
        user: game.user.id,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
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
