import { CONSTANTS } from './constants.js'
import { Logger, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { ItemPropertiesForm } from './forms/item-properties-form.js'

/**
 * Register
 */
export function register () {
    registerSettings()

    const templates = [
        CONSTANTS.ITEM_PROPERTIES.TEMPLATE.FORM,
        CONSTANTS.ITEM_PROPERTIES.TEMPLATE.LIST
    ]
    Logger.debug('Loading templates', templates)
    loadTemplates(templates)
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.ITEM_PROPERTIES.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ITEM_PROPERTIES.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ITEM_PROPERTIES.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ITEM_PROPERTIES.MENU.NAME),
            icon: CONSTANTS.ITEM_PROPERTIES.MENU.ICON,
            type: ItemPropertiesForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ITEM_PROPERTIES.SETTING.KEY,
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
 * @returns {object} The item properties
 */
export function getDnd5eConfig () {
    const config = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E.itemProperties)

    Object.entries(CONFIG.CUSTOM_DND5E.validProperties).forEach(itemType => {
        [...itemType[1]].forEach(property => {
            const itemProperty = config[property]
            itemProperty && (itemProperty[itemType[0]] = true)
        })
    })

    return config
}

/**
 * Get setting default
 * Stores validProperties data in the itemProperties setting
 * @returns {object} The setting
 */
function getSettingDefault () {
    const itemProperties = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E.itemProperties)
    const itemTypes = ['consumable', 'container', 'equipment', 'feat', 'loot', 'spell', 'tool', 'weapon']

    Object.keys(itemProperties).forEach((key) => {
        itemTypes.forEach(itemType => {
            if (CONFIG.CUSTOM_DND5E.validProperties[itemType].has(key)) {
                itemProperties[key][itemType] = true
            }
        })
    })

    return itemProperties
}

/**
 * Set CONFIG.DND5E.itemProperties
 * Set CONFIG.DND5E.validProperties
 * @param {object} data
 */
export function setConfig (data = null) {
    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E.itemProperties)) {
            resetDnd5eConfig('itemProperties')
        }
        return
    }

    const buildConfig = (data) => Object.fromEntries(
        Object.entries(data)
            .filter(([_, value]) => value.visible || value.visible === undefined)
            .map(([key, value]) => [
                key,
                {
                    ...(value.abbreviation !== undefined && { abbreviation: game.i18n.localize(value.abbreviation) }),
                    ...(value.icon !== undefined && { icon: value.icon }),
                    ...(value.isPhysical !== undefined && { isPhysical: value.isPhysical }),
                    ...(value.isTag !== undefined && { isTag: value.isTag }),
                    label: game.i18n.localize(value.label),
                    ...(value.reference !== undefined && { reference: value.reference })
                }
            ])
    )

    const validProperties = {}

    Object.entries(CONFIG.CUSTOM_DND5E.validProperties).forEach(property => {
        validProperties[property[0]] = new Set([...property[1]])
    })

    Object.entries(data).forEach(([key, value]) => {
        const itemTypes = ['consumable', 'container', 'equipment', 'feat', 'loot', 'spell', 'tool', 'weapon']

        itemTypes.forEach(itemType => {
            if (value[itemType] && (value.visible || typeof value.visible === 'undefined')) {
                validProperties[itemType].add(key)
            } else {
                validProperties[itemType].delete(key)
            }
        })
    })

    CONFIG.DND5E.validProperties = (checkEmpty(validProperties))
        ? foundry.utils.deepClone(CONFIG.CUSTOM_DND5E.validProperties)
        : validProperties

    const config = buildConfig(data)
    config && (CONFIG.DND5E.itemProperties = config)
}
