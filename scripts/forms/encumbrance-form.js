import { CONSTANTS, MODULE } from '../constants.js'
import { getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { setConfig } from '../encumbrance.js'

const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`

export class EncumbranceForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)

        this.metric = game.settings.get('dnd5e', 'metricWeightUnits') || false
        this.settingKey = CONSTANTS.ENCUMBRANCE.SETTING.KEY
        this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E.encumbrance)
        this.setFunction = setConfig
        this.type = 'encumbrance'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            template: CONSTANTS.ENCUMBRANCE.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.encumbrance.title')
        })
    }

    async getData () {
        const data = this.setting
        data.metric = this.metric

        return data
    }

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _reset () {
        const reset = async () => {
            await setSetting(this.settingKey, CONFIG.CUSTOM_DND5E[this.type])
            this.setFunction(CONFIG.CUSTOM_DND5E[this.type])
            this.render(true)
        }

        const d = new Dialog({
            title: game.i18n.localize('CUSTOM_DND5E.dialog.reset.title'),
            content: `<p>${game.i18n.localize('CUSTOM_DND5E.dialog.reset.content')}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('CUSTOM_DND5E.dialog.reset.yes'),
                    callback: async () => {
                        reset()
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('CUSTOM_DND5E.dialog.reset.no')
                }
            }
        })
        d.render(true)
    }

    async _updateObject (event, formData) {
        Object.entries(formData).forEach(([key, value]) => {
            setProperty(this.setting, key, value)
        })

        await setSetting(this.settingKey, this.setting)
        this.setFunction(this.setting)
    }
}
