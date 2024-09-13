import { CONSTANTS, MODULE } from '../constants.js'
import { deleteProperty, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { getDnd5eConfig, setConfig } from '../conditions.js'
import { ConditionsEditForm } from './conditions-edit-form.js'

const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

export class ConditionsForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)

        this.settingKey = CONSTANTS.CONDITIONS.SETTING.KEY
        this.setting = getSetting(this.settingKey) || getDnd5eConfig()
        this.setFunction = setConfig
    }

    static DEFAULT_OPTIONS = {
        actions: {
            edit: ConditionsForm.edit,
            new: ConditionsForm.createItem,
            reset: ConditionsForm.reset
        },
        form: {
            handler: ConditionsForm.submit
        },
        id: `${MODULE.ID}-conditions-form`,
        window: {
            title: 'CUSTOM_DND5E.form.conditions.title'
        }
    }

    static PARTS = {
        form: {
            template: CONSTANTS.CONDITIONS.TEMPLATE.FORM
        }
    }

    async _prepareContext () {
        this.setting = getSetting(this.settingKey) || getDnd5eConfig()
        return { items: this.setting }
    }

    static async reset () {
        const reset = async () => {
            await setSetting(this.settingKey, getDnd5eConfig())
            this.setFunction(getDnd5eConfig())
            this.render(true)
        }

        const d = await foundry.applications.api.DialogV2.confirm({
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

    static async edit (event, target) {
        const item = target.closest('.custom-dnd5e-item')
        if (!item) return

        const key = item.dataset.key
        if (!key) return

        const args = { conditionsForm: this, data: { key }, setting: this.setting }
        await ConditionsEditForm.open(args)
    }

    static async createItem (event, target) {
        const args = { conditionsForm: this, data: { key: foundry.utils.randomID() }, setting: {} }
        await ConditionsEditForm.open(args)
    }

    static async submit (event, form, formData) {
        const ignore = ['children', 'delete', 'key', 'parentKey']

        // Get list of properties to delete
        const deleteKeys = Object.entries(formData.object)
            .filter(([key, value]) => key.split('.').pop() === 'delete' && value === 'true')
            .map(([key, _]) => key.split('.').slice(0, -1).join('.'))

        // Delete properties from formData
        Object.keys(formData.object).forEach(key => {
            if (deleteKeys.includes(key.split('.').slice(0, -1).join('.'))) {
                delete formData.object[key]
            }
        })

        // Delete properties from this.setting
        deleteKeys.forEach(key => {
            deleteProperty(this.setting, key)
        })

        // Set properties in this.setting
        Object.entries(formData.object).forEach(([key, value]) => {
            if (ignore.includes(key.split('.').pop())) { return }
            if (key.split('.').pop() === 'system') {
                if (value === 'true') { return }
                value = false
            }
            foundry.utils.setProperty(this.setting, key, value)
        })

        await setSetting(this.settingKey, this.setting)
        this.setFunction(this.setting)
    }
}
