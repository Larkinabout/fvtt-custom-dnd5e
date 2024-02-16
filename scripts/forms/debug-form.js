import { CONSTANTS } from '../constants.js'
import { exportData } from '../debug.js'
import { getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

export class DebugForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            template: CONSTANTS.DEBUG.TEMPLATE.FORM,
            title: CONSTANTS.DEBUG.FORM.TITLE
        })
    }

    async getData () {
        const debug = getSetting(CONSTANTS.DEBUG.SETTING.KEY)

        return { debug }
    }

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _handleButtonClick (event) {
        event.preventDefault()
        const clickedElement = $(event.currentTarget)
        const action = clickedElement.data().action
        switch (action) {
        case 'export': {
            await exportData()
            break
        }
        }
    }

    async _updateObject (event, formData) {
        setSetting(CONSTANTS.DEBUG.SETTING.KEY, formData.debug)
    }
}
