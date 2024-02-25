import { CONSTANTS, MODULE } from '../constants.js'
import { deleteProperty, unsetFlag, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { CountersAdvancedOptionsForm } from './counters-advanced-options-form.js'

const id = CONSTANTS.COUNTERS.ID
const form = `${id}-form`
const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

export class CountersForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-${form}`,
            template: `modules/${MODULE.ID}/templates/${form}.hbs`,
            title: game.i18n.localize(`CUSTOM_DND5E.form.${id}.title`),
            tabs: [{
                navSelector: '.tabs',
                contentSelector: 'form',
                initial: 'characters'
            }]
        })
    }

    async getData () {
        this.characterCountersSetting = getSetting(CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY) || {}
        this.npcCountersSetting = getSetting(CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY) || {}
        return {
            characterCounters: this.characterCountersSetting,
            npcCounters: this.npcCountersSetting
        }
    }

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _handleButtonClick (event) {
        event.preventDefault()
        const clickedElement = $(event.currentTarget)
        const action = clickedElement.data().action
        const key = clickedElement.parents('li')?.data()?.key
        const type = clickedElement.parent().find('#type').val()
        const actorType = clickedElement.parent().find('#actorType').val()
        switch (action) {
        case 'delete': {
            await this._deleteItem(key)
            break
        }
        case 'new': {
            await this._createItem()
            break
        }
        case 'copy-property': {
            await this._copyProperty(key, type)
            break
        }
        case 'advanced-options': {
            const setting = (actorType === 'character') ? this.characterCountersSetting : this.npcCountersSetting
            const args = { countersForm: this, key, actorType, setting, type }
            await CountersAdvancedOptionsForm.open(args)
            break
        }
        }
    }

    async _createItem () {
        const activeTab = this.element[0].querySelector('.tab.active')
        const actorType = activeTab.dataset.actorType
        const list = activeTab.querySelector(listClassSelector)
        const scrollable = list.closest('.scrollable')

        const key = randomID()
        const data = { counters: { [key]: { actorType } } }

        const template = await renderTemplate(CONSTANTS.COUNTERS.TEMPLATE.LIST, data)

        list.insertAdjacentHTML('beforeend', template)

        const item = list.querySelector(`[data-key="${key}"]`)

        if (this.items[0]) { item.addEventListener('dragstart', this.items[0].ondragstart) } // Fix this for empty list
        item.addEventListener('dragleave', this._onDragLeave)

        scrollable && (scrollable.scrollTop = scrollable.scrollHeight)
    }

    async _copyProperty (key, type) {
        const property = `@flags.${MODULE.ID}.${key}${(type === 'successFailure') ? '.success' : (type === 'fraction') ? '.value' : ''}`
        game.clipboard.copyPlainText(property)
        ui.notifications.info(game.i18n.format('CUSTOM_DND5E.form.counters.copyProperty.message', { property }))
    }

    async _updateObject (event, formData) {
        const ignore = ['actorType', 'delete', 'key']

        // Get list of properties to delete
        const deleteKeys = Object.entries(formData)
            .filter(([key, value]) => key.split('.').pop() === 'delete' && value === 'true')
            .map(([key, _]) => key.split('.').slice(0, -1).join('.'))

        // Delete properties from this.setting
        deleteKeys.forEach(key => {
            const setting = (formData[`${key}.actorType`] === 'character') ? this.characterCountersSetting : this.npcCountersSetting
            deleteProperty(setting, key)
            for (const actor of game.actors) {
                unsetFlag(actor, key)
            }
        })

        // Delete properties from formData
        Object.keys(formData).forEach(key => {
            if (deleteKeys.includes(key.split('.').slice(0, -1).join('.'))) {
                delete formData[key]
            }
        })

        // Set properties in this.setting
        Object.entries(formData).forEach(([key, value]) => {
            if (ignore.includes(key.split('.').pop())) { return }
            const primaryKey = key.split('.').slice(0, -1).join('.')
            const setting = (formData[`${primaryKey}.actorType`] === 'character') ? this.characterCountersSetting : this.npcCountersSetting
            setProperty(setting, key, value)
        })

        await Promise.all([
            setSetting(CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY, this.characterCountersSetting),
            setSetting(CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY, this.npcCountersSetting)
        ])
    }
}
