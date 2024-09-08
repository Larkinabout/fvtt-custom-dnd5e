import { CONSTANTS, MODULE } from '../constants.js'
import { deleteProperty, getFlag, setFlag, unsetFlag } from '../utils.js'
import { CountersForm } from './counters-form.js'

const form = 'counters-form-individual'
const listClass = `${MODULE.ID}-list`

export class CountersFormIndividual extends CountersForm {
    constructor (entity) {
        super(entity)
        this.entity = entity
    }

    static DEFAULT_OPTIONS = {
    /*      actions: {
            new: CountersForm.createItem,
        }, */
        form: {
            handler: CountersFormIndividual.submit
        },
        id: `${MODULE.ID}-${form}`,
        window: {
            title: 'CUSTOM_DND5E.form.counters.title'
        }
    }

    static PARTS = {
        form: {
            template: `modules/${MODULE.ID}/templates/${form}.hbs`
        }
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

    async _prepareContext () {
        this.counters = getFlag(this.entity, 'counters') || {}
        return {
            counters: this.counters,
            selects: this.#getSelects()
        }
    }

    /* async _handleButtonClick (event) {
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
    } */

  /*   async _createItem () {
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
    } */

    static async submit (event, form, formData) {
        const ignore = ['actorType', 'delete', 'key']

        // Get list of properties to delete
        const deleteKeys = Object.entries(formData.object)
            .filter(([key, value]) => key.split('.').pop() === 'delete' && value === 'true')
            .map(([key, _]) => key.split('.').slice(0, -1).join('.'))

        // Delete properties from this.setting
        deleteKeys.forEach(key => {
            const setting = this.counters
            deleteProperty(setting, key)
        })

        // Delete properties from formData
        Object.keys(formData.object).forEach(key => {
            if (deleteKeys.includes(key.split('.').slice(0, -1)[0])) {
                delete formData.object[key]
            }
        })

        // Set properties in this.setting
        Object.entries(formData.object).forEach(([key, value]) => {
            if (ignore.includes(key.split('.').pop())) { return }
            foundry.utils.setProperty(this.counters, key, value)
        })

        await unsetFlag(this.entity, 'counters')
        await setFlag(this.entity, 'counters', this.counters)
    }
}
