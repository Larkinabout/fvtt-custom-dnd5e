import { CONSTANTS, MODULE } from '../constants.js'
import { getSetting, setSetting } from '../utils.js'
import { ConfigForm } from './config-form.js'
import { getDnd5eConfig, setConfig } from '../armor-proficiencies.js'

export class ArmorProficienciesForm extends ConfigForm {
    constructor (...args) {
        super(args)

        this.nestable = true
        this.settingKey = CONSTANTS.ARMOR_PROFICIENCIES.SETTING.KEY
        this.dnd5eConfig = getDnd5eConfig()
        this.setting = getSetting(this.settingKey) || this.dnd5eConfig
        this.setConfig = setConfig
    }

    static DEFAULT_OPTIONS = {
        actions: {
            reset: ArmorProficienciesForm.reset
        },
        id: `${MODULE.ID}-armor-proficiencies-form`,
        window: {
            title: 'CUSTOM_DND5E.form.armorProficiencies.title'
        }
    }

    async _prepareContext () {
        this.setting = getSetting(this.settingKey) || this.dnd5eConfig

        const labelise = (data) => {
            Object.entries(data).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    data[key] = { label: value }
                }

                if (value.children) {
                    labelise(value.children)
                }
            })
        }

        labelise(this.setting)

        return { items: this.setting }
    }

    static async reset () {
        const reset = async () => {
            await setSetting(this.settingKey, this.dnd5eConfig)
            setConfig(this.dnd5eConfig)
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
}
