import { CONSTANTS } from '../constants.js'
import { getFlag, setFlag, getSetting, setSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

export class SheetForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)

        this.type = 'sheet'
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: CONSTANTS.SHEET.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.sheet.title')
        })
    }

    async getData () {
        const isGM = game.user.isGM
        const autoFadeSheet = getFlag(game.user, CONSTANTS.SHEET.SETTING.AUTO_FADE_SHEET.KEY)
        const autoMinimiseSheet = getFlag(game.user, CONSTANTS.SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY)
        const bannerImage = getSetting(CONSTANTS.SHEET.SETTING.BANNER_IMAGE.KEY)
        const sheetScale = getFlag(game.user, CONSTANTS.SHEET.SETTING.SHEET_SCALE.KEY)
        const showDeathSaves = getSetting(CONSTANTS.SHEET.SETTING.SHOW_DEATH_SAVES.KEY)
        const showEncumbrance = getSetting(CONSTANTS.SHEET.SETTING.SHOW_ENCUMBRANCE.KEY)
        const showExhaustion = getSetting(CONSTANTS.SHEET.SETTING.SHOW_EXHAUSTION.KEY)
        const showInspiration = getSetting(CONSTANTS.SHEET.SETTING.SHOW_INSPIRATION.KEY)
        const showLegendaryActions = getSetting(CONSTANTS.SHEET.SETTING.SHOW_LEGENDARY_ACTIONS.KEY)
        const showLegendaryResistance = getSetting(CONSTANTS.SHEET.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY)
        const showManageCurrency = getSetting(CONSTANTS.SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY)
        const showUseLairAction = getSetting(CONSTANTS.SHEET.SETTING.SHOW_USE_LAIR_ACTION.KEY)

        const data = {
            isGM,
            autoFadeSheet,
            autoMinimiseSheet,
            bannerImage,
            sheetScale,
            showDeathSaves,
            showEncumbrance,
            showExhaustion,
            showInspiration,
            showLegendaryActions,
            showLegendaryResistance,
            showManageCurrency,
            showUseLairAction
        }

        return data
    }

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _reset () {
        const reset = async () => {
            this.render(true)
        }

        const d = new Dialog({
            title: game.i18n.localize('CUSTOM_DND5E.dialog.reset.title'),
            content: `<p>${game.i18n.localize('CUSTOM_DND5E.dialog.reset.content')}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('CUSTOM_DND5E.dialog.reset.yes'),
                    callback: async () => {
                        reset()
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('CUSTOM_DND5E.dialog.reset.no')
                }
            }
        })
        d.render(true)
    }

    async _updateObject (event, formData) {
        await Promise.all([
            setFlag(game.user, CONSTANTS.SHEET.SETTING.AUTO_FADE_SHEET.KEY, formData.autoFadeSheet),
            setFlag(game.user, CONSTANTS.SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY, formData.autoMinimiseSheet),
            setFlag(game.user, CONSTANTS.SHEET.SETTING.SHEET_SCALE.KEY, formData.sheetScale),
        ])

        if (game.user.isGM) {
            await Promise.all([
                setSetting(CONSTANTS.SHEET.SETTING.BANNER_IMAGE.KEY, formData.bannerImage),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_DEATH_SAVES.KEY, formData.showDeathSaves),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_ENCUMBRANCE.KEY, formData.showEncumbrance),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_EXHAUSTION.KEY, formData.showExhaustion),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_INSPIRATION.KEY, formData.showInspiration),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_LEGENDARY_ACTIONS.KEY, formData.showLegendaryActions),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY, formData.showLegendaryResistance),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY, formData.showManageCurrency),
                setSetting(CONSTANTS.SHEET.SETTING.SHOW_USE_LAIR_ACTION.KEY, formData.showUseLairAction)
            ])
        }
    }
}
