import { MODULE, CONSTANTS } from './constants.js'
import { getSetting, registerSetting } from './utils.js'

/**
 * Register
 */
export function register () {
    registerSettings()
    registerPatches()
}

/**
 * Register settings
 */
function registerSettings () {
    registerSetting(
        CONSTANTS.STATUS_HALO.SETTING.KEY,
        {
            name: game.i18n.localize('CUSTOM_DND5E.setting.statusHalo.name'),
            hint: game.i18n.localize('CUSTOM_DND5E.setting.statusHalo.hint'),
            scope: 'world',
            config: true,
            requiresReload: true,
            type: Boolean,
            default: false
        }
    )
}

/**
 * Register patches
 */
function registerPatches () {
    if (!getSetting(CONSTANTS.STATUS_HALO.SETTING.KEY)) return

    libWrapper.register(MODULE.ID, 'Token.prototype._refreshEffects', tokenRefreshEffectsPatch, 'WRAPPER')
}

function tokenRefreshEffectsPatch (wrapped, ...args) {
    wrapped(...args)
    updateEffects(this)
}

/**
 * Count effects for halo
 * @param {object} token The token
 * @returns {number}     The number of effects to include in the halo
 */
function getEffectsLen (token) {
    if (!token) return 0

    const tokenEffectsLen = token.document.effects?.length || 0
    const actorEffectsLen = token?.actor?.temporaryEffects.length || 0
    const overlay = token?.actor?.temporaryEffects.some(effect => !!effect.getFlag('core', 'overlay'))

    // Only exclude one overlay as the rest go into the halo
    return tokenEffectsLen + actorEffectsLen - ((overlay) ? 1 : 0)
}

function updateEffects (token) {
    const effectsLen = getEffectsLen(token)

    if (effectsLen > 0 && token.effects.children.length > 0) {
        const background = token.effects.children[0]

        if (!(background instanceof PIXI.Graphics)) return

        background.clear()

        const gridSize = token?.scene?.grid?.size ?? 100

        const icons = token.effects.children.slice(1, 1 + effectsLen)

        icons.forEach((icon, index, icons) => {
            if (!(icon instanceof PIXI.Sprite)) return

            icon.anchor.set(0.5)

            const iconScale = getIconScale(Math.min(token?.document?.height, token?.document?.width))
            const gridScale = gridSize / 100

            const scaledSize = 12 * iconScale * gridScale

            icon.width = scaledSize
            icon.height = scaledSize

            updateIconPosition(icon, index, icons, token)
            drawBackground(icon, background, gridScale)
        })
    }
}

function getIconScale (size) {
    if (size >= 2.5) return size / 2
    if (size >= 1.5) return size * 0.7
    return 1.4
}

function updateIconPosition (icon, index, icons, token) {
    const max = Math.max(Math.min(Math.ceil(Math.min(token?.document?.height, token?.document?.width) * 15), 40), icons.length)
    const ratio = index / max
    const gridSize = token?.scene?.grid?.size ?? 100
    const tokenTileFactor = token?.document?.width ?? 1
    const sizeOffset = getSizeOffset(Math.min(token?.document?.height, token?.document?.width))
    const offset = sizeOffset * tokenTileFactor * gridSize
    const initialRotation = (0.5 + (1 / max) * Math.PI) * Math.PI

    const { x, y } = polarToCartesian(offset, (ratio + 0) * 2 * Math.PI + initialRotation)

    const halfGridSize = gridSize * tokenTileFactor / 2

    icon.position.x = x / 2 + halfGridSize
    icon.position.y = -y / 2 + halfGridSize
}

// Nudge icons to be on the token ring or slightly outside
function getSizeOffset (size) {
    if (size >= 2) return 0.925
    if (size >= 1) return 1.2
    return 1.4
}

function polarToCartesian (radius, angle) {
    return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
    }
}

/**
 * Draw background
 * @param {string} icon
 * @param {*} background
 * @param {*} gridScale
 */
function drawBackground (icon, background, gridScale) {
    const radius = (icon.width / 2) + 1
    background.beginFill(0x333333)
    background.drawCircle(icon.position.x, icon.position.y, (radius + 1.5) * gridScale)
    background.endFill()
    background.lineStyle((2 * gridScale) / 2, 0x9f9275, 1, 0)
    background.drawCircle(icon.position.x, icon.position.y, (radius + 2) * gridScale)
    background.lineStyle(0)
}
