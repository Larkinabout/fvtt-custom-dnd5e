import { CONSTANTS, MODULE } from '../constants.js'
import { getSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

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
        const characterCounters = getSetting(CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY)
        const npcCounters = getSetting(CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY)
        return { characterCounters, npcCounters }
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
        }
    }

    async _createItem () {
        const activeTab = this.element[0].querySelector('.tab.active')
        const actorType = activeTab.dataset.actorType
        // Get active section
        const list = activeTab.querySelector(listClassSelector)

        const key = randomID()

        const item = document.createElement('li')
        item.classList.add(itemClass)
        item.setAttribute('draggable', 'true')
        item.setAttribute('data-key', key)

        item.innerHTML =
        `<div class="custom-dnd5e-item-group flexrow">
            <i class="flex0 fas fa-grip-lines"></i>
            <input id="visible" name="visible" type="checkbox" checked>
            <div class="fields flexrow">
                <input id="actorType" name="actorType" type="hidden" value="${actorType}">
                <input id="key" name="key" type="hidden" value="${key}">
                <input id="system" name="system" type="hidden" value="false">
                <div class="field">
                    <label>${game.i18n.localize('CUSTOM_DND5E.label')}</label>
                    <input id="label" name="label" type="text" value="">
                </div>
                <div class="field">
                    <label>${game.i18n.localize('CUSTOM_DND5E.type')}</label>
                    <select id="type" name="type">
                        <option value="checkbox">${game.i18n.localize('CUSTOM_DND5E.checkbox')}</option>
                        <option value="fraction">${game.i18n.localize('CUSTOM_DND5E.fraction')}</option>
                        <option value="number">${game.i18n.localize('CUSTOM_DND5E.number')}</option>
                        <option value="successFailure">${game.i18n.localize('CUSTOM_DND5E.successFailure')}</option>
                    </select>
                </div>
            </div>
            <a alt="${game.i18n.localize('dnd5eCustomCounters.copyProperty.tooltip')}" data-action="copy-property" data-tooltip="${game.i18n.localize('dnd5eCustomCounters.copyProperty.tooltip')}" data-tooltip-direction="UP" class="flex0" >
                <i class="fa-solid fa-at"></i>
            </a>
            <button type="button" data-tooltip="Delete" data-action="delete" class="flex0 delete-button">
            <i class="fas fa-xmark"></i>
            </button>
            <input id="delete" name="delete" type="hidden" value="false"
        </div>`

        if (this.items[0]) { item.addEventListener('dragstart', this.items[0].ondragstart) } // Fix this for empty list
        item.addEventListener('dragleave', this._onDragLeave)

        list.appendChild(item)
    }

    async _copyProperty (key, type) {
        const property = `@flags.${MODULE.ID}.${key}${(type === 'successFailure') ? '.success' : (type === 'fraction') ? '.value' : ''}`
        game.clipboard.copyPlainText(property)
        ui.notifications.info(game.i18n.format('CUSTOM_DND5E.form.counters.copyProperty.message', { property }))
    }

    async _updateObject (event, formData) {
        const characterCounters = {}
        const npcCounters = {}

        if (!Array.isArray(formData.actorType)) { formData.actorType = [formData.actorType] }
        if (!Array.isArray(formData.key)) { formData.key = [formData.key] }
        if (!Array.isArray(formData.label)) { formData.label = [formData.label] }
        if (!Array.isArray(formData.type)) { formData.type = [formData.type] }
        if (!Array.isArray(formData.system)) { formData.system = [formData.system] }
        if (!Array.isArray(formData.visible)) { formData.visible = [formData.visible] }
        if (!Array.isArray(formData.delete)) { formData.delete = [formData.delete] }

        for (let index = 0; index < Object.keys(formData.key).length; index++) {
            const key = formData.key[index]

            if (formData.delete[index] === 'true') {
                for (const actor of game.actors) {
                    actor.unsetFlag(MODULE.ID, key)
                }
                continue
            }

            const data = {
                label: formData.label[index],
                type: formData.type[index],
                system: formData.system[index] !== 'false',
                visible: formData.visible[index]
            }

            if (formData.actorType[index] === 'character') {
                characterCounters[key] = data
            } else {
                npcCounters[key] = data
            }
        }

        await Promise.all([
            game.settings.set(MODULE.ID, CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY, characterCounters),
            game.settings.set(MODULE.ID, CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY, npcCounters)
        ])
    }
}
