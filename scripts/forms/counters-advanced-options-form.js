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
        const item = document.createElement('li')
        item.setAttribute('data-key', randomID())
        item.classList.add(itemClass, 'flexrow')

        const iGrip = document.createElement('i')
        iGrip.classList.add('custom-dnd5e-drag', 'flex0', 'fas', 'fa-grip-lines')
        item.appendChild(iGrip)

        const divFormGroups = document.createElement('div')
        divFormGroups.classList.add('custom-dnd5e-col-group', 'flexcol')
        item.appendChild(divFormGroups)

        const divFormGroupTrigger = appendFormGroup(divFormGroups)
        appendFormGroupLabel(divFormGroupTrigger, game.i18n.localize('CUSTOM_DND5E.trigger'))

        const divFormFieldsTrigger = appendFormFields(divFormGroupTrigger)
        el.trigger = appendSelect(divFormFieldsTrigger, 'trigger', 'trigger')
        appendSelectOption(el.trigger, 'counterValue', game.i18n.localize('CUSTOM_DND5E.form.counters.triggers.trigger.choices.counterValue'))
        appendSelectOption(el.trigger, 'halfHp', game.i18n.localize('CUSTOM_DND5E.form.counters.triggers.trigger.choices.halfHp'))
        appendSelectOption(el.trigger, 'zeroHp', game.i18n.localize('CUSTOM_DND5E.form.counters.triggers.trigger.choices.zeroHp'))
        appendSelectOption(el.trigger, 'zeroHpCombatEnd', game.i18n.localize('CUSTOM_DND5E.form.counters.triggers.trigger.choices.zeroHpCombatEnd'))
        // appendSelectOption(el.trigger, 'roll1', game.i18n.localize('CUSTOM_DND5E.form.counters.triggers.trigger.choices.roll1'))
        // appendSelectOption(el.trigger, 'roll20', game.i18n.localize('CUSTOM_DND5E.form.counters.triggers.trigger.choices.roll20'))

        el.triggerValueGroup = appendFormGroup(divFormGroups)
        appendFormGroupLabel(el.triggerValueGroup, game.i18n.localize('CUSTOM_DND5E.triggerValue'))
        const triggerValueFormFields = appendFormFields(el.triggerValueGroup)
        el.triggerValue = document.createElement('input')
        el.triggerValue.setAttribute('id', 'trigger-value')
        el.triggerValue.setAttribute('name', 'triggerValue')
        el.triggerValue.setAttribute('type', 'number')
        triggerValueFormFields.appendChild(el.triggerValue)

        const actionFormGroup = appendFormGroup(divFormGroups)
        appendFormGroupLabel(actionFormGroup, game.i18n.localize('CUSTOM_DND5E.action'))

        const actionFormFields = appendFormFields(actionFormGroup)
        el.action = appendSelect(actionFormFields, 'action', 'action')
        if (this.type === 'checkbox') {
            appendSelectOption(el.action, 'check', game.i18n.localize('CUSTOM_DND5E.check'))
            appendSelectOption(el.action, 'uncheck', game.i18n.localize('CUSTOM_DND5E.uncheck'))
        } else {
            appendSelectOption(el.action, 'dead', game.i18n.localize('CUSTOM_DND5E.dead'))
            el.actionIncrease = appendSelectOption(el.action, 'increase', game.i18n.localize('CUSTOM_DND5E.increase'), true)
            el.actionDecrease = appendSelectOption(el.action, 'decrease', game.i18n.localize('CUSTOM_DND5E.decrease'), true)
        }

        el.actionValueGroup = appendFormGroup(divFormGroups)
        el.actionValueGroup.classList.add('hidden')
        appendFormGroupLabel(el.actionValueGroup, game.i18n.localize('CUSTOM_DND5E.actionValue'))
        const actionFormFieldsValue = appendFormFields(el.actionValueGroup)
        el.actionValue = document.createElement('input')
        el.actionValue.setAttribute('id', 'action-value')
        el.actionValue.setAttribute('name', 'actionValue')
        el.actionValue.setAttribute('type', 'number')
        actionFormFieldsValue.appendChild(el.actionValue)

        appendDeleteButton(item, 'delete')

        // el.trigger.addEventListener('change', () => this.#onChangeTrigger(el))
        // el.action.addEventListener('change', () => this.#onChangeAction(el))
        // if (this.items[0]) { iGrip.addEventListener('dragstart', this.items[0].ondragstart) } // Fix this for empty list
        // item.addEventListener('dragleave', this._onDragLeave)

        list.appendChild(item)

        scrollable && (scrollable.scrollTop = scrollable.scrollHeight)
    }

    #onChangeTrigger (el) {
        const allowed = ['counterValue']
        if (el.trigger.value === 'counterValue') {
            el.actionIncrease.classList.add('hidden')
            el.actionDecrease.classList.add('hidden')
            el.triggerValueGroup.classList.remove('hidden')
        }
        if (!allowed.includes(el.trigger.value)) {
            el.actionIncrease.classList.remove('hidden')
            el.actionDecrease.classList.remove('hidden')
            el.triggerValueGroup.classList.add('hidden')
        }
    }

    #onChangeAction (el) {
        const allowed = ['increase', 'decrease']
        el.actionValueGroup.classList.remove('hidden')
        if (!allowed.includes(el.action.value)) {
            el.actionValueGroup.classList.add('hidden')
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
