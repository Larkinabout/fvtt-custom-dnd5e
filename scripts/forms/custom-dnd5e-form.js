import { MODULE } from '../constants.js'

const itemClass = `${MODULE.ID}-item`
const itemClassSelector = `.${itemClass}`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

export class CustomDnd5eForm extends FormApplication {
    constructor (...args) {
        super(args)
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            classes: [`${MODULE.ID}-app`, 'sheet'],
            dragDrop: [{
                dragSelector: '.custom-dnd5e-drag',
                dropSelector: listClassSelector
            }],
            width: 600,
            height: 680,
            closeOnSubmit: true,
            minimizable: true,
            resizable: true
        })
    }

    activateListeners (html) {
        super.activateListeners(html)

        html.on('click', '[data-action]', this._handleButtonClick.bind(this))

        const cancel = html.find(`#${MODULE.ID}-cancel`)
        cancel.on('click', this.close.bind(this))

        this.items = Array.from(html[0].querySelectorAll(itemClassSelector))

        this.items.forEach(item => {
            item.addEventListener('dragleave', this._onDragLeave.bind(this))
            item.addEventListener('dragend', this._onDragEnd.bind(this))

            const checkbox = item.querySelector("input[type='checkbox']")
            checkbox?.addEventListener('change', this._onChangeInput.bind(this))
            if (checkbox?.checked) this._onToggleList(checkbox)
        })
    }

    /** @override */
    _canDragStart (selector) {
        return true
    }

    /** @inheritdoc */
    _canDragDrop (selector) {
        return true
    }

    async _onChangeInput (event) {
        if (event.target.id === 'visible') this._onToggleList(event.target)
    }

    _onToggleList (checkbox) {
        const checkParent = (checkbox) => {
            const parent = checkbox.closest('ul').closest('li')

            if (!parent) return

            const parentCheckbox = parent.querySelector("input[type='checkbox']")
            parentCheckbox.checked = checkbox.checked

            checkParent(parentCheckbox)
        }

        if (checkbox.checked) {
            checkParent(checkbox)
        }

        if (!checkbox.checked) {
            const children = checkbox.closest('li')?.querySelector('ul')

            if (!children) return

            for (const child of children.querySelectorAll("input[type='checkbox']")) {
                child.checked = checkbox.checked
            }
        }
    }

    /** @override */
    _onDragStart (event) {
        this.items = Array.from(event.target.closest(listClassSelector).querySelectorAll(itemClassSelector))
        if (!this.items) return
        this.sourceItem = event.target.closest('li')
        this.sourceIndex = this.items.findIndex(item => item.dataset.key === this.sourceItem.dataset.key)
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/html', this.sourceItem.innerHTML)
        this.sourceItem.style.opacity = '0.5'
    }

    /** @override */
    _onDragOver (event) {
        if (!this.sourceItem) return
        this.targetItem = event.target.closest('li')
        this.targetItem?.classList.add('over')
    }

    _onDragLeave (event) {
        if (!this.sourceItem) return
        this.targetItem = event.target.closest('li')
        this.targetItem?.classList.remove('over')
    }

    _onDragEnd (event) {
        if (!this.sourceItem) return
        this.sourceItem?.style.removeProperty('opacity')
        this.targetItem?.classList.remove('over')
        this.sourceItem = null
        this.targetItem = null
    }

    /** @override */
    _onDrop (event) {
        if (!this.sourceItem) return

        this.sourceItem?.style.removeProperty('opacity')

        this.targetItem = event.target.closest('li')

        if (!this.targetItem) return

        this.targetItem?.classList.remove('over')

        this.targetItemIndex = this.items.findIndex(item => item.dataset.key === this.targetItem.dataset.key)

        this.targetItem.before(this.sourceItem)

        const parentKey = this.targetItem.closest('ul')?.closest('li')?.dataset?.key

        if (parentKey) {
            const inputs = this.sourceItem?.querySelectorAll('input')

            inputs.forEach(input => {
                if (input.id === 'parentKey') {
                    input.value = parentKey
                }
                if (input.name) {
                    input.name = `${parentKey}.children.${this.sourceItem.dataset.key}.${input.id}`
                }
            })
        }

        this.sourceItem = null
        this.targetItem = null
    }

    async _handleButtonClick (event) {
        event.preventDefault()
        const clickedElement = $(event.currentTarget)
        const action = clickedElement.data().action
        const key = clickedElement.parents('li')?.data()?.key
        switch (action) {
        case 'delete': {
            await this._deleteItem(key)
            break
        }
        case 'new': {
            await this._createItem()
            break
        }
        case 'reset': {
            await this._reset()
            break
        }
        case 'validate': {
            const formData = this._getSubmitData()
            await this._validate(event, formData)
            break
        }
        }
    }

    async _createItem () {}

    async _reset () {}

    async _validate () {}

    async _deleteItem (key) {
        const del = async (key) => {
            const element = this.element[0].querySelector(`[data-key="${key}"]`)
            const deleteInput = element.querySelector('input[id="delete"]')
            deleteInput.setAttribute('value', 'true')
            element.classList.add('hidden')
        }

        const d = new Dialog({
            title: game.i18n.localize('CUSTOM_DND5E.dialog.delete.title'),
            content: `<p>${game.i18n.localize('CUSTOM_DND5E.dialog.delete.content')}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('CUSTOM_DND5E.dialog.delete.yes'),
                    callback: async () => {
                        del(key)
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('CUSTOM_DND5E.dialog.delete.no')
                }
            }
        })
        d.render(true)
    }
}
