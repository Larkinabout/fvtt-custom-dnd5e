import { CONSTANTS, MODULE } from './constants.js'
import { Logger, getSetting, setSetting, registerSetting } from './utils.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerSetting(
        CONSTANTS.MIGRATION.VERSION.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: String
        }
    )
}

export function migrate () {
    if (!game.user.isGM) return

    const moduleVersion = game.modules.get(MODULE.ID).version
    const migrationVersion = getSetting(CONSTANTS.MIGRATION.VERSION.SETTING.KEY)

    if (moduleVersion === migrationVersion) return

    let isSuccess = true
    isSuccess = (!migrationVersion || migrationVersion < '0.7.0') ? migrateLevelUpHitPointsReroll1s() : true

    if (isSuccess) {
        setSetting(CONSTANTS.MIGRATION.VERSION.SETTING.KEY, moduleVersion)
    }
}

export function migrateLevelUpHitPointsReroll1s () {
    try {
        const levelUpHitPointsReroll1s = [...game.settings.storage.get('world')].find(setting => setting.key === 'custom-dnd5e.level-up-hit-points-reroll-1')?.value
        if (levelUpHitPointsReroll1s) {
            setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY, 2)
        }
        return true
    } catch (err) {
        Logger.debug(err.message, err)
        return false
    }
}
