import { CONSTANTS, SHEET_TYPE } from './constants.js'
import {
    Logger,
    getFlag,
    setFlag,
    unsetFlag,
    getSetting,
    registerSetting,
} from './utils.js'

const constants = CONSTANTS.EXHAUSTION

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
    registerSetting(
        CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_ZERO_HP.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )

    registerSetting(
        CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_COMBAT_END.KEY,
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
    Hooks.on('updateActor', handleUpdateActor)
    Hooks.on('deleteCombat', handleDeleteCombat)
}

/**
 * Handle actor update triggers
 * @param {object} actor The actor
 * @param {object} data  The data
 */
async function handleUpdateActor (actor, data, options, userId) {
    if (!actor.isOwner) return
    const hp = foundry.utils.getProperty(data, 'system.attributes.hp.value')
    if (getSetting(CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_ZERO_HP.KEY) && hp === 0) await applyExhaustionZeroHp(actor)
    if (getSetting(CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_COMBAT_END.KEY) && hp === 0) await setExhaustionZeroHpCombatEnd(actor)
}

/**
 * Handle end of combat triggers
 * @param {object} combat The combat
 */
function handleDeleteCombat (combat) {
    combat.combatants.forEach(combatant => {
        const actor = combatant.actor
        if (getFlag(actor, 'exhaustionZeroHpCombatEnd')) {
            applyExhaustionZeroHp(actor)
            unsetFlag(actor, 'exhaustionZeroHpCombatEnd')
        }
    })
}

async function applyExhaustionZeroHp (actor) {
    const currentExhaustion = actor?.system?.attributes?.exhaustion
    const newExhaustion = currentExhaustion + 1
    const maxExhaustion = CONFIG?.DND5E?.conditionTypes?.exhaustion?.levels
    if (newExhaustion > maxExhaustion ) return
    actor.update({ 'system.attributes.exhaustion': newExhaustion })
    createExhaustionMessage(actor, newExhaustion, maxExhaustion)
}

async function setExhaustionZeroHpCombatEnd (actor) {
    await setFlag(actor, 'exhaustionZeroHpCombatEnd', true)
}

function createExhaustionMessage (actor, newExhaustion, maxExhaustion) {
    const message = (newExhaustion === maxExhaustion) ? 'CUSTOM_DND5E.message.exhaustionDied' : 'CUSTOM_DND5E.message.exhaustion'
    ChatMessage.create({
        content: game.i18n.format(message, { name: actor.name })
    })
}
