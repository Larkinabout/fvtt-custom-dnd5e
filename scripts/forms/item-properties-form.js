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

        this.requiresReload = true
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

        const item = document.createElement('li')
        item.classList.add(itemClass, 'flexrow')
        item.setAttribute('draggable', 'true')
        item.setAttribute('data-key', key)

        item.innerHTML = this._getInnerHtml({ key })

        if (this.items[0]) { item.addEventListener('dragstart', this.items[0].ondragstart) } // Fix this for empty list
        item.addEventListener('dragleave', this._onDragLeave)

        list.appendChild(item)

        scrollable && (scrollable.scrollTop = scrollable.scrollHeight)
    }

    _getInnerHtml (data) {
        return `<i class="custom-dnd5e-drag flex0 fas fa-grip-lines" draggable="true"></i>
        <input id="visible" name="${data.key}.visible" type="checkbox" data-tooltip="${game.i18n.localize('CUSTOM_DND5E.form.checkbox.visible.tooltip')}" checked>
        <div class="custom-dnd5e-col-group flexcol">
            <input id="key" name="${data.key}.key" type="hidden" value="${data.key}">
            <input id="system" name="${data.key}.system" type="hidden" value="false">
            <div class="form-group">
                <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.label')}</label>
                <div class="form-fields">
                    <input id="label" name="${data.key}.label" type="text">
                </div>
            </div>
            <div class="form-group">
                <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.abbreviation')}</label>
                <div class="form-fields">
                    <input id="abbreviation" name="${data.key}.abbreviation" type="text">
                </div>
            </div>
            <div class="form-group">
                <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.icon')}</label>
                <div class="form-fields">
                    <input id="icon" name="${data.key}.icon" type="text">
                </div>
            </div>
            <div class="form-group">
                <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.physical')}</label>
                <div class="form-fields">
                    <input id="is-physical" name="${data.key}.isPhysical" type="checkbox">
                </div>
            </div>
            <div class="form-group">
                <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.tag')}</label>
                <div class="form-fields">
                    <input id="is-tag" name="${data.key}.isTag" type="checkbox">
                </div>
            </div>
            <div class="form-group">
                <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.reference')}</label>
                <div class="form-fields">
                    <input id="reference" name="${data.key}.reference" type="text">
                </div>
            </div>
            <div class="form-group stacked">
                <label>${game.i18n.localize('CUSTOM_DND5E.itemTypes')}</label>
                <label class="flex1" style="min-width:80px; max-width:100px;">
                    <input id="consumable" name="${data.key}.consumable" type="checkbox">
                    ${game.i18n.localize('CUSTOM_DND5E.consumable')}
                </label>
                <label class="flex1" style="min-width:80px; max-width:100px;">
                    <input id="container" name="${data.key}.container" type="checkbox">
                    ${game.i18n.localize('CUSTOM_DND5E.container')}
                </label>
                <label class="flex1" style="min-width:80px; max-width:100px;">
                    <input id="equipment" name="${data.key}.equipment" type="checkbox">
                    ${game.i18n.localize('CUSTOM_DND5E.equipment')}
                </label>
                <label class="flex1" style="min-width:80px; max-width:100px;">
                    <input id="feat" name="${data.key}.equipment" type="checkbox">
                    ${game.i18n.localize('CUSTOM_DND5E.feat')}
                </label>
                <label class="flex1" style="min-width:80px; max-width:100px;">
                    <input id="loot" name="${data.key}.loot" type="checkbox">
                    ${game.i18n.localize('CUSTOM_DND5E.loot')}
                </label>
                <label class="flex1" style="min-width:80px; max-width:100px;">
                    <input id="spell" name="${data.key}.spell" type="checkbox">
                    ${game.i18n.localize('CUSTOM_DND5E.spell')}
                </label>
                <label class="flex1" style="min-width:80px; max-width:100px;">
                    <input id="tool" name="${data.key}.tool" type="checkbox">
                    ${game.i18n.localize('CUSTOM_DND5E.tool')}
                </label>
                <label class="flex1" style="min-width:80px; max-width:100px;">
                    <input id="weapon" name="${data.key}.weapon" type="checkbox">
                    ${game.i18n.localize('CUSTOM_DND5E.weapon')}
                </label>
            </div>
        </div>
        <button type="button" data-tooltip="${game.i18n.localize('CUSTOM_DND5E.form.button.delete.tooltip')}" data-action="delete" class="flex0 delete-button">
            <i class="fas fa-xmark"></i>
        </button>
        <input id="delete" name="${data.key}.delete" type="hidden" value="false">`
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

        if (this.requiresReload) {
            SettingsConfig.reloadConfirm()
        }
    }
}