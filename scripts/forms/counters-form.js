import { CONSTANTS, MODULE } from '../constants.js'
import { deleteProperty, unsetFlag, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'
import { CountersAdvancedOptionsForm } from './counters-advanced-options-form.js'

const id = CONSTANTS.COUNTERS.ID
const form = `${id}-form`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`
function getSelects () {
    return {
        type: {
            choices: {
                checkbox: 'CUSTOM_DND5E.checkbox',
                fraction: 'CUSTOM_DND5E.fraction',
                number: 'CUSTOM_DND5E.number',
                successFailure: 'CUSTOM_DND5E.successFailure'
            }
        }
    }
}

export class CountersForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
    }

    static DEFAULT_OPTIONS = {
        actions: {
            new: CountersForm.createItem,
            'copy-property': CountersForm.copyProperty,
            'advanced-options': CountersForm.advancedOptions
        },
        form: {
            handler: CountersForm.submit
        },
        id: `${MODULE.ID}-${form}`,
        window: {
            title: `CUSTOM_DND5E.form.${id}.title`
        }
    }

    static PARTS = {
        form: {
            template: `modules/${MODULE.ID}/templates/${form}.hbs`
        }
    }

    async _prepareContext () {
        this.settings = {
            character: getSetting(CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY) || {},
            group: getSetting(CONSTANTS.COUNTERS.SETTING.GROUP_COUNTERS.KEY) || {},
            item: getSetting(CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY) || {},
            npc: getSetting(CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY) || {}
        }
        return {
            settings: this.settings,
            selects: getSelects()
        }
    }

    static async createItem () {
        const activeTab = this.element.querySelector('.tab.active')
        const actorType = activeTab.dataset.actorType
        const list = activeTab.querySelector(listClassSelector)
        const scrollable = list.closest('.scrollable')

        const key = foundry.utils.randomID()
        const data = {
            actorType,
            counters: { [key]: {} },
            selects: getSelects()
        }

        const template = await renderTemplate(CONSTANTS.COUNTERS.TEMPLATE.LIST, data)

        list.insertAdjacentHTML('beforeend', template)

        const item = list.querySelector(`[data-key="${key}"]`)

        if (this.items[0]) { item.addEventListener('dragstart', this.items[0].ondragstart) } // Fix this for empty list
        item.addEventListener('dragleave', this._onDragLeave)

        scrollable && (scrollable.scrollTop = scrollable.scrollHeight)
    }

    static async copyProperty (event, target) {
        const item = target.closest('.custom-dnd5e-item')
        if (!item) return

        const key = item.dataset.key
        if (!key) return

        const type = item.querySelector('#type').value

        const property = `@flags.${MODULE.ID}.${key}${(type === 'successFailure') ? '.success' : (type === 'fraction') ? '.value' : ''}`
        game.clipboard.copyPlainText(property)
        ui.notifications.info(game.i18n.format('CUSTOM_DND5E.form.counters.copyProperty.message', { property }))
    }

    static async advancedOptions (event, target) {
        const item = target.closest('.custom-dnd5e-item')
        if (!item) return

        const key = item.dataset.key
        if (!key) return

        const label = item.querySelector('#label').value
        const type = item.querySelector('#type').value
        const activeTab = this.element.querySelector('.tab.active')
        const actorType = activeTab.dataset.actorType
        const setting = this.settings[actorType]
        const args = { countersForm: this, data: { key, actorType, label, type }, setting }
        await CountersAdvancedOptionsForm.open(args)
    }

    static async submit (event, form, formData) {
        const ignore = ['actorType', 'delete', 'key']

        // Get list of properties to delete
        const deleteKeys = Object.entries(formData.object)
            .filter(([key, value]) => key.split('.').pop() === 'delete' && value === 'true')
            .map(([key, _]) => key.split('.').slice(0, -1).join('.'))

        // Delete properties from this.setting
        deleteKeys.forEach(deleteKey => {
            const parts = deleteKey.split('.')
            const actorType = parts.slice(0, 1).join('.')
            const key = parts.pop()
            const setting = this.settings[actorType]
            deleteProperty(setting, key)
            for (const actor of game.actors) {
                unsetFlag(actor, key)
            }
        })

        // Delete properties from formData
        Object.keys(formData.object).forEach(key => {
            if (deleteKeys.includes(key.split('.').slice(0, -1).join('.'))) {
                delete formData.object[key]
            }
        })

        // Set properties in this.setting
        Object.entries(formData.object).forEach(([key, value]) => {
            if (ignore.includes(key.split('.').pop())) { return }
            const arr = key.split('.')
            const actorType = arr.slice(0, 1).join('.')
            const property = arr.slice(1, 3).join('.')
            const setting = this.settings[actorType]
            foundry.utils.setProperty(setting, property, value)
        })

        await Promise.all([
            setSetting(CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY, this.settings.character),
            setSetting(CONSTANTS.COUNTERS.SETTING.GROUP_COUNTERS.KEY, this.settings.group),
            setSetting(CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY, this.settings.item),
            setSetting(CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY, this.settings.npc)
        ])
    }
}
