import { CONSTANTS, MODULE } from '../constants.js'
import { deleteProperty, getFlag, setFlag, unsetFlag } from '../utils.js'
import { CountersForm } from './counters-form.js'
import { CountersAdvancedOptionsForm } from './counters-advanced-options-form.js'

const form = 'counters-form-individual'
const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

export class CountersFormIndividual extends CountersForm {
    constructor (entity) {
        super(entity)

        this.entity = entity
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-${form}`,
            template: `modules/${MODULE.ID}/templates/${form}.hbs`,
            title: game.i18n.localize('CUSTOM_DND5E.form.counters.title')
        })
    }

    #getSelects () {
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

    async getData () {
        this.counters = getFlag(this.entity, 'counters') || {}
        return {
            counters: this.counters,
            selects: this.#getSelects()
        }
    }

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _handleButtonClick (event) {
        event.preventDefault()
        const clickedElement = $(event.currentTarget)[0]
        const action = clickedElement.dataset.action
        const item = clickedElement.closest('li')
        const key = item?.dataset.key
        const label = item?.querySelector('#label').value
        const type = item?.querySelector('#type').value
        const actorType = item?.querySelector('#actorType').value
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
            const setting = this.counters
            const args = { countersForm: this, data: { key, actorType, label, type }, setting }
            await CountersAdvancedOptionsForm.open(args)
            break
        }
        }
    }

    async _createItem () {
        const list = this.element[0].querySelector(listClassSelector)
        const scrollable = list.closest('.scrollable')

        const key = foundry.utils.randomID()
        const data = {
            counters: { [key]: {} },
            selects: this.#getSelects()
        }

        const template = await renderTemplate(CONSTANTS.COUNTERS.TEMPLATE.LIST, data)

        list.insertAdjacentHTML('beforeend', template)

        const item = list.querySelector(`[data-key="${key}"]`)

        if (this.items[0]) { item.addEventListener('dragstart', this.items[0].ondragstart) } // Fix this for empty list
        item.addEventListener('dragleave', this._onDragLeave)

        scrollable && (scrollable.scrollTop = scrollable.scrollHeight)
    }

    async _copyProperty (key, type) {
        const property = `@flags.${MODULE.ID}.counters.${key}${(type === 'successFailure') ? '.success' : (type === 'fraction') ? '.value' : ''}`
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
            const setting = this.counters
            deleteProperty(setting, key)
        })

        // Delete properties from formData
        Object.keys(formData).forEach(key => {
            if (deleteKeys.includes(key.split('.').slice(0, -1)[0])) {
                delete formData[key]
            }
        })

        // Set properties in this.setting
        Object.entries(formData).forEach(([key, value]) => {
            if (ignore.includes(key.split('.').pop())) { return }
            foundry.utils.setProperty(this.counters, key, value)
        })

        await unsetFlag(this.entity, 'counters')
        await setFlag(this.entity, 'counters', this.counters)
    }
}
