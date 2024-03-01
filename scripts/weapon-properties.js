import { CONSTANTS, SHEET_TYPE } from './constants.js'
import { getFlag, getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { WeaponPropertiesForm } from './forms/config-form.js'

/**
 * Register Settings
 */
export function registerSettings () {
    registerMenu(
        CONSTANTS.WEAPON_PROPERTIES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.WEAPON_PROPERTIES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.WEAPON_PROPERTIES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.WEAPON_PROPERTIES.MENU.NAME),
            icon: CONSTANTS.WEAPON_PROPERTIES.MENU.ICON,
            type: WeaponPropertiesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.WEAPON_PROPERTIES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E.weaponProperties
        }
    )

    const setting = getSetting(CONSTANTS.WEAPON_PROPERTIES.SETTING.KEY)
    if (!Object.keys(setting).length) {
        setSetting(CONSTANTS.WEAPON_PROPERTIES.SETTING.KEY, CONFIG.CUSTOM_DND5E.weaponProperties)
    }
}

/**
 * Set CONFIG.DND5E.weaponProperties
 * Set CONFIG.DND5E.validProperties.weapon
 * @param {object} data
 */
export function setConfig (data) {
    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                game.i18n.localize(value.label)
            ])
    )

    Object.entries(data).forEach(([key, value]) => {
        if (value.visible || typeof value.visible === 'undefined') {
            CONFIG.DND5E.validProperties.weapon.add(key)
        } else {
            CONFIG.DND5E.validProperties.weapon.delete(key)
        }
    })

    const weaponProperties = buildConfig(data)
    if (weaponProperties) {
        CONFIG.DND5E.weaponProperties = weaponProperties
    }
}
