import { CONSTANTS } from './constants.js'
import { getDieParts, getSetting, registerMenu, registerSetting, Logger } from './utils.js'
import { RollsForm } from './forms/rolls-form.js'

const constants = CONSTANTS.ROLLS

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()

    const templates = [constants.FORM]
    Logger.debug('Loading templates', templates)
    loadTemplates(templates)
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        constants.MENU.KEY,
        {
            hint: game.i18n.localize(constants.MENU.HINT),
            label: game.i18n.localize(constants.MENU.LABEL),
            name: game.i18n.localize(constants.MENU.NAME),
            icon: constants.MENU.ICON,
            type: RollsForm,
            restricted: true,
            scope: 'world',
            requiresReload: true
        }
    )

    registerSetting(
        constants.SETTING.ROLLS.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: {
                ability: { die: '1d20', rollMode: 'publicroll' },
                concentration: { die: '1d20', rollMode: 'publicroll' },
                initiative: { die: '1d20', rollMode: 'publicroll' },
                savingThrow: { die: '1d20', rollMode: 'publicroll' },
                skill: { die: '1d20', rollMode: 'publicroll' },
                tool: { die: '1d20', rollMode: 'publicroll' }
            }
        }
    )
}

/**
 * Register hooks
 */
function registerHooks () {
    Hooks.on('dnd5e.preRollV2', (config, dialog, message) => {
        const hookNames = config.hookNames
        const rolls = getSetting(constants.SETTING.ROLLS.KEY)

        let roll = null

        if (hookNames.includes('concentration')) {
            roll = rolls.concentration
        } else if (hookNames.includes('initiativeDialog')) {
            roll = rolls.initiative
        } else if (hookNames.includes('skill')) {
            roll = rolls.skill
        } else if (hookNames.includes('tool')) {
            roll = rolls.tool
        } else if (hookNames.includes('AbilityCheck')) {
            roll = rolls.ability
        } else if (hookNames.includes('SavingThrow')) {
            roll = rolls.savingThrow
        }

        const dieParts = getDieParts(roll.die)
        if (roll.die !== '1d20' && dieParts) {
            config.rolls[0].options.customDie = roll.die
            config.rolls[0].options.criticalSuccess = dieParts.number
        }

        const rollModes = ['gmroll', 'blindroll', 'selfroll']
        if (rollModes.includes(roll.rollMode)) {
            message.rollMode = roll.rollMode
        }
    })
}
