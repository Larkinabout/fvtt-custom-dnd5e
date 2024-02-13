import { CONSTANTS, MODULE } from '../constants.js'
import { appendDeleteButton, appendFormFields, appendFormGroup, appendFormGroupLabel, appendSelect, appendSelectOption, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

const id = CONSTANTS.COUNTERS.ID
const form = `${id}-advanced-options-form`
const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

export class CountersAdvancedOptionsForm extends CustomDnd5eForm {
    constructor (args) {
        super(args)

        this.key = args.key
        this.actorType = args.actorType
        this.setting = args.setting
        this.type = args.type
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            id: `${MODULE.ID}-${form}`,
            template: `modules/${MODULE.ID}/templates/${form}.hbs`,
            title: game.i18n.localize(`CUSTOM_DND5E.form.${id}.advancedOptions.title`)
        })
    }

    async getData () {
        return {
            key: this.key,
            max: this.setting[this.key]?.max,
            type: this.setting[this.key]?.type || this.type,
            advancedOptions: this.setting[this.key]?.advancedOptions || []
        }
    }

    activateListeners (html) {
        super.activateListeners(html)

        const items = html[0].querySelectorAll('.custom-dnd5e-item')

        items.forEach(item => {
            const trigger = item.querySelector('#trigger')
            const triggerValue = item.querySelector('#trigger-value').closest('.form-group')
            trigger.addEventListener('change', () => { this.#onChangeTrigger(trigger, triggerValue) })

            const action = item.querySelector('#action')
            const actionValue = item.querySelector('#action-value').closest('.form-group')
            action.addEventListener('change', () => { this.#onChangeAction(action, actionValue) })
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
        const list = this.element[0].querySelector(listClassSelector)
        const item = document.createElement('li')
        item.setAttribute('data-key', randomID())
        item.classList.add(itemClass)

        const divItemGroup = document.createElement('div')
        divItemGroup.classList.add('custom-dnd5e-item-group', 'flexrow')
        item.appendChild(divItemGroup)

        const iGrip = document.createElement('i')
        iGrip.classList.add('custom-dnd5e-drag', 'flex0', 'fas', 'fa-grip-lines')
        divItemGroup.appendChild(iGrip)

        const divFormGroups = document.createElement('div')
        divFormGroups.classList.add('flexcol')
        divItemGroup.appendChild(divFormGroups)

        const divFormGroupTrigger = appendFormGroup(divFormGroups)
        appendFormGroupLabel(divFormGroupTrigger, game.i18n.localize('CUSTOM_DND5E.trigger'))

        const divFormFieldsTrigger = appendFormFields(divFormGroupTrigger)
        const selectTrigger = appendSelect(divFormFieldsTrigger, 'trigger', 'trigger')
        appendSelectOption(selectTrigger, 'counterValue', game.i18n.localize('CUSTOM_DND5E.form.counters.advancedOptions.trigger.choices.counterValue'))
        appendSelectOption(selectTrigger, '0hp', game.i18n.localize('CUSTOM_DND5E.form.counters.advancedOptions.trigger.choices.0hp'))
        appendSelectOption(selectTrigger, '0hpCombatEnd', game.i18n.localize('CUSTOM_DND5E.form.counters.advancedOptions.trigger.choices.0hpCombatEnd'))
        appendSelectOption(selectTrigger, 'halfHp', game.i18n.localize('CUSTOM_DND5E.form.counters.advancedOptions.trigger.choices.halfHp'))
        appendSelectOption(selectTrigger, 'roll1', game.i18n.localize('CUSTOM_DND5E.form.counters.advancedOptions.trigger.choices.roll1'))
        appendSelectOption(selectTrigger, 'roll20', game.i18n.localize('CUSTOM_DND5E.form.counters.advancedOptions.trigger.choices.roll20'))

        const divFormGroupTriggerValue = appendFormGroup(divFormGroups)
        appendFormGroupLabel(divFormGroupTriggerValue, game.i18n.localize('CUSTOM_DND5E.triggerValue'))
        const divFormFieldsTriggerValue = appendFormFields(divFormGroupTriggerValue)
        const inputTriggerValue = document.createElement('input')
        inputTriggerValue.setAttribute('id', 'trigger-value')
        inputTriggerValue.setAttribute('name', 'triggerValue')
        inputTriggerValue.setAttribute('type', 'number')
        divFormFieldsTriggerValue.appendChild(inputTriggerValue)

        const divFormGroupAction = appendFormGroup(divFormGroups)
        appendFormGroupLabel(divFormGroupAction, game.i18n.localize('CUSTOM_DND5E.action'))

        const divFormFieldsAction = appendFormFields(divFormGroupAction)
        const selectAction = appendSelect(divFormFieldsAction, 'action', 'action')
        if (this.type === 'checkbox') {
            appendSelectOption(selectAction, 'check', game.i18n.localize('CUSTOM_DND5E.check'))
            appendSelectOption(selectAction, 'uncheck', game.i18n.localize('CUSTOM_DND5E.uncheck'))
        } else {
            appendSelectOption(selectAction, 'increase', game.i18n.localize('CUSTOM_DND5E.increase'))
            appendSelectOption(selectAction, 'decrease', game.i18n.localize('CUSTOM_DND5E.decrease'))
            appendSelectOption(selectAction, 'dead', game.i18n.localize('CUSTOM_DND5E.dead'))
        }

        const divFormGroupActionValue = appendFormGroup(divFormGroups)
        if (this.type === 'checkbox') divFormGroupActionValue.classList.add('hidden')
        appendFormGroupLabel(divFormGroupActionValue, game.i18n.localize('CUSTOM_DND5E.actionValue'))
        const divFormFieldsActionValue = appendFormFields(divFormGroupActionValue)
        const inputActionValue = document.createElement('input')
        inputActionValue.setAttribute('id', 'action-value')
        inputActionValue.setAttribute('name', 'actionValue')
        inputActionValue.setAttribute('type', 'number')
        divFormFieldsActionValue.appendChild(inputActionValue)

        appendDeleteButton(divItemGroup, 'delete')

        selectTrigger.addEventListener('change', () => this.#onChangeTrigger(selectTrigger, divFormGroupTriggerValue))
        selectAction.addEventListener('change', () => this.#onChangeAction(selectAction, divFormGroupActionValue))
        if (this.items[0]) { iGrip.addEventListener('dragstart', this.items[0].ondragstart) } // Fix this for empty list
        item.addEventListener('dragleave', this._onDragLeave)

        list.appendChild(item)
    }

    #onChangeTrigger (trigger, triggerValue) {
        const allowed = ['counterValue']
        triggerValue.classList.remove('hidden')
        if (!allowed.includes(trigger.value)) {
            triggerValue.classList.add('hidden')
        }
    }

    #onChangeAction (action, actionValue) {
        const allowed = ['increase', 'decrease']
        actionValue.classList.remove('hidden')
        if (!allowed.includes(action.value)) {
            actionValue.classList.add('hidden')
        }
    }

    async _updateObject (event, formData) {
        const arr = []

        if (!Array.isArray(formData.action)) { formData.action = [formData.action] }
        if (!Array.isArray(formData.actionValue)) { formData.actionValue = [formData.actionValue] }
        if (!Array.isArray(formData.delete)) { formData.delete = [formData.delete] }
        if (!Array.isArray(formData.trigger)) { formData.trigger = [formData.trigger] }
        if (!Array.isArray(formData.triggerValue)) { formData.triggerValue = [formData.triggerValue] }

        // Set properties in this.setting
        Object.entries(formData).forEach(([key, value]) => {
            if (Array.isArray(value)) { return }
            setProperty(this.setting, key, value)
        })

        for (let index = 0; index < Object.keys(formData.action).length; index++) {
            if (formData.delete[index] === 'true') {
                continue
            }

            const data = {
                action: formData.action[index],
                actionValue: formData.actionValue[index],
                trigger: formData.trigger[index],
                triggerValue: formData.triggerValue[index]
            }

            arr.push(data)
        }

        this.setting[this.key].advancedOptions = arr

        if (this.actorType === 'character') {
            await setSetting(CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY, this.setting)
        } else {
            await setSetting(CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY, this.setting)
        }
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
