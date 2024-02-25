import { CONSTANTS, MODULE } from '../constants.js'
import { deleteProperty, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { getDnd5eConfig, setConfig as setItemProperties } from '../item-properties.js'

const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

export class ItemPropertiesForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)

        this.settingKey = CONSTANTS.ITEM_PROPERTIES.SETTING.KEY
        this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E.itemProperties)
        this.setFunction = setItemProperties
        this.type = 'itemProperties'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-item-properties-form`,
            template: CONSTANTS.ITEM_PROPERTIES.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.itemProperties.title')
        })
    }

    async getData () {
        this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E.itemProperties)

        return { items: this.setting }
    }

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _reset () {
        const reset = async () => {
            await setSetting(this.settingKey, getDnd5eConfig())
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

    async _createItem () {
        const list = this.element[0].querySelector(listClassSelector)
        const scrollable = list.closest('.scrollable')

        const key = randomID()

        const template = await this._getHtml({ items: { [key]: { system: false, visible: true } } })

        list.insertAdjacentHTML('beforeend', template)

        const item = list.querySelector(`[data-key="${key}"]`)
        const dragElement = item.querySelector('.custom-dnd5e-drag')

        item.addEventListener('dragend', this._onDragEnd.bind(this))
        item.addEventListener('dragleave', this._onDragLeave.bind(this))
        item.addEventListener('dragover', this._onDragOver.bind(this))
        item.addEventListener('drop', this._onDrop.bind(this))
        dragElement.addEventListener('dragstart', this._onDragStart.bind(this))

        scrollable && (scrollable.scrollTop = scrollable.scrollHeight)
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.ITEM_PROPERTIES.TEMPLATE.LIST, data)
        return template
    }

    async _updateObject (event, formData) {
        const ignore = ['children', 'delete', 'key', 'parentKey']

        // Get list of properties to delete
        const deleteKeys = Object.entries(formData)
            .filter(([key, value]) => key.split('.').pop() === 'delete' && value === 'true')
            .map(([key, _]) => key.split('.').slice(0, -1).join('.'))

        // Delete properties from formData
        Object.keys(formData).forEach(key => {
            if (deleteKeys.includes(key.split('.').slice(0, -1).join('.'))) {
                delete formData[key]
            }
        })

        // Delete properties from this.setting
        deleteKeys.forEach(key => {
            deleteProperty(this.setting, key)
        })

        // Set properties in this.setting
        Object.entries(formData).forEach(([key, value]) => {
            if (ignore.includes(key.split('.').pop())) { return }
            if (key.split('.').pop() === 'system') {
                if (value === 'true') { return }
                value = false
            }
            setProperty(this.setting, key, value)
        })

        await setSetting(this.settingKey, this.setting)
        this.setFunction(this.setting)
    }
}
