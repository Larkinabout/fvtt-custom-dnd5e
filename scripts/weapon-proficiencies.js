import { CONSTANTS } from './constants.js'
import { c5eLoadTemplates, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { WeaponProficienciesForm } from './forms/weapon-proficiencies-form.js'

/**
 * Register
 */
export function register () {
    registerSettings()

    const templates = [
        CONSTANTS.WEAPON_PROFICIENCIES.TEMPLATE.FORM,
        CONSTANTS.WEAPON_PROFICIENCIES.TEMPLATE.LIST
    ]
    c5eLoadTemplates(templates)
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
            default: getDefault()
        }
    )
}

/**
 * Get dnd5e config
 * @returns {object} The weapon proficiencies and weapon types
 */
export function getDnd5eConfig () {
    return buildData(CONFIG.CUSTOM_DND5E)
}

/**
 * Get setting default
 * @returns {object} The setting
 */
function getDefault () {
    return buildData(CONFIG.DND5E)
}

/**
 * Build setting data
 * @param {object} config The config data
 * @returns {object}      The setting data
 */
function buildData (config) {
    const data = {}

    Object.entries(config.weaponProficiencies).forEach(([key, value]) => {
        data[key] = { label: value, children: {} }
    })

    Object.entries(config.weaponTypes).forEach(([key, value]) => {
        const map = config.weaponProficienciesMap[key]

        if (map) {
            data[map].children[key] = value
        } else {
            data[key] = { label: value, children: {} }
        }
    })

    return data
}

/**
 * Set CONFIG.DND5E.weaponProficiencies
 * Set CONFIG.DND5E.weaponProficienciesMap
 * Set CONFIG.DND5E.weaponTypes
 * @param {object} data
 */
export function setConfig (data = null) {
    const properties = ['weaponProficiencies', 'weaponProficienciesMap', 'weaponTypes']

    // Initialise the config object
    const config = {
        weaponProficiencies: {},
        weaponProficienciesMap: {},
        weaponTypes: {}
    }

    // Exit if data is empty and reset config
    if (checkEmpty(data)) {
        properties.forEach((property) => {
            if (checkEmpty(CONFIG.DND5E[property])) {
                resetDnd5eConfig(property)
            }
        })
        return
    }

    // Populate config
    Object.entries(data)
        .filter(([_, value]) => value.visible || value.visible === undefined)
        .forEach(([key, value]) => {
            const localisedLabel = game.i18n.localize(value.label ?? value)

            if (value.children) {
                config.weaponProficiencies[key] = localisedLabel

                Object.entries(value.children).forEach(([childKey, childValue]) => {
                    config.weaponProficienciesMap[childKey] = key
                    config.weaponTypes[childKey] = game.i18n.localize(childValue.label ?? childValue)
                })
            } else {
                config.weaponTypes[key] = localisedLabel
            }
        })

    // Apply the config to CONFIG.DND5E
    properties.forEach(property => {
        if (Object.keys(config[property]).length) {
            CONFIG.DND5E[property] = config[property]
        }
    })
}
