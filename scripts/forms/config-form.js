import { CONSTANTS, MODULE } from '../constants.js'
import { Logger, deleteProperty, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { setConfig as setAbilities } from '../abilities.js'
import { setConfig as setArmorCalculations } from '../armor-calculations.js'
import { setConfig as setArmorIds } from '../armor-ids.js'
import { setConfig as setArmorTypes } from '../armor-types.js'
import { setConfig as setActorSizes } from '../actor-sizes.js'
import { setConfig as setCurrency } from '../currency.js'
import { setConfig as setDamageTypes } from '../damage-types.js'
import { setConfig as setItemActionTypes } from '../item-action-types.js'
import { setConfig as setItemActivationCostTypes } from '../item-activation-cost-types.js'
import { setConfig as setItemRarity } from '../item-rarity.js'
import { setConfig as setLanguages } from '../languages.js'
import { setConfig as setSenses } from '../senses.js'
import { setConfig as setSkills } from '../skills.js'
import { setConfig as setSpellSchools } from '../spell-schools.js'
import { setConfig as setToolIds } from '../tool-ids.js'
import { setConfig as setWeaponIds } from '../weapon-ids.js'

const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

class ConfigForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: CONSTANTS.CONFIG.TEMPLATE.FORM
        })
    }

    async getData () {
        this.config = foundry.utils.deepClone(CONFIG.DND5E[this.type])
        this.setting = getSetting(this.settingKey)
        const data = foundry.utils.mergeObject(this.config, this.setting)

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

        const context = { items: data }
        const selects = this._getSelects()
        if (selects) context.selects = selects

        return context
    }

    _getSelects () {
        return null
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

        const key = foundry.utils.randomID()

        const template = await this._getHtml({ items: { [key]: { fullKey: key, system: false, visible: true } } })

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
        const template = await renderTemplate(CONSTANTS.CONFIG.TEMPLATE.LIST, data)
        return template
    }

    async _validate (event, formData) {
        const keys = {}

        Object.keys(formData)
            .filter(key => key.split('.').slice(1, 2).pop() === 'key')
            .forEach(key => {
                const num = keys[formData[key]] ?? 0
                keys[formData[key]] = num + 1
            })

        const duplicates = []
        Object.entries(keys).forEach(([key, value]) => {
            if (value > 1) {
                duplicates.push(key)
            }
        })

        if (duplicates.length === 1) {
            Logger.error(`Key '${duplicates.pop()}' already exists`, true)
            return
        } else if (duplicates.length > 1) {
            const keyString = duplicates.join(', ')
            Logger.error(`Keys '${keyString}' already exist`, true)
            return
        }

        this.submit()
    }

    async _updateObject (event, formData) {
        const ignore = ['children', 'delete', 'key', 'parentKey']

        const data = {}
        const keyData = {}
        const changedKeys = {}

        Object.entries(formData).filter(([property, value]) => property.endsWith('key'))
            .forEach(([property, value]) => {
                const propertyParts = property.split('.')
                const propertyPathSuffix = propertyParts.slice(-2, -1)[0]

                if (propertyPathSuffix !== value) { changedKeys[propertyPathSuffix] = value }
            })

        Object.entries(formData).forEach(([property, value]) => {
            const propertyParts = property.split('.')
            propertyParts.forEach((value, index) => {
                if (changedKeys[value]) {
                    propertyParts[index] = changedKeys[value]
                }
            })
            const propertyKey = propertyParts.pop()
            const propertyPath = propertyParts.join('.')

            if (ignore.includes(propertyKey) || formData[`${propertyPath}.delete`] === 'true') return
            if (propertyKey === 'system') {
                if (value === 'true') { return }
                value = false
            }
            foundry.utils.setProperty(data, `${propertyPath}.${propertyKey}`, value)
        })

        if (Object.keys(keyData).length && this.actorProperties) {
            game.actors.forEach(actor => {
                const updateData = {}
                let requiresUpdate = false
                this.actorProperties.forEach(property => {
                    const oldData = foundry.utils.getProperty(actor, property)
                    if (!Array.isArray(oldData) && !(oldData instanceof Set)) return
                    const newData = []
                    oldData.forEach(value => {
                        if (keyData[value]) {
                            requiresUpdate = true
                        }
                        newData.push((keyData[value] || value))
                    })
                    updateData[property] = newData
                })
                if (requiresUpdate) {
                    actor.update(updateData)
                }
            })
        }

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
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-abilities-form`,
            template: CONSTANTS.ABILITIES.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.abilities.title')
        })
    }

    _getSelects () {
        return {
            type: {
                choices: {
                    mental: 'CUSTOM_DND5E.mental',
                    physical: 'CUSTOM_DND5E.physical'
                }
            }
        }
    }

    async _getHtml (data) {
        const selects = this._getSelects()
        if (selects) data.selects = selects

        const template = await renderTemplate(CONSTANTS.ABILITIES.TEMPLATE.LIST, data)
        return template
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
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-actor-sizes-form`,
            template: CONSTANTS.ACTOR_SIZES.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.actorSizes.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.ACTOR_SIZES.TEMPLATE.LIST, data)
        return template
    }
}

