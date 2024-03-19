import { CONSTANTS, MODULE } from '../constants.js'
import { getSetting, setSetting, resetSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

const itemClass = `${MODULE.ID}-item`
const listClass = `${MODULE.ID}-list`

export class HouseRulesForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
        this.type = 'house-rules'
    }

    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            template: CONSTANTS.HOUSE_RULES.TEMPLATE.FORM,
            title: game.i18n.localize('CUSTOM_DND5E.form.houseRules.title')
        })
    }

    async getData () {
        const data = {}
        data.levelUpHitPointsRerollMinimumValue = getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY)
        data.levelUpHitPointsRerollOnce = getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY)
        data.levelUpHitPointsShowTakeAverage = getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY)
        data.applyBloodied = getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)
        data.bloodiedIcon = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY)
        data.bloodiedTint = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY)
        data.applyInstantDeath = getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY)
        data.deadRotation = getSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY)
        data.deadTint = getSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY)
        data.deathSavesRollMode = getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY)
        data.removeDeathSaves = getSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY)
        data.applyMassiveDamage = getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY)
        data.applyNegativeHp = getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY)
        data.negativeHpHealFromZero = getSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY)
        data.awardInspirationD20Value = getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY)
        data.awardInspirationRollTypes = getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY)
        data.proneRotation = getSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY)

        return data
    }

    activateListeners (html) {
        super.activateListeners(html)
    }

    async _reset () {
        const reset = async () => {
            await Promise.all([
                resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY),
                resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY),
                resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY),
                resetSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY),
                resetSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY),
                resetSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY),
                resetSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY),
                resetSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY),
                resetSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY),
                resetSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY),
                resetSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY),
                resetSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY),
                resetSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY),
                resetSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY),
                resetSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY),
                resetSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY),
                resetSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY)
            ])
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
        const removeDeathSaves = {}
        const awardInspirationRollTypes = {}
        Object.entries(formData).forEach(([key, value]) => {
            if (key.startsWith('removeDeathSaves')) {
                const property = key.split('.').slice(1, 3).join('.')
                setProperty(removeDeathSaves, property, value)
            } else if (key.startsWith('awardInspirationRollTypes')) {
                const property = key.split('.').slice(1, 3).join('.')
                setProperty(awardInspirationRollTypes, property, value)
            }
        })

        await Promise.all([
            setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY, formData.levelUpHitPointsRerollMinimumValue),
            setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY, formData.levelUpHitPointsRerollOnce),
            setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY, formData.levelUpHitPointsShowTakeAverage),
            setSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY, formData.applyBloodied),
            setSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY, formData.bloodiedIcon),
            setSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY, formData.bloodiedTint),
            setSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY, formData.applyInstantDeath),
            setSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY, formData.deadRotation),
            setSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY, formData.deadTint),
            setSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY, formData.deathSavesRollMode),
            setSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY, removeDeathSaves),
            setSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY, formData.applyMassiveDamage),
            setSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY, formData.applyNegativeHp),
            setSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY, formData.negativeHpHealFromZero),
            setSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY, formData.awardInspirationD20Value),
            setSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY, awardInspirationRollTypes),
            setSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY, formData.proneRotation)
        ])

        SettingsConfig.reloadConfirm()
    }
}
