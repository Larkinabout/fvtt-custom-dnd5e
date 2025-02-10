import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from '../constants.js'
import { getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

export class RollsForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
        this.type = 'sheet'
        this.headerButton = JOURNAL_HELP_BUTTON
        this.headerButton.uuid = CONSTANTS.ROLLS.UUID
    }

    static DEFAULT_OPTIONS = {
        actions: {
            reset: RollsForm.reset
        },
        form: {
            handler: RollsForm.submit
        },
        id: `${MODULE.ID}-rolls-form`,
        window: {
            title: 'CUSTOM_DND5E.form.rolls.title'
        }
    }

    static PARTS = {
        form: {
            template: CONSTANTS.ROLLS.TEMPLATE.FORM
        }
    }

    async _prepareContext () {
        const rolls = getSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY)
        const weaponTypes = {}

        Object.entries(CONFIG.DND5E.weaponTypes).forEach(([key, value]) => {
            const die = rolls.weaponTypes?.[key]?.die || '1d20'
            const label = value
            const rollMode = rolls.weaponTypes?.[key]?.rollMode || 'default'
            weaponTypes[key] = { die, label, rollMode }
        })
    
        rolls.weaponTypes = weaponTypes
    
        return {
            rolls,
            selects: {
                rollMode: {
                    choices: {
                        default: 'CUSTOM_DND5E.default',
                        blindroll: 'CHAT.RollBlind',
                        gmroll: 'CHAT.RollPrivate',
                        publicroll: 'CHAT.RollPublic',
                        selfroll: 'CHAT.RollSelf'
                    }
                }
            }
        }
    }

    static async reset () {
        const reset = async () => {
            this.render(true)
        }

        await foundry.applications.api.DialogV2.confirm({
            window: {
                title: game.i18n.localize('CUSTOM_DND5E.dialog.reset.title')
            },
            content: `<p>${game.i18n.localize('CUSTOM_DND5E.dialog.reset.content')}</p>`,
            modal: true,
            yes: {
                label: game.i18n.localize('CUSTOM_DND5E.yes'),
                callback: async () => {
                    reset()
                }
            },
            no: {
                label: game.i18n.localize('CUSTOM_DND5E.no')
            }
        })
    }

    static async submit (event, form, formData) {
        const rolls = {}

        Object.entries(formData.object).forEach(([key, value]) => {
            if (key.startsWith('rolls')) {
                foundry.utils.setProperty(rolls, key, value)
            }
        })

        await setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, {})
        await setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, rolls.rolls)

        SettingsConfig.reloadConfirm()
    }
}
