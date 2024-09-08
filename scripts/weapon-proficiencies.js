import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { WeaponProficienciesForm } from './forms/weapon-proficiencies-form.js'

/**
 * Register
 */
export function register () {
    registerSettings()

    Logger.debug(
        'Loading templates',
        [
            CONSTANTS.WEAPON_PROFICIENCIES.TEMPLATE.FORM,
            CONSTANTS.WEAPON_PROFICIENCIES.TEMPLATE.LIST
        ]
    )

    loadTemplates([
        CONSTANTS.WEAPON_PROFICIENCIES.TEMPLATE.FORM,
        CONSTANTS.WEAPON_PROFICIENCIES.TEMPLATE.LIST
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.WEAPON_PROFICIENCIES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.WEAPON_PROFICIENCIES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.WEAPON_PROFICIENCIES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.WEAPON_PROFICIENCIES.MENU.NAME),
            icon: CONSTANTS.WEAPON_PROFICIENCIES.MENU.ICON,
            type: WeaponProficienciesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.WEAPON_PROFICIENCIES.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: getSettingDefault()
        }
    )
}

/**
 * Get dnd5e config
 * @returns {object} The weapon proficiencies and weapon types
 */
export function getDnd5eConfig () {
    const config = {}

    Object.entries(CONFIG.CUSTOM_DND5E.weaponProficiencies).forEach(([key, value]) => {
        config[key] = { label: value, children: {} }
    })

    Object.entries(CONFIG.CUSTOM_DND5E.weaponTypes).forEach(([key, value]) => {
        const weaponProficiencyMap = CONFIG.CUSTOM_DND5E.weaponProficienciesMap[key]

        if (weaponProficiencyMap) {
            config[weaponProficiencyMap].children[key] = value
        } else {
            config[key] = { label: value, children: {} }
        }
    })

    return config
}

/**
 * Get setting default
 * Stores validProperties data in the itemProperties setting
 * @returns {object} The setting
 */
function getSettingDefault () {
    const config = {}

    Object.entries(CONFIG.DND5E.weaponProficiencies).forEach(([key, value]) => {
        config[key] = { label: value, children: {} }
    })

    Object.entries(CONFIG.DND5E.weaponTypes).forEach(([key, value]) => {
        const weaponProficiencyMap = CONFIG.DND5E.weaponProficienciesMap[key]

        if (weaponProficiencyMap) {
            config[weaponProficiencyMap].children[key] = value
        } else {
            config[key] = { label: value, children: {} }
        }
    })

    return config
}

/**
 * Set CONFIG.DND5E.weaponProficiencies
 * Set CONFIG.DND5E.weaponProficienciesMap
 * Set CONFIG.DND5E.weaponTypes
 * @param {object} data
 */
export function setConfig (data = null) {
    const config = { weaponProficiencies: {}, weaponProficienciesMap: {}, weaponTypes: {} }

    Object.entries(data)
        .filter(([_, value]) => value.visible || value.visible === undefined)
        .forEach(([key, value]) => {
            if (value.children) {
                config.weaponProficiencies[key] = game.i18n.localize(value.label)

                Object.entries(value.children).forEach(([key2, value2]) => {
                    config.weaponProficienciesMap[key2] = key
                    config.weaponTypes[key2] = game.i18n.localize(value2.label)
                })
            } else {
                config.weaponTypes[key] = game.i18n.localize(value.label)
            }
        })

    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E.weaponProficiencies)) {
            resetDnd5eConfig('weaponProficiencies')
        }
        if (checkEmpty(CONFIG.DND5E.weaponProficienciesMap)) {
            resetDnd5eConfig('weaponProficienciesMap')
        }
        if (checkEmpty(CONFIG.DND5E.weaponTypes)) {
            resetDnd5eConfig('weaponTypes')
        }
        return
    }

    config?.weaponProficiencies && (CONFIG.DND5E.weaponProficiencies = config.weaponProficiencies)
    config?.weaponProficienciesMap && (CONFIG.DND5E.weaponProficienciesMap = config.weaponProficienciesMap)
    config?.weaponTypes && (CONFIG.DND5E.weaponTypes = config.weaponTypes)
}
