import { CONSTANTS, MODULE } from '../constants.js'
import { setSetting, Logger } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { getDnd5eConfig, setConfig } from '../conditions.js'

export class ConditionsEditForm extends CustomDnd5eForm {
    constructor (args) {
        super(args)

        this.conditionsForm = args.conditionsForm
        this.key = args.data.key
        this.system = args.data.system
        this.setting = args.setting
        this.dnd5eConfig = getDnd5eConfig(this.key)
    }

    static DEFAULT_OPTIONS = {
        actions: {
            reset: ConditionsEditForm.reset
        },
        form: {
            handler: ConditionsEditForm.submit,
            closeOnSubmit: false
        },
        id: `${MODULE.ID}-conditions-edit`,
        window: {
            title: 'CUSTOM_DND5E.form.conditions.edit.title'
        }
    }

    static PARTS = {
        form: {
            template: `modules/${MODULE.ID}/templates/conditions-edit.hbs`
        }
    }

    #getChoices () {
        const statusEffects = Object.fromEntries(CONFIG.statusEffects.map(statusEffect => [statusEffect.id, statusEffect.name]))
        return { riders: statusEffects, statuses: statusEffects }
    }

    async _prepareContext () {
        const context = {
            ...this.setting[this.key],
            key: this.key,
            choices: this.#getChoices()
        }

        if (this.system === false) {
            context.system = false
        }

        return context
    }

    _onRender (context, options) {
        super._onRender(context, options)
    }

    static async reset () {
        const reset = async () => {
            this.setting[this.key] = this.dnd5eConfig
            await setSetting(this.settingKey, this.setting)
            setConfig(this.setting)
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
        const oldKey = this.key
        const newKey = formData.object[`${this.key}.key`]

        if (!newKey.match(/^[0-9a-zA-Z]+$/)) {
            Logger.error(`Key '${newKey}' must only contain alphanumeric characters`, true)
            return
        }

        if (oldKey !== newKey) {
            if (this.setting[newKey]) {
                Logger.error(`Key '${newKey}' already exists`, true)
                return
            }
        }

        // Set properties in this.setting
        Object.entries(formData.object).forEach(([key, value]) => {
            if (key.split('.').pop() === 'key') return
            if (value === 'false') {
                value = false
            } else if (value === 'true') {
                value = true
            }
            foundry.utils.setProperty(this.setting, key, value)
        })

        // Create new key and delete old key while keeping order of counters
        if (oldKey !== newKey) {
            this.setting[newKey] = foundry.utils.deepClone(this.setting[oldKey])

            const data = Object.fromEntries(
                Object.keys(this.setting).map(key => [
                    (key === oldKey) ? newKey : key,
                    foundry.utils.deepClone(this.setting[key])
                ])
            )

            this.setting = data

            this.key = newKey
        }

        await setSetting(CONSTANTS.CONDITIONS.SETTING.KEY, this.setting)

        this.close()

        this.conditionsForm.render(true)
    }

    /**
     * Open the form
     * @param {object} args
     **/
    static async open (args) {
        const form = new ConditionsEditForm(args)
        form.render(true)
    }
}
