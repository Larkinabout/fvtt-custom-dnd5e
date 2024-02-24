import { CONSTANTS, MODULE } from '../constants.js'
import { deleteProperty, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { setConfig as setAbilities } from '../abilities.js'
import { setConfig as setArmorTypes } from '../armor-types.js'
import { setConfig as setActorSizes } from '../actor-sizes.js'
import { setConfig as setCurrency } from '../currency.js'
import { setConfig as setDamageTypes } from '../damage-types.js'
import { setConfig as setItemActionTypes } from '../item-action-types.js'
import { setConfig as setItemActivationCostTypes } from '../item-activation-cost-types.js'
import { setConfig as setLanguages } from '../languages.js'
import { setConfig as setSenses } from '../senses.js'
import { setConfig as setSkills } from '../skills.js'

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
        this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E[this.type])

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

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _reset () {
        const reset = async () => {
            await setSetting(this.settingKey, foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[this.type]))
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
        return `<i class="flex0 fas fa-grip-lines"></i>
        <input id="visible" name="${data.key}.visible" type="checkbox" checked>
        <div class="fields flexrow">
            <input id="parentKey" name="${data.key}.parentKey" type="hidden" value="">
            <input id="key" name="${data.key}.key" type="hidden" value="${data.key}">
            <input id="system" name="${data.key}.system" type="hidden" value="false">
            <input id="label" name="${data.key}.label" type="text" value="">     
        </div>
        <button type="button" data-tooltip="Delete" data-action="delete" class="flex0 delete-button">
        <i class="fas fa-xmark"></i>
        </button>
        <input id="delete" name="${data.key}.delete" type="hidden" value="false"`
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

        const data = {}

        // Set properties in this.setting
        Object.entries(formData).forEach(([key, value]) => {
            if (ignore.includes(key.split('.').pop())) { return }
            if (key.split('.').pop() === 'system') {
                if (value === 'true') { return }
                value = false
            }
            setProperty(data, key, value)
        })

        await setSetting(this.settingKey, data)
        this.setFunction(data)

        if (this.requiresReload) {
            SettingsConfig.reloadConfirm()
        }
    }
}

