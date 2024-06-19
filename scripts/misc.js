import { CONSTANTS } from './constants.js'
import { getSetting, registerSetting } from './utils.js'

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
        CONSTANTS.MAX_LEVEL.SETTING.KEY,
        {
            name: game.i18n.localize(CONSTANTS.MAX_LEVEL.SETTING.NAME),
            scope: 'world',
            config: true,
            type: Number,
            default: CONFIG.CUSTOM_DND5E.maxLevel,
            onChange: (value) => { setMaxLevel(value) }
        }
    )

    registerSetting(
        CONSTANTS.TOKEN.SETTING.TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS.KEY,
        {
            name: game.i18n.localize(CONSTANTS.TOKEN.SETTING.TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS.NAME),
            hint: game.i18n.localize(CONSTANTS.TOKEN.SETTING.TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS.HINT),
            scope: 'world',
            config: true,
            type: Boolean,
            default: false,
            requiresReload: true
        }
    )

    registerSetting(
        CONSTANTS.TOKEN.SETTING.APPLY_ELEVATION_TO_SELECTED_TOKENS.KEY,
        {
            name: game.i18n.localize(CONSTANTS.TOKEN.SETTING.APPLY_ELEVATION_TO_SELECTED_TOKENS.NAME),
            hint: game.i18n.localize(CONSTANTS.TOKEN.SETTING.APPLY_ELEVATION_TO_SELECTED_TOKENS.HINT),
            scope: 'world',
            config: true,
            type: Boolean,
            default: false,
            requiresReload: true
        }
    )
}

function registerHooks () {
    if (getSetting(CONSTANTS.TOKEN.SETTING.TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS.KEY)) {
        Hooks.on('createActiveEffect', async (activeEffect, options, id) => {
            toggleEffectOnSelected(true, activeEffect)
        })

        Hooks.on('deleteActiveEffect', async (activeEffect, options, id) => {
            toggleEffectOnSelected(false, activeEffect)
        })
    }

    if (getSetting(CONSTANTS.TOKEN.SETTING.APPLY_ELEVATION_TO_SELECTED_TOKENS.KEY)) {
        Hooks.on('updateToken', applyElevationToSelected)
    }
}

async function toggleEffectOnSelected (active, activeEffect) {
    if (canvas.tokens.controlled.length <= 1) return

    const effectData = foundry.utils.deepClone(CONFIG.statusEffects.find(effect => effect.id === [...activeEffect.statuses][0]))
    const overlay = activeEffect?.flags?.core?.overlay ?? false
    const tokenIds = activeEffect.parent.getActiveTokens().map(token => token.id)
    const controlledTokens = canvas.tokens.controlled.filter(token => !tokenIds.includes(token.id) & active !== token.actor.effects.has(activeEffect.id))

    if (!controlledTokens.length) return

    await controlledTokens[0].document.toggleActiveEffect(effectData, { active, overlay })
}

function applyElevationToSelected (token, data, options, id) {
    const elevation = foundry.utils.getProperty(data, 'elevation')

    if ((!elevation && elevation !== 0) || canvas.tokens.controlled.length <= 1) return

    const controlledTokens = canvas.tokens.controlled.filter(ct => ct.id !== token.id && ct.document.elevation !== elevation)

    if (!controlledTokens.length) return

    controlledTokens[0].document.update({ elevation })
}

/**
 * Set CONFIG.DND5E.maxLevel
 */
export function setMaxLevel (maxLevel = null) {
    CONFIG.DND5E.maxLevel = maxLevel || CONFIG.CUSTOM_DND5E.maxLevel
}