export class ArmorCalculationsForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.ARMOR_CALCULATIONS.SETTING.KEY
        this.setFunction = setArmorCalculations
        this.type = 'armorClasses'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-armor-calculations-form`,
            template: CONSTANTS.ARMOR_CALCULATIONS.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.armorCalculations.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.ARMOR_CALCULATIONS.TEMPLATE.LIST, data)
        return template
    }
}

export class ArmorIdsForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = true
        this.settingKey = CONSTANTS.ARMOR_IDS.SETTING.KEY
        this.setFunction = setArmorIds
        this.type = 'armorIds'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-armor-ids-form`,
            template: CONSTANTS.ARMOR_IDS.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.armorIds.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.ARMOR_IDS.TEMPLATE.LIST, data)
        return template
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
        return foundry.utils.mergeObject(super.defaultOptions, {
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
        this.type = 'currencies'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-currency-form`,
            template: CONSTANTS.CURRENCY.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.currency.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.CURRENCY.TEMPLATE.LIST, data)
        return template
    }
}

export class DamageTypesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.DAMAGE_TYPES.SETTING.KEY
        this.setFunction = setDamageTypes
        this.type = 'damageTypes'
        this.actorProperties = ['system.traits.di.value', 'system.traits.dr.value', 'system.traits.dv.value']
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-damage-types-form`,
            template: CONSTANTS.DAMAGE_TYPES.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.damageTypes.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.DAMAGE_TYPES.TEMPLATE.LIST, data)
        return template
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
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-item-action-types-form`,
            title: game.i18n.localize('CUSTOM_DND5E.form.itemActionTypes.title')
        })
    }
}

export class ItemActivationCostTypesForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.ITEM_ACTIVATION_COST_TYPES.SETTING.KEY
        this.setFunction = setItemActivationCostTypes
        this.type = 'abilityActivationTypes'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-item-activation-cost-types-form`,
            title: game.i18n.localize('CUSTOM_DND5E.form.itemActivationCostTypes.title')
        })
    }
}

export class ItemRarityForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.ITEM_RARITY.SETTING.KEY
        this.setFunction = setItemRarity
        this.type = 'itemRarity'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-item-rarity-form`,
            title: game.i18n.localize('CUSTOM_DND5E.form.itemRarity.title')
        })
    }
}

export class LanguagesForm extends ConfigForm {
    constructor () {
        super()
        this.nestable = true
        this.requiresReload = false
        this.settingKey = CONSTANTS.LANGUAGES.SETTING.KEY
        this.setFunction = setLanguages
        this.type = 'languages'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
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
        return foundry.utils.mergeObject(super.defaultOptions, {
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
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-skills-form`,
            template: CONSTANTS.SKILLS.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.skills.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.SKILLS.TEMPLATE.LIST, data)
        return template
    }
}

export class SpellSchoolsForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = false
        this.settingKey = CONSTANTS.SPELL_SCHOOLS.SETTING.KEY
        this.setFunction = setSpellSchools
        this.type = 'spellSchools'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-spell-schools-form`,
            template: CONSTANTS.SPELL_SCHOOLS.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.spellSchools.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.SPELL_SCHOOLS.TEMPLATE.LIST, data)
        return template
    }
}

export class ToolIdsForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = true
        this.settingKey = CONSTANTS.TOOL_IDS.SETTING.KEY
        this.setFunction = setToolIds
        this.type = 'toolIds'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-tool-ids-form`,
            template: CONSTANTS.TOOL_IDS.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.toolIds.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.TOOL_IDS.TEMPLATE.LIST, data)
        return template
    }
}

export class WeaponIdsForm extends ConfigForm {
    constructor () {
        super()
        this.requiresReload = true
        this.settingKey = CONSTANTS.WEAPON_IDS.SETTING.KEY
        this.setFunction = setWeaponIds
        this.type = 'weaponIds'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-weapon-ids-form`,
            template: CONSTANTS.WEAPON_IDS.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.weaponIds.title')
        })
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.WEAPON_IDS.TEMPLATE.LIST, data)
        return template
    }
}
