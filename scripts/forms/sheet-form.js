import { CONSTANTS, MODULE } from '../constants.js'
import { getFlag, setFlag, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

export class SheetForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
        this.type = 'sheet'
    }

    static DEFAULT_OPTIONS = {
        actions: {
            reset: SheetForm.reset
        },
        form: {
            handler: SheetForm.submit
        },
        id: `${MODULE.ID}-sheet-form`,
        window: {
            title: 'CUSTOM_DND5E.form.sheet.title'
        }
    }

    static PARTS = {
        form: {
            template: CONSTANTS.SHEET.TEMPLATE.FORM
        }
    }

    async _prepareContext () {
        return {
            isGM: game.user.isGM,
            autoFadeSheet: getFlag(game.user, CONSTANTS.SHEET.SETTING.AUTO_FADE_SHEET.KEY),
            autoMinimiseSheet: getFlag(game.user, CONSTANTS.SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY),
            bannerImage: getSetting(CONSTANTS.SHEET.SETTING.BANNER_IMAGE.KEY),
            sheetScale: getFlag(game.user, CONSTANTS.SHEET.SETTING.SHEET_SCALE.KEY),
            showDeathSaves: getSetting(CONSTANTS.SHEET.SETTING.SHOW_DEATH_SAVES.KEY),
            showEncumbrance: getSetting(CONSTANTS.SHEET.SETTING.SHOW_ENCUMBRANCE.KEY),
            showExhaustion: getSetting(CONSTANTS.SHEET.SETTING.SHOW_EXHAUSTION.KEY),
            showInspiration: getSetting(CONSTANTS.SHEET.SETTING.SHOW_INSPIRATION.KEY),
            showLegendaryActions: getSetting(CONSTANTS.SHEET.SETTING.SHOW_LEGENDARY_ACTIONS.KEY),
            showLegendaryResistance: getSetting(CONSTANTS.SHEET.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY),
            showManageCurrency: getSetting(CONSTANTS.SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY),
            showUseLairAction: getSetting(CONSTANTS.SHEET.SETTING.SHOW_USE_LAIR_ACTION.KEY)
        }
    }

    static async reset () {
        const reset = async () => {
            this.render(true)
        }

        const d = await foundry.applications.api.DialogV2.confirm({
            window: {
                title: game.i18n.localize('CUSTOM_DND5E.dialog.reset.title')
            },
            content: `<p>${game.i18n.localize('CUSTOM_DND5E.dialog.reset.content')}</p>`,
            modal: true,
            yes: {
                label: game.i18n.localize('CUSTOM_DND5E.yes'),
                callback: async () => {
                    reset()
                }
            },
            no: {
                label: game.i18n.localize('CUSTOM_DND5E.no')
            }
        })

        d.render(true)
    }

    static async submit (event, form, formData) {
        await Promise.all([
            setFlag(game.user, CONSTANTS.SHEET.SETTING.AUTO_FADE_SHEET.KEY, formData.object.autoFadeSheet),
            setFlag(game.user, CONSTANTS.SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY, formData.object.autoMinimiseSheet),
            setFlag(game.user, CONSTANTS.SHEET.SETTING.SHEET_SCALE.KEY, formData.object.sheetScale)
        ])

        if (game.user.isGM) {
            await Promise.all([
                setSetting(CONSTANTS.SHEET.SETTING.BANNER_IMAGE.KEY, formData.object.bannerImage),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_DEATH_SAVES.KEY, formData.object.showDeathSaves),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_ENCUMBRANCE.KEY, formData.object.showEncumbrance),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_EXHAUSTION.KEY, formData.object.showExhaustion),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_INSPIRATION.KEY, formData.object.showInspiration),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_LEGENDARY_ACTIONS.KEY, formData.object.showLegendaryActions),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY, formData.object.showLegendaryResistance),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY, formData.object.showManageCurrency),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_USE_LAIR_ACTION.KEY, formData.object.showUseLairAction)
            ])
        }
    }
}
