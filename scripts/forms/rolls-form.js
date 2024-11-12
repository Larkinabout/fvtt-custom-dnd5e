import { CONSTANTS, MODULE } from '../constants.js'
import { getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

export class RollsForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
        this.type = 'sheet'
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
        return {
            rolls: getSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY)
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
                const property = key.split('.').slice(1, 3).join('.')
                foundry.utils.setProperty(rolls, property, value)
            }
        })

        await Promise.all([
            setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, rolls)
        ])
    }
}
