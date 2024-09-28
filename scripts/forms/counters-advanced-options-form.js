import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE } from '../constants.js'
import { getFlag, setFlag, unsetFlag, setSetting, Logger } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

const id = CONSTANTS.COUNTERS.ID
const form = `${id}-advanced-options-form`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

export class CountersAdvancedOptionsForm extends CustomDnd5eForm {
    constructor (args) {
        super(args)

        this.countersForm = args.countersForm
        this.setting = args.setting
        this.key = args.data.key
        this.actorType = args.data.actorType
        this.label = args.data.label
        this.type = args.data.type
    }

    static DEFAULT_OPTIONS = {
        actions: {
            new: CountersAdvancedOptionsForm.createItem
        },
        form: {
            handler: CountersAdvancedOptionsForm.submit,
            closeOnSubmit: false
        },
        id: `${MODULE.ID}-${form}`,
        window: {
            title: `CUSTOM_DND5E.form.${id}.triggers.title`
        }
    }

    static PARTS = {
        form: {
            template: `modules/${MODULE.ID}/templates/${form}.hbs`
        }
    }

    #getSelects (type) {
        const triggerChoices = {}

        if (type !== 'checkbox') {
            triggerChoices.counterValue = 'CUSTOM_DND5E.form.counters.triggers.trigger.choices.counterValue'
        }

        triggerChoices.zeroHp = 'CUSTOM_DND5E.form.counters.triggers.trigger.choices.zeroHp'
        triggerChoices.zeroHpCombatEnd = 'CUSTOM_DND5E.form.counters.triggers.trigger.choices.zeroHpCombatEnd'
        triggerChoices.halfHp = 'CUSTOM_DND5E.form.counters.triggers.trigger.choices.halfHp'
        triggerChoices.shortRest = 'CUSTOM_DND5E.shortRest'
        triggerChoices.longRest = 'CUSTOM_DND5E.longRest'
        // triggerChoices.roll1 = 'CUSTOM_DND5E.form.counters.triggers.trigger.choices.roll1'
        // triggerChoices.roll20 = 'CUSTOM_DND5E.form.counters.triggers.trigger.choices.roll20'

        const actionChoices = {}

        if (type !== 'checkbox') {
            actionChoices.increase = 'CUSTOM_DND5E.increase'
            actionChoices.decrease = 'CUSTOM_DND5E.decrease'
            actionChoices.dead = 'CUSTOM_DND5E.dead'
        } else {
            actionChoices.check = 'CUSTOM_DND5E.check'
            actionChoices.uncheck = 'CUSTOM_DND5E.uncheck'
        }

        return {
            role: {
                choices: {
                    1: 'USER.RolePlayer',
                    2: 'USER.RoleTrusted',
                    3: 'USER.RoleAssistant',
                    4: 'USER.RoleGamemaster'
                }
            },
            trigger: {
                choices: triggerChoices
            },
            action: {
                choices: actionChoices
            }
        }
    }

    async _prepareContext () {
        const type = this.setting[this.key]?.type || this.type

        return {
            key: this.key,
            viewRole: this.setting[this.key]?.viewRole || 1,
            editRole: this.setting[this.key]?.editRole || 1,
            max: this.setting[this.key]?.max,
            type: this.setting[this.key]?.type || this.type,
            triggers: this.setting[this.key]?.triggers || [],
            selects: this.#getSelects(type)
        }
    }

    _onRender (context, options) {
        super._onRender(context, options)

        this.items.forEach(item => {
            const el = {}
            el.trigger = item.querySelector('#custom-dnd5e-trigger')
            el.triggerValueGroup = item.querySelector('#custom-dnd5e-trigger-value').closest('.form-group')
            el.trigger.addEventListener('change', () => { this.#onChangeTrigger(el) })

            el.action = item.querySelector('#custom-dnd5e-action')
            el.actionIncrease = el.action.querySelector('#custom-dnd5e-increase')
            el.actionDecrease = el.action.querySelector('#custom-dnd5e-decrease')
            el.actionValueGroup = item.querySelector('#custom-dnd5e-action-value').closest('.form-group')
            el.action.addEventListener('change', () => { this.#onChangeAction(el) })

            this.#onChangeTrigger(el)
            this.#onChangeAction(el)
        })
    }

    static async createItem () {
        const el = {}
        const list = this.element.querySelector(listClassSelector)
        const scrollable = list.closest('.scrollable')

        const key = foundry.utils.randomID()
        const type = this.setting[this.key]?.type || this.type
        const trigger = (type === 'checkbox') ? 'zeroHp' : 'counterValue'
        const action = (type === 'checkbox') ? 'check' : 'dead'

        const template = await this._getHtml({ type, triggers: [{ action, trigger, key, type }], selects: this.#getSelects(type) })

        list.insertAdjacentHTML('beforeend', template)

        const item = list.querySelector(`[data-key="${key}"]`)
        const dragElement = item.querySelector('.custom-dnd5e-drag')
        el.trigger = item.querySelector('#custom-dnd5e-trigger')
        el.triggerValueGroup = item.querySelector('#custom-dnd5e-trigger-value').closest('.form-group')
        el.action = item.querySelector('#custom-dnd5e-action')
        el.actionValueGroup = item.querySelector('#custom-dnd5e-action-value').closest('.form-group')
        el.actionIncrease = el.action.querySelector('#custom-dnd5e-increase')
        el.actionDecrease = el.action.querySelector('#custom-dnd5e-decrease')

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
        const template = await renderTemplate(CONSTANTS.COUNTERS.TEMPLATE.TRIGGERS_LIST, data)
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

    static async submit (event, form, formData) {
        const oldKey = this.key
        const newKey = formData.object[`${this.key}.key`]

        if (oldKey !== newKey) {
            if (this.setting[newKey]) {
                Logger.error(`Key '${newKey}' already exists`, true)
                return
            }
        }

        const ints = ['editRole', 'viewRole']
        const triggerProperties = ['action', 'actionValue', 'delete', 'trigger', 'triggerValue']

        // Ensure trigger properties are arrays if at least one exists
        if (formData.object.action) {
            triggerProperties.forEach(property => {
                if (!Array.isArray(formData.object[property])) {
                    formData.object[property] = [formData.object[property]]
                }
            })
        }

        // Set properties in this.setting
        Object.entries(formData.object).forEach(([key, value]) => {
            if (Array.isArray(value) || key.split('.').pop() === 'key') return
            if (ints.includes(key.split('.').pop())) { value = parseInt(value) }
            foundry.utils.setProperty(this.setting, key, value)
        })

        // Create new key and delete old key while keeping order of counters
        if (oldKey !== newKey) {
            this.setting[newKey] = foundry.utils.deepClone(this.setting[oldKey])

            const data = Object.fromEntries(
                Object.keys(this.setting).map(key => [
                    (key === oldKey) ? newKey : key,
                    foundry.utils.deepClone(this.setting[key])
                ])
            )

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
        if (formData.object.action) {
            const triggers = formData.object.action.map((_, index) => ({
                action: formData.object.action[index],
                actionValue: formData.object.actionValue[index],
                trigger: formData.object.trigger[index],
                triggerValue: formData.object.triggerValue[index]
            })).filter((_, index) => formData.object.delete[index] !== 'true')

            this.setting[this.key].triggers = triggers
        }

        this.setting[this.key].label = this.label
        this.setting[this.key].type = this.type

        await setSetting(SETTING_BY_ENTITY_TYPE.COUNTERS[this.actorType], this.setting)

        this.close()

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
