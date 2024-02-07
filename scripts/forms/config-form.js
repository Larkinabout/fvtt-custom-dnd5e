import { CONSTANTS, MODULE } from '../constants.js'
import { getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { setDamageTypes } from '../damage-types.js'
import { setLanguages } from '../languages.js'
import { setSenses } from '../senses.js'

const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

class ConfigForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            template: CONSTANTS.CONFIG.TEMPLATE.FORM
        })
    }

    async getData () {
        const data = getSetting(this.setting)

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

        labelise(data)

        return { items: data }
    }

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _reset () {
        const reset = async () => {
            await setSetting(this.setting, CONFIG.CUSTOM_DND5E[this.type])
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

        const key = randomID()

        const item = document.createElement('li')
        item.classList.add(itemClass)
        item.setAttribute('draggable', 'true')
        item.setAttribute('data-key', key)

        item.innerHTML = this._getInnerHtml({ key })

        if (this.items[0]) { item.addEventListener('dragstart', this.items[0].ondragstart) } // Fix this for empty list
        item.addEventListener('dragleave', this._onDragLeave)

        list.appendChild(item)
    }

    _getInnerHtml (data) {
        return `<div class="custom-dnd5e-item-group flexrow">
        <i class="flex0 fas fa-grip-lines"></i>
        <input id="visible" name="visible" type="checkbox" checked>
        <div class="fields flexrow">
            <input id="parentKey" name="parentKey" type="hidden" value="">
            <input id="key" name="key" type="hidden" value="${data.key}">
            <input id="system" name="system" type="hidden" value="false">
            <input id="label" name="label" type="text" value="">     
        </div>
        <button type="button" data-tooltip="Delete" data-action="delete" class="flex0 delete-button">
        <i class="fas fa-xmark"></i>
        </button>
        <input id="delete" name="delete" type="hidden" value="false"
        </div>`
    }

    async _updateObject (event, formData) {
        const items = {}

        const map = new Map()

        const keys = Object.keys(formData).filter(key => !['children', 'delete', 'parentKey'].includes(key))

        for (let index = 0; index < Object.keys(formData.key).length; index++) {
            const key = formData.key[index]

            if (formData.delete[index] === 'true') {
                for (const actor of game.actors) {
                    // actor.unsetFlag(MODULE.ID, key)
                }
                continue
            }

            const parentKey = formData.parentKey[index]

            const data = {}
            keys.forEach(key => {
                if (formData[key][index] || typeof formData[key][index] === 'boolean') {
                    data[key] = (key === 'system') ? formData.system[index] !== 'false' : formData[key][index]
                }
            })

            map.set(key, data)

            if (parentKey) {
                const parent = map.get(parentKey)
                if (parent) {
                    if (!Object.hasOwn(parent, 'children')) {
                        parent.children = {}
                    }

                    parent.children[key] = data
                }
            } else {
                items[key] = data
            }
        }

        await setSetting(this.setting, items)
        this.setFunction(items)
    }
}

export class DamageTypesForm extends ConfigForm {
    constructor () {
        super()
        this.setting = CONSTANTS.DAMAGE_TYPES.SETTING.KEY
        this.setFunction = setDamageTypes
        this.type = 'damageTypes'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-damage-types-form`,
            template: CONSTANTS.DAMAGE_TYPES.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.damageTypes.title')
        })
    }

    _getInnerHtml (data) {
        return `<div class="custom-dnd5e-item-group flexrow">
        <i class="flex0 fas fa-grip-lines"></i>
        <input id="visible" name="visible" type="checkbox" checked>
        <div class="fields flexrow">
            <input id="parentKey" name="parentKey" type="hidden" value="">
            <input id="key" name="key" type="hidden" value="${data.key}">
            <input id="system" name="system" type="hidden" value="false">
            <div class="field flex1">
                <label>Label</label>
                <input id="label" name="label" type="text" value="">
            </div>
            <div class="field flex2">
                <label>Icon</label>
                <input id="icon" name="icon" type="text" value="">
            </div>   
            <div class="field flex2">
                <label>Reference</label>
                <input id="reference" name="reference" type="text" value="">
            </div>
        </div>
        <button type="button" data-tooltip="Delete" data-action="delete" class="flex0 delete-button">
        <i class="fas fa-xmark"></i>
        </button>
        <input id="delete" name="delete" type="hidden" value="false"
        </div>`
    }
}

export class LanguagesForm extends ConfigForm {
    constructor () {
        super()
        this.setting = CONSTANTS.LANGUAGES.SETTING.KEY
        this.setFunction = setLanguages
        this.type = 'languages'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-languages-form`,
            title: game.i18n.localize('CUSTOM_DND5E.form.languages.title')
        })
    }
}

export class SensesForm extends ConfigForm {
    constructor () {
        super()
        this.setting = CONSTANTS.SENSES.SETTING.KEY
        this.setFunction = setSenses
        this.type = 'senses'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-senses-form`,
            title: game.i18n.localize('CUSTOM_DND5E.form.senses.title')
        })
    }
}
