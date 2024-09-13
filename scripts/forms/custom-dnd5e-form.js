import { MODULE } from '../constants.js'

const itemClass = `${MODULE.ID}-item`
const itemClassSelector = `.${itemClass}`
const listClass = `${MODULE.ID}-list`
const listClassSelector = `.${listClass}`

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class CustomDnd5eForm extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor (options = {}) {
        super(options)
        // this.#dragDrop = this.#createDragDropHandlers()
        this.nestable = false
    }

    static DEFAULT_OPTIONS = {
        actions: {
            delete: CustomDnd5eForm.deleteItem,
            new: CustomDnd5eForm.createItem,
            reset: CustomDnd5eForm.reset,
            validate: CustomDnd5eForm.validate
        },
        classes: [`${MODULE.ID}-app`, 'sheet'],
        tag: 'form',
        form: {
            submitOnChange: false,
            closeOnSubmit: true
        },
        dragDrop: [{
            dragSelector: '.custom-dnd5e-drag',
            dropSelector: listClassSelector
        }],
        position: {
            width: 600,
            height: 680
        },
        scrollable: 'custom-dnd5e-scrollable',
        window: {
            minimizable: true,
            resizable: true
        }
    }

    static createItem (event, target) {}

    static reset (event, target) {}

    static validate (event, target) {
    }

    static async deleteItem (event, target) {
        const item = target.closest('.custom-dnd5e-item')
        if (!item) return

        const key = item.dataset.key
        if (!key) return

        const del = async (key) => {
            const listItem = this.element.querySelector(`[data-key="${key}"]`)
            const deleteInputs = listItem.querySelectorAll('input[id="delete"]')

            // Set delete input to true against list item and all nested list items
            deleteInputs.forEach(input => {
                input.setAttribute('value', 'true')
            })

            listItem.classList.add('hidden')
        }

        const d = await foundry.applications.api.DialogV2.confirm({
            window: {
                title: game.i18n.localize('CUSTOM_DND5E.dialog.delete.title')
            },
            content: `<p>${game.i18n.localize('CUSTOM_DND5E.dialog.delete.content')}</p>`,
            modal: true,
            yes: {
                label: game.i18n.localize('CUSTOM_DND5E.yes'),
                callback: async () => {
                    del(key)
                }
            },
            no: {
                label: game.i18n.localize('CUSTOM_DND5E.no')
            }
        })
        d.render(true)
    }

    _onRender (context, options) {
        // const cancel = html.find(`#${MODULE.ID}-cancel`)
        // cancel.on('click', this.close.bind(this))

        this.items = Array.from(this.element.querySelectorAll(itemClassSelector))

        this.items.forEach(item => {
            // this.#dragDrop.forEach((d) => d.bind(item))
            item.addEventListener('dragstart', this._onDragStart.bind(this))
            item.addEventListener('dragleave', this._onDragLeave.bind(this))
            item.addEventListener('dragend', this._onDragEnd.bind(this))
            item.addEventListener('dragover', this._onDragOver.bind(this))
            item.addEventListener('drop', this._onDrop.bind(this))

            const checkbox = item.querySelector("input[type='checkbox']")
            checkbox?.addEventListener('change', this._onChangeInput.bind(this))
            if (checkbox?.checked) this._onToggleList(checkbox)
        })
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
    _canDragStart (selector) {
        return true
    }

    /** @inheritdoc */
    _canDragDrop (selector) {
        return true
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

        this.targetItem?.classList.remove(`drag-${this.mousePos}`)

        this.#getDragElement(event)
        this.targetItem?.classList.add(`drag-${this.mousePos}`)
    }

    _onDragLeave (event) {
        if (!this.sourceItem) return

        this.targetItem?.classList.remove(`drag-${this.mousePos}`)

        this.#getDragElement(event)
        this.targetItem?.classList.remove(`drag-${this.mousePos}`)
    }

    _onDragEnd (event) {
        if (!this.sourceItem) return
        this.sourceItem?.style.removeProperty('opacity')
        this.targetItem?.classList.remove(`drag-${this.mousePos}`)
        this.sourceItem = null
        this.targetItem = null
    }

    /** @override */
    _onDrop (event) {
        if (!this.sourceItem) return

        this.sourceItem?.style.removeProperty('opacity')

        this.targetItem?.classList.remove(`drag-${this.mousePos}`)

        this.#getDragElement(event)

        if (!this.targetItem) return

        this.targetItem?.classList.remove(`drag-${this.mousePos}`)

        this.targetItemIndex = this.items.findIndex(item => item.dataset.key === this.targetItem.dataset.key)

        if (this.mousePos === 'top') {
            this.targetItem.before(this.sourceItem)
        } else if (this.mousePos === 'bottom') {
            this.targetItem.after(this.sourceItem)
        } else if (this.mousePos === 'middle') {
            const list = this.targetItem.querySelector('ul')

            if (list) {
                list.appendChild(this.sourceItem)
            } else {
                const ul = document.createElement('ul')
                ul.classList.add('custom-dnd5e-list', 'flexcol')
                this.targetItem.appendChild(ul)
                ul.appendChild(this.sourceItem)
            }
        } else {
            return
        }

        // Update keys with new parents
        const items = this.sourceItem?.closest('ul').querySelectorAll('li')

        items.forEach(item => {
            const key = item.querySelector('#key')?.value

            const parentKey = item.closest('ul')?.closest('li')?.dataset?.key

            if (!parentKey) return

            item.dataset.key = `${parentKey}.children.${key}`

            const inputs = item.querySelectorAll('input')

            inputs.forEach(input => {
                if (input.id === 'parentKey') {
                    input.value = parentKey
                }
                if (input.name) {
                    input.name = `${parentKey}.children.${key}.${input.id}`
                }
            })
        })

        this.sourceItem = null
        this.targetItem = null
    }

    #getDragElement (event) {
        const yPct = (event.clientY - event.target.getBoundingClientRect().top) / event.target.getBoundingClientRect().height
        this.targetItem = event.target.closest('li')
        const topPct = (this.nestable) ? 0.25 : 0.5
        const bottomPct = (this.nestable) ? 0.75 : 0.5
        if (yPct < topPct) {
            this.mousePos = 'top'
        } else if (yPct >= bottomPct) {
            this.mousePos = 'bottom'
        } else {
            this.mousePos = (this.nestable) ? 'middle' : 'bottom'
        }
    }
}
