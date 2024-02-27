import { MODULE, CONSTANTS } from './constants.js'
import { Logger, getSetting, setSetting, registerMenu, registerSetting } from './utils.js'
import { DebugForm } from './forms/debug-form.js'

/**
 * Register
 */
export function register () {
    registerSettings()

    loadTemplates([
        CONSTANTS.DEBUG.TEMPLATE.FORM,
        CONSTANTS.DEBUG.TEMPLATE.IMPORT_DIALOG
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.DEBUG.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.DEBUG.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.DEBUG.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.DEBUG.MENU.NAME),
            icon: CONSTANTS.DEBUG.MENU.ICON,
            type: DebugForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.DEBUG.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Boolean,
            default: false
        }
    )
}

/**
 * Exports data to JSON file
 */
export async function exportData () {
    const data = {
        customDnd5eVersion: game.modules.get(MODULE.ID).version,
        dnd5eVersion: game.system.version,
        foundryVttVersion: game.version,
        setting: Object.fromEntries(
            [...game.settings.settings]
                .filter(setting => setting[0].includes(MODULE.ID))
                .map(setting => [setting[1].key, getSetting(setting[1].key)])
        ),
        configDnd5e: {
            abilities: CONFIG.DND5E.abilities,
            abilityActivationTypes: CONFIG.DND5E.abilityActivationTypes,
            actorSizes: CONFIG.DND5E.actorSizes,
            armorClasses: CONFIG.DND5E.armorClasses,
            currencies: CONFIG.DND5E.currencies,
            damageTypes: CONFIG.DND5E.damageTypes,
            encumbrance: CONFIG.DND5E.encumbrance,
            itemActionTypes: CONFIG.DND5E.itemActionTypes,
            itemProperties: CONFIG.DND5E.itemProperties,
            languages: CONFIG.DND5E.languages,
            maxLevel: CONFIG.DND5E.maxLevel,
            senses: CONFIG.DND5E.senses,
            skills: CONFIG.DND5E.skills,
            spellSchools: CONFIG.DND5E.spellSchools,
            validProperties: CONFIG.DND5E.validProperties
        }
    }

    saveDataToFile(JSON.stringify(data, null, 2), 'text/json', `${MODULE.ID}.json`)
}

/**
 * Import data from JSON file
 */
export async function importData () {
    const content = await renderTemplate(CONSTANTS.DEBUG.TEMPLATE.IMPORT_DIALOG, {})
    const dialog = new Promise((resolve, reject) => {
        new Dialog({
            title: game.i18n.localize('CUSTOM_DND5E.importData'),
            content,
            buttons: {
                import: {
                    icon: '<i class="fas fa-file-import"></i>',
                    label: game.i18n.localize('CUSTOM_DND5E.importData'),
                    callback: async (html) => {
                        const form = html.find('form')[0]
                        if (!form.data.files.length) return Logger.error(game.i18n.localize('CUSTOM_DND5E.dialog.importData.noFile'), true)
                        const resolved = await processImport(form.data.files[0])
                        resolve(resolved)
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('CUSTOM_DND5E.cancel'),
                    callback: html => resolve(false)
                }
            },
            default: 'import'
        }, {
            width: 400
        }).render(true)
    })
    return await dialog
}

/**
 * Process the import file
 * @param {string} file The file path
 * @returns {boolean}   Whether the process succeeded
 */
async function processImport (file) {
    const json = await readTextFromFile(file)
    const jsonData = JSON.parse(json)
    const currentVersion = game.modules.get(MODULE.ID).version.split('.').slice(0, 2).join('.')
    const fileVersion = jsonData.customDnd5eVersion.split('.').slice(0, 2).join('.')
    if (fileVersion !== currentVersion) {
        Logger.error(game.i18n.format('CUSTOM_DND5E.dialog.importData.differentVersion', { fileVersion, currentVersion }), true)
        return false
    }
    try {
        await Promise.all([
            overwriteSettings(jsonData.setting),
            overwriteConfig(jsonData.configDnd5e)
        ])
    } catch (error) {
        Logger.error(`An error occurred while importing data: ${error.message}`)
        return false
    }

    // Rerender settings window to update values
    Object.values(ui.windows).find(app => app.id === 'client-settings')?.render(true)

    return true
}

/**
 * Overwrite the module's settings
 * @param {object} setting The settings
 */
async function overwriteSettings (setting) {
    if (!setting) {
        Logger.info(game.i18n.localize('CUSTOM_DND5E.dialog.importData.settingsNotFound'), true)
        return
    }

    await Promise.all(
        Object.entries(setting).map(([key, value]) => setSetting(key, value))
    )

    Logger.info(game.i18n.localize('CUSTOM_DND5E.dialog.importData.settingsImported'), true)
}

/**
 * Overwrite properties in CONFIG.DND5E
 * @param {object} config The config
 */
async function overwriteConfig (configDnd5e) {
    if (!configDnd5e) {
        Logger.info(game.i18n.localize('CUSTOM_DND5E.dialog.importData.configNotFound'), true)
        return
    }

    Object.entries(configDnd5e).forEach(([key, value]) => {
        CONFIG.DND5E[key] = value
    })

    Logger.info(game.i18n.localize('CUSTOM_DND5E.dialog.importData.configImported'), true)
}
