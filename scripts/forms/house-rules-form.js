import { CONSTANTS, MODULE } from '../constants.js'
import { getSetting, setSetting, resetSetting } from '../utils.js'
import { CustomDnd5eForm } from './custom-dnd5e-form.js'

export class HouseRulesForm extends CustomDnd5eForm {
    constructor (...args) {
        super(args)
        this.type = 'house-rules'
    }

    static DEFAULT_OPTIONS = {
        actions: {
            reset: HouseRulesForm.reset
        },
        form: {
            handler: HouseRulesForm.submit
        },
        id: `${MODULE.ID}-house-rules-form`,
        window: {
            title: 'CUSTOM_DND5E.form.houseRules.title'
        }
    }

    static PARTS = {
        form: {
            template: CONSTANTS.HOUSE_RULES.TEMPLATE.FORM
        }
    }

    async _prepareContext () {
        return {
            levelUpHitPointsRerollMinimumValue: getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY),
            levelUpHitPointsRerollOnce: getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY),
            levelUpHitPointsShowTakeAverage: getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY),
            rollNpcHp: getSetting(CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY),
            applyBloodied: getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY),
            bloodiedIcon: getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY),
            bloodiedTint: getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY),
            applyUnconscious: getSetting(CONSTANTS.UNCONSCIOUS.SETTING.APPLY_UNCONSCIOUS.KEY),
            applyDead: getSetting(CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY),
            applyInstantDeath: getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY),
            deadRotation: getSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY),
            deadTint: getSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY),
            deathSavesRollMode: getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY),
            removeDeathSave: getSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY),
            deathSavesTargetValue: getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_TARGET_VALUE.KEY),
            applyMassiveDamage: getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY),
            applyNegativeHp: getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY),
            negativeHpHealFromZero: getSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY),
            awardInspirationD20Value: getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY),
            awardInspirationRollTypes: getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY),
            proneRotation: getSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY),
            selects: {
                deathSavesRollMode: {
                    choices: {
                        publicroll: 'CHAT.RollPublic',
                        blindroll: 'CHAT.RollBlind',
                        gmroll: 'CHAT.RollPrivate'
                    }
                }
            }
        }
    }

    static async reset () {
        const reset = async () => {
            await Promise.all([
                resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY),
                resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY),
                resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY),
                resetSetting(CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY),
                resetSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY),
                resetSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY),
                resetSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY),
                resetSetting(CONSTANTS.UNCONSCIOUS.SETTING.APPLY_UNCONSCIOUS.KEY),
                resetSetting(CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY),
                resetSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY),
                resetSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY),
                resetSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY),
                resetSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY),
                resetSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY),
                resetSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_TARGET_VALUE.KEY),
                resetSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY),
                resetSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY),
                resetSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY),
                resetSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY),
                resetSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY),
                resetSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY)
            ])
            this.render(true)
        }

        await foundry.applications.api.DialogV2.confirm({
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
    }

    static async submit (event, form, formData) {
        const removeDeathSaves = {}
        const awardInspirationRollTypes = {}
        Object.entries(formData.object).forEach(([key, value]) => {
            if (key.startsWith('removeDeathSaves')) {
                const property = key.split('.').slice(1, 3).join('.')
                foundry.utils.setProperty(removeDeathSaves, property, value)
            } else if (key.startsWith('awardInspirationRollTypes')) {
                const property = key.split('.').slice(1, 3).join('.')
                foundry.utils.setProperty(awardInspirationRollTypes, property, value)
            }
        })

        await Promise.all([
            setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY, formData.object.levelUpHitPointsRerollMinimumValue),
            setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY, formData.object.levelUpHitPointsRerollOnce),
            setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY, formData.object.levelUpHitPointsShowTakeAverage),
            setSetting(CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY, formData.object.rollNpcHp),
            setSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY, formData.object.applyBloodied),
            setSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY, formData.object.bloodiedIcon),
            setSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY, formData.object.bloodiedTint),
            setSetting(CONSTANTS.UNCONSCIOUS.SETTING.APPLY_UNCONSCIOUS.KEY, formData.object.applyUnconscious),
            setSetting(CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY, formData.object.applyDead),
            setSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY, formData.object.applyInstantDeath),
            setSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY, formData.object.deadRotation),
            setSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY, formData.object.deadTint),
            setSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY, formData.object.deathSavesRollMode),
            setSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY, removeDeathSaves),
            setSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_TARGET_VALUE.KEY, formData.object.deathSavesTargetValue),
            setSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY, formData.object.applyMassiveDamage),
            setSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY, formData.object.applyNegativeHp),
            setSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY, formData.object.negativeHpHealFromZero),
            setSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_D20_VALUE.KEY, formData.object.awardInspirationD20Value),
            setSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY, awardInspirationRollTypes),
            setSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY, formData.object.proneRotation)
        ])

        SettingsConfig.reloadConfirm()
    }
}
