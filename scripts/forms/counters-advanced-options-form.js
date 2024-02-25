import { CONSTANTS, MODULE } from '../constants.js'
import { appendDeleteButton, appendFormFields, appendFormGroup, appendFormGroupLabel, appendSelect, appendSelectOption, getFlag, setFlag, unsetFlag, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

const id = CONSTANTS.COUNTERS.ID
const form = `${id}-advanced-options-form`
const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

export class CountersAdvancedOptionsForm extends CustomDnd5eForm {
    constructor (args) {
        super(args)

        this.countersForm = args.countersForm
        this.key = args.key
        this.actorType = args.actorType
        this.setting = args.setting
        this.type = args.type
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-${form}`,
            template: `modules/${MODULE.ID}/templates/${form}.hbs`,
            title: game.i18n.localize(`CUSTOM_DND5E.form.${id}.triggers.title`)
        })
    }

    async getData () {
        return {
            key: this.key,
            viewRole: this.setting[this.key]?.viewRole || 1,
            editRole: this.setting[this.key]?.editRole || 1,
            max: this.setting[this.key]?.max,
            type: this.setting[this.key]?.type || this.type,
            triggers: this.setting[this.key]?.triggers || []
        }
    }

    activateListeners (html) {
        super.activateListeners(html)

        const items = html[0].querySelectorAll('.custom-dnd5e-item')

        items.forEach(item => {
            const el = {}
            el.trigger = item.querySelector('#trigger')
            el.triggerValueGroup = item.querySelector('#trigger-value').closest('.form-group')
            // el.trigger.addEventListener('change', () => { this.#onChangeTrigger(el) })

            el.action = item.querySelector('#action')
            el.actionIncrease = el.action.querySelector('#increase')
            el.actionDecrease = el.action.querySelector('#decrease')
            el.actionValueGroup = item.querySelector('#action-value').closest('.form-group')
            // el.action.addEventListener('change', () => { this.#onChangeAction(el) })
        })
    }

    async _handleButtonClick (event) {
        event.preventDefault()
        const clickedElement = $(event.currentTarget)
        const key = clickedElement.parents('li')?.data()?.key
        const action = clickedElement.data().action
        switch (action) {
        case 'delete': {
            await this._deleteItem(key)
            break
        }
        case 'new': {
            await this._createItem()
            break
        }
        }
    }

    async _createItem () {
        const el = {}
        const list = this.element[0].querySelector(listClassSelector)
        const scrollable = list.closest('.scrollable')

        const key = randomID()
        const type = this.setting[this.key]?.type || this.type
        const trigger = (type === 'checkbox') ? 'zeroHp' : 'counterValue'
        const action = (type === 'checkbox') ? 'check' : 'dead'

        const template = await this._getHtml({ type, triggers: [{ action, trigger, key, type }] })

        list.insertAdjacentHTML('beforeend', template)

        const item = list.querySelector(`[data-key="${key}"]`)
        const dragElement = item.querySelector('.custom-dnd5e-drag')
        el.trigger = item.querySelector('#trigger')
        el.triggerValueGroup = item.querySelector('#trigger-value').closest('.form-group')
        el.action = item.querySelector('#action')
        el.actionValueGroup = item.querySelector('#action-value').closest('.form-group')
        el.actionIncrease = el.action.querySelector('#increase')
        el.actionDecrease = el.action.querySelector('#decrease')

        item.addEventListener('dragend', this._onDragEnd.bind(this))
        item.addEventListener('dragleave', this._onDragLeave.bind(this))
        item.addEventListener('dragover', this._onDragOver.bind(this))
        item.addEventListener('drop', this._onDrop.bind(this))
        dragElement.addEventListener('dragstart', this._onDragStart.bind(this))
        el.trigger.addEventListener('change', () => this.#onChangeTrigger(el))
        el.action.addEventListener('change', () => this.#onChangeAction(el))

        scrollable && (scrollable.scrollTop = scrollable.scrollHeight)
    }

    async _getHtml (data) {
        const template = await renderTemplate(CONSTANTS.COUNTERS.TEMPLATE.ADVANCED_OPTIONS_LIST, data)
        return template
    }

    #onChangeTrigger (el) {
        const allowed = ['counterValue']

        if (el.trigger.value === 'counterValue') {
            el.actionIncrease?.classList.add('hidden')
            el.actionDecrease?.classList.add('hidden')
            el.triggerValueGroup?.classList.remove('hidden')
            const type = this.setting[this.key]?.type || this.type
            el.action.value = (type === 'checkbox') ? 'check' : 'dead'
        }
        if (!allowed.includes(el.trigger.value)) {
            el.actionIncrease?.classList.remove('hidden')
            el.actionDecrease?.classList.remove('hidden')
            el.triggerValueGroup?.classList.add('hidden')
        }
    }

    #onChangeAction (el) {
        const allowed = ['increase', 'decrease']
        el.actionValueGroup?.classList.remove('hidden')
        if (!allowed.includes(el.action.value)) {
            el.actionValueGroup?.classList.add('hidden')
        }
    }

    async _updateObject (event, formData) {
        const arr = []
        const ints = ['editRole', 'viewRole']
        const triggerProperties = ['action', 'actionValue', 'delete', 'trigger', 'triggerValue']

        triggerProperties.forEach(property => {
            if (!Array.isArray(formData[property])) {
                formData[property] = [formData[property]]
            }
        })

        // Set properties in this.setting
        let oldKey = null
        let newKey = null

        Object.entries(formData).forEach(([key, value]) => {
            if (Array.isArray(value)) { return }
            if (key.split('.').pop() === 'key') {
                oldKey = key.split('.')[0]
                newKey = value
            }
            if (ints.includes(key.split('.').pop())) { value = parseInt(value) }
            setProperty(this.setting, key, value)
        })

        // Create new key and delete old key while keeping order of counters
        if (oldKey !== newKey) {
            this.setting[newKey] = foundry.utils.deepClone(this.setting[oldKey])

            const data = {}

            Object.keys(this.setting).forEach(key => {
                const keyToUse = (key === oldKey) ? newKey : key
                data[keyToUse] = foundry.utils.deepClone(this.setting[key])
            })

            this.setting = data

            game.actors.forEach(actor => {
                const flag = getFlag(actor, oldKey)
                if (typeof flag !== 'undefined') {
                    setFlag(actor, newKey, flag)
                    unsetFlag(actor, oldKey)
                }
            })

            this.key = newKey
        }

        // Map triggers into objects
        const triggers = formData.action.map((_, index) => ({
            action: formData.action[index],
            actionValue: formData.actionValue[index],
            trigger: formData.trigger[index],
            triggerValue: formData.triggerValue[index]
        })).filter((_, index) => formData.delete[index] !== 'true')

        this.setting[this.key].triggers = triggers

        const settingKey = (this.actorType === 'character')
            ? CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY
            : CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY

        await setSetting(settingKey, this.setting)

        this.countersForm.render(true)
    }

    /**
     * Open the form
     * @param {object} args
     **/
    static async open (args) {
        const form = new CountersAdvancedOptionsForm(args)
        form.render(true)
    }
}