export class AbilitiesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = true
        this.settingKey = CONSTANTS.ABILITIES.SETTING.KEY
        this.setFunction = setAbilities
        this.type = 'abilities'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-abilities-form`,
            template: CONSTANTS.ABILITIES.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.abilities.title')
        })
    }

    _getInnerHtml (data) {
        return `<i class="flex0 fas fa-grip-lines"></i>
            <input id="visible" name="${data.key}.visible" type="checkbox" checked>
            <div class="custom-dnd5e-col-group flexcol">
                <input id="key" name="${data.key}.key" type="hidden" value="${data.key}">
                <input id="fullKey" name="${data.key}.fullKey" type="hidden" value="${data.key}">
                <input id="system" name="${data.key}.system" type="hidden" value="false">
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.label')}</label>
                    <div class="form-fields">
                        <input id="label" name="${data.key}.label" type="text" value="">
                    </div>
                </div>
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.abbreviation')}</label>
                    <div class="form-fields">
                        <input id="abbreviation" name="${data.key}.abbreviation" type="text" value="">
                    </div>
                </div>
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">Include for ASI</label>
                    <div class="form-fields">
                        <input id="improvement" name="${data.key}.improvement" type="checkbox">
                    </div>
                </div>
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.type')}</label>
                    <div class="form-fields">
                        <select id="type" name="${data.key}.type">
                            <option value="mental">${game.i18n.localize('CUSTOM_DND5E.mental')}</option>
                            <option value="fraction">${game.i18n.localize('CUSTOM_DND5E.physical')}</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.reference')}</label>
                    <div class="form-fields">
                        <input id="reference" name="${data.key}.reference" type="text" value="">
                    </div>
                </div>
            </div>
            <button type="button" data-tooltip="${game.i18n.localize('CUSTOM_DND5E.form.button.delete.tooltip')}" data-action="delete" class="flex0 delete-button">
                <i class="fas fa-xmark"></i>
            </button>
            <input id="delete" name="${data.key}.delete" type="hidden" value="false">`
    }
}

export class ActorSizesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.ACTOR_SIZES.SETTING.KEY
        this.setFunction = setActorSizes
        this.type = 'actorSizes'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-actor-sizes-form`,
            template: CONSTANTS.ACTOR_SIZES.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.actorSizes.title')
        })
    }

    _getInnerHtml (data) {
        return `<i class="custom-dnd5e-drag flex0 fas fa-grip-lines" draggable="true"></i>
                <input id="visible" name="${data.key}.visible" type="checkbox" data-tooltip="${game.i18n.localize('CUSTOM_DND5E.form.checkbox.visible.tooltip')}" checked>
                <div class="custom-dnd5e-col-group flexcol">
                    <input id="key" name="${data.key}.key" type="hidden" value="${data.key}">
                    <input id="system" name="${data.key}.system" type="hidden" value="false">
                    <div class="form-group">
                        <label class="flex1" style="min-width:80px; max-width:120px;">${game.i18n.localize('CUSTOM_DND5E.label')}</label>
                        <div class="form-fields">
                            <input id="label" name="${data.key}.label" type="text">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="flex1" style="min-width:80px; max-width:120px;">${game.i18n.localize('CUSTOM_DND5E.abbreviation')}</label>
                        <div class="form-fields">
                            <input id="abbreviation" name="${data.key}.abbreviation" type="text">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="flex1" style="min-width:80px; max-width:120px;">${game.i18n.localize('CUSTOM_DND5E.tokenSize')}</label>
                        <div class="form-fields">
                            <input id="token" name="${data.key}.token" type="number" step="0.05">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="flex1" style="min-width:80px; max-width:120px;">${game.i18n.localize('CUSTOM_DND5E.dynamicTokenScale')}</label>
                        <div class="form-fields">
                            <input id="dynamic-token-scale" name="${data.key}.dynamicTokenScale" type="number" step="0.05">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="flex1" style="min-width:80px; max-width:120px;">${game.i18n.localize('CUSTOM_DND5E.capacityMultiplier')}</label>
                        <div class="form-fields">
                            <input id="capacity-multiplier" name="${data.key}.capacityMultiplier" type="number" step="0.05">
                        </div>
                    </div>
                </div>
                <button type="button" data-tooltip="${game.i18n.localize('CUSTOM_DND5E.form.button.delete.tooltip')}" data-action="delete" class="flex0 delete-button">
                    <i class="fas fa-xmark"></i>
                </button>
                <input id="delete" name="${data.key}.delete" type="hidden" value="false">`
    }
}

export class ArmorTypesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.ARMOR_TYPES.SETTING.KEY
        this.setFunction = setArmorTypes
        this.type = 'armorTypes'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-armor-types-form`,
            title: game.i18n.localize('CUSTOM_DND5E.form.armorTypes.title')
        })
    }
}

export class CurrencyForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.CURRENCY.SETTING.KEY
        this.setFunction = setCurrency
        this.type = 'currency'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-currency-form`,
            template: CONSTANTS.CURRENCY.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.currency.title')
        })
    }

    _getInnerHtml (data) {
        return `<i class="flex0 fas fa-grip-lines"></i>
        <input id="visible" name="${data.key}.visible" type="checkbox" checked>
        <div class="fields flexrow">
            <input id="key" name="${data.key}.key" type="hidden" value="${data.key}">
            <input id="system" name="${data.key}.system" type="hidden" value="false">
            <div class="field">
                <label>${game.i18n.localize('CUSTOM_DND5E.label')}</label>
                <input id="label" name="${data.key}.label" type="text" value="">
            </div>
            <div class="field">
                <label>${game.i18n.localize('CUSTOM_DND5E.abbreviation')}</label>
                <input id="abbreviation" name="${data.key}.abbreviation" type="text" value="">
            </div>   
            <div class="field">
                <label>${game.i18n.localize('CUSTOM_DND5E.conversion')}</label>
                <input id="conversion" name="${data.key}.conversion" type="number" value="">
            </div>
        </div>
        <button type="button" data-tooltip="Delete" data-action="delete" class="flex0 delete-button">
        <i class="fas fa-xmark"></i>
        </button>
        <input id="delete" name="${data.key}.delete" type="hidden" value="false"`
    }
}

