import { CONSTANTS, MODULE } from './constants.js'
import { Logger, getSetting, setSetting, registerSetting } from './utils.js'

/**
 * Register
 */
export function register () {
    registerSettings()
}

/**
 * Register settings
 */
function registerSettings () {
    registerSetting(
        CONSTANTS.MIGRATION.VERSION.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: String
        }
    )
}

/**
 * Run migrations between module versions
 */
export function migrate () {
    if (!game.user.isGM) return

    const moduleVersion = game.modules.get(MODULE.ID).version
    const migrationVersion = getSetting(CONSTANTS.MIGRATION.VERSION.SETTING.KEY)

    if (moduleVersion === migrationVersion) return

    let isSuccess = true
    isSuccess = (!migrationVersion || foundry.utils.isNewerVersion('1.3.4', migrationVersion)) ? migrateRollMode() : true

    if (isSuccess) {
        setSetting(CONSTANTS.MIGRATION.VERSION.SETTING.KEY, moduleVersion)
    }
}

export async function migrateRollMode() {
    try {
        const rolls = [...game.settings.storage.get('world')]
            .find(setting => setting.key === 'custom-dnd5e.rolls')?.value
        if (rolls) {
            const newRolls = foundry.utils.deepClone(rolls)
            Object.entries(newRolls).forEach(([key, roll]) => {
                if (key !== 'weaponTypes' && roll.rollMode && roll.rollMode === 'publicroll') {
                    roll.rollMode = 'default'
                } else if (key === 'weaponTypes') {
                    const weaponTypes = roll
                    Object.values(weaponTypes).forEach(weaponType => {
                        if (weaponType.rollMode && weaponType.rollMode === 'publicroll') {
                            weaponType.rollMode = 'default'
                        }
                    })
                }
            })

            await setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, {})
            await setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, newRolls)
        }
        return true
    } catch (err) {
        Logger.debug(err.message, err)
        return false
    }
}
