import { CONSTANTS, MODULE } from '../constants.js'
import { Logger, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { getDnd5eConfig, setConfig } from '../conditions.js'
import { ConditionsEditForm } from './conditions-edit-form.js'

export class ConditionsForm extends CustomDnd5eForm {
    constructor (...args) {
        super(...args)

        this.settingKey = CONSTANTS.CONDITIONS.SETTING.KEY
        this.dnd5eConfig = getDnd5eConfig()
        this.setting = getSetting(this.settingKey) || this.dnd5eConfig
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
        this.setting = getSetting(this.settingKey) || this.dnd5eConfig
        return { items: this.setting }
    }

    static async reset () {
        const reset = async () => {
            await setSetting(this.settingKey, this.dnd5eConfig)
            setConfig(this.dnd5eConfig)
            this.render(true)
        }

        try {
            await foundry.applications.api.DialogV2.confirm({
                window: {
                    title: game.i18n.localize('CUSTOM_DND5E.dialog.reset.title')
                },
                content: `<p>${game.i18n.localize('CUSTOM_DND5E.dialog.reset.content')}</p>`,
                modal: true,
                yes: {
                    label: game.i18n.localize('CUSTOM_DND5E.yes'),
                    callback: reset
                },
                no: {
                    label: game.i18n.localize('CUSTOM_DND5E.no')
                }
            })
        } catch (err) {
            Logger.error('Failed to reset conditions', true)
        }
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
        const args = { conditionsForm: this, data: { key: foundry.utils.randomID(), system: false }, setting: this.setting }
        await ConditionsEditForm.open(args)
    }

    static async submit (event, form, formData) {
        const propertiesToIgnore = ['children', 'delete', 'key', 'parentKey']
        const changedKeys = this.getChangedKeys(formData)
        const processedFormData = this.processFormData({ formData, changedKeys, propertiesToIgnore, setting: this.setting })

        this.handleSubmit(processedFormData, this.settingKey, setConfig, false)
    }
}