export class DamageTypesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.DAMAGE_TYPES.SETTING.KEY
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
        return `<i class="flex0 fas fa-grip-lines"></i>
        <input id="visible" name="${data.key}.visible" type="checkbox" checked>
        <div class="fields flexrow">
            <input id="parentKey" name="${data.key}.parentKey" type="hidden" value="">
            <input id="key" name="${data.key}.key" type="hidden" value="${data.key}">
            <input id="system" name="${data.key}.system" type="hidden" value="false">
            <div class="field flex1">
                <label>${game.i18n.localize('CUSTOM_DND5E.label')}</label>
                <input id="label" name="${data.key}.label" type="text" value="">
            </div>
            <div class="field flex2">
                <label>${game.i18n.localize('CUSTOM_DND5E.icon')}</label>
                <input id="icon" name="${data.key}.icon" type="text" value="">
            </div>   
            <div class="field flex2">
                <label>${game.i18n.localize('CUSTOM_DND5E.reference')}</label>
                <input id="reference" name="${data.key}.reference" type="text" value="">
            </div>
        </div>
        <button type="button" data-tooltip="Delete" data-action="delete" class="flex0 delete-button">
        <i class="fas fa-xmark"></i>
        </button>
        <input id="delete" name="${data.key}.delete" type="hidden" value="false"`
    }
}

export class ItemActionTypesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.ITEM_ACTION_TYPES.SETTING.KEY
        this.setFunction = setItemActionTypes
        this.type = 'itemActionTypes'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-item-activation-cost-types-form`,
            title: game.i18n.localize('CUSTOM_DND5E.form.itemActivationCostTypes.title')
        })
    }
}

export class ItemActivationCostTypesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.ITEM_ACTIVATION_COST_TYPES.SETTING.KEY
        this.setFunction = setItemActivationCostTypes
        this.type = 'abilityActivationCostTypes'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-item-activation-cost-types-form`,
            title: game.i18n.localize('CUSTOM_DND5E.form.itemActivationCostTypes.title')
        })
    }
}

export class LanguagesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.LANGUAGES.SETTING.KEY
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
        this.requiresReload = false
        this.settingKey = CONSTANTS.SENSES.SETTING.KEY
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

export class SkillsForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = true
        this.settingKey = CONSTANTS.SKILLS.SETTING.KEY
        this.setFunction = setSkills
        this.type = 'skills'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-skills-form`,
            template: CONSTANTS.SKILLS.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.skills.title')
        })
    }

    _getInnerHtml (data) {
        return `<i class="flex0 fas fa-grip-lines"></i>
            <input id="visible" name="${data.key}.visible" type="checkbox" checked>
            <div class="custom-dnd5e-col-group flexcol">
                <input id="key" name="${data.key}.key" type="hidden" value="${data.key}">
                <input id="fullKey" name="${data.key}.fullKey" type="hidden" value="${data.key}">
                <input id="system" name="${data.key}.system" type="hidden" value="false">
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.label')}</label>
                    <div class="form-fields">
                        <input id="label" name="${data.key}.label" type="text" value="">
                    </div>
                </div>
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.ability')}</label>
                    <div class="form-fields">
                        <input id="ability" name="${data.key}.ability" type="text" value="">
                    </div>
                </div>
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.icon')}</label>
                    <div class="form-fields">
                        <input id="icon" name="${data.key}.icon" type="text" value="">
                    </div>
                </div>
                <div class="form-group">
                    <label class="flex1" style="min-width:80px; max-width:100px;">${game.i18n.localize('CUSTOM_DND5E.reference')}</label>
                    <div class="form-fields">
                        <input id="reference" name="${data.key}.reference" type="text" value="">
                    </div>
                </div>
            </div>
            <button type="button" data-tooltip="${game.i18n.localize('CUSTOM_DND5E.form.button.delete.tooltip')}" data-action="delete" class="flex0 delete-button">
                <i class="fas fa-xmark"></i>
            </button>
            <input id="delete" name="${data.key}.delete" type="hidden" value="false">`
    }
}
