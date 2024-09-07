import { CONSTANTS, MODULE } from '../constants.js'
import { importData, exportData } from '../debug.js'
import { getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

export class DebugForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
    }

    static DEFAULT_OPTIONS = {
        actions: {
            export: DebugForm.export,
            import: DebugForm.import
        },
        form: {
            handler: DebugForm.submit
        },
        id: `${MODULE.ID}-debug-form`,
        window: {
            title: CONSTANTS.DEBUG.FORM.TITLE
        }
    }

    static PARTS = {
        form: {
            template: CONSTANTS.DEBUG.TEMPLATE.FORM
        }
    }

    async _prepareContext () {
        return { debug: getSetting(CONSTANTS.DEBUG.SETTING.KEY) }
    }

    static async export () {
        await exportData()
    }

    static async import () {
        await importData()
    }

    static async submit (event, form, formData) {
        setSetting(CONSTANTS.DEBUG.SETTING.KEY, formData.object.debug)
    }
}
