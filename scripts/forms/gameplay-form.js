import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/**
 * Class representing the Gameplay Form.
 */
export class GameplayForm extends CustomDnd5eForm {
  /**
   * Constructor for GameplayForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
    this.type = "gameplay";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.GAMEPLAY.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: GameplayForm.reset
    },
    form: {
      handler: GameplayForm.submit
    },
    id: `${MODULE.ID}-gameplay-form`,
    window: {
      title: "CUSTOM_DND5E.form.gameplay.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * Parts of the form.
   *
   * @type {object}
   */
  static PARTS = {
    form: {
      template: CONSTANTS.GAMEPLAY.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    return {
      levelUpHitPointsRerollMinimumValue: getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY),
      levelUpHitPointsRerollOnce: getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY),
      levelUpHitPointsShowTakeAverage: getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY),
      rollNpcHp: getSetting(CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY),
      applyBloodied: getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY),
      removeBloodiedOnDead: getSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY),
      bloodiedIcon: getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_ICON.KEY),
      bloodiedTint: getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY),
      applyUnconscious: getSetting(CONSTANTS.UNCONSCIOUS.SETTING.APPLY_UNCONSCIOUS.KEY),
      applyDead: getSetting(CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY),
      applyInstantDeath: getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY),
      deadRotation: getSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY),
      deadTint: getSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY),
      deathSavesRollMode: getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY),
      removeDeathSaves: getSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY),
      deathSavesTargetValue: getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_TARGET_VALUE.KEY),
      applyExhaustionOnZeroHp: getSetting(CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_ZERO_HP.KEY),
      applyExhaustionOnCombatEnd: getSetting(CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_COMBAT_END.KEY),
      applyMassiveDamage: getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY),
      applyNegativeHp: getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY),
      negativeHpHealFromZero: getSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY),
      rerollInitiativeEachRound: getSetting(CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY),
      awardInspirationD20Value: getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_DICE_VALUE.KEY),
      awardInspirationRollTypes: getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY),
      enableMobDamage: getSetting(CONSTANTS.MOB_DAMAGE.SETTING.ENABLE.KEY),
      useAverageMobDamage: getSetting(CONSTANTS.MOB_DAMAGE.SETTING.USE_AVERAGE_DAMAGE.KEY),
      enableProbabilisticDamage: getSetting(CONSTANTS.PROBABILISTIC_DAMAGE.SETTING.ENABLE.KEY),
      useAverageProbabilisticDamage: getSetting(CONSTANTS.PROBABILISTIC_DAMAGE.SETTING.USE_AVERAGE_DAMAGE.KEY),
      proneRotation: getSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY),
      useCampSupplies: getSetting(CONSTANTS.RESTING.SETTING.USE_CAMP_SUPPLIES.KEY),
      selects: {
        deathSavesRollMode: {
          choices: {
            publicroll: "CHAT.RollPublic",
            blindroll: "CHAT.RollBlind",
            gmroll: "CHAT.RollPrivate"
          }
        },
        probabilisticDamage: {
          choices: {
            neither: "CUSTOM_DND5E.neither",
            character: "CUSTOM_DND5E.playerCharacters",
            npc: "CUSTOM_DND5E.npcs",
            both: "CUSTOM_DND5E.both"
          }
        }
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      await Promise.all([
        resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY),
        resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY),
        resetSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY),
        resetSetting(CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY),
        resetSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY),
        resetSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY),
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
        resetSetting(CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_ZERO_HP.KEY),
        resetSetting(CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_COMBAT_END.KEY),
        resetSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY),
        resetSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY),
        resetSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY),
        resetSetting(CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY),
        resetSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_DICE_VALUE.KEY),
        resetSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY),
        resetSetting(CONSTANTS.MOB_DAMAGE.SETTING.ENABLE.KEY),
        resetSetting(CONSTANTS.MOB_DAMAGE.SETTING.USE_AVERAGE_DAMAGE.KEY),
        resetSetting(CONSTANTS.PROBABILISTIC_DAMAGE.SETTING.ENABLE.KEY),
        resetSetting(CONSTANTS.PROBABILISTIC_DAMAGE.SETTING.USE_AVERAGE_DAMAGE.KEY),
        resetSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY),
        resetSetting(CONSTANTS.RESTING.SETTING.USE_CAMP_SUPPLIES.KEY)
      ]);
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.reset.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.reset.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          reset();
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   */
  static async submit(event, form, formData) {
    const removeDeathSaves = {};
    const awardInspirationRollTypes = {};
    Object.entries(formData.object).forEach(([key, value]) => {
      if ( key.startsWith("removeDeathSaves") ) {
        const property = key.split(".").slice(1, 3).join(".");
        foundry.utils.setProperty(removeDeathSaves, property, value);
      } else if ( key.startsWith("awardInspirationRollTypes") ) {
        const property = key.split(".").slice(1, 3).join(".");
        foundry.utils.setProperty(awardInspirationRollTypes, property, value);
      }
    });

    await Promise.all([
      setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY,
        formData.object.levelUpHitPointsRerollMinimumValue),
      setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY, formData.object.levelUpHitPointsRerollOnce),
      setSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY,
        formData.object.levelUpHitPointsShowTakeAverage),
      setSetting(CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY, formData.object.rollNpcHp),
      setSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY, formData.object.applyBloodied),
      setSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY, formData.object.removeBloodiedOnDead),
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
      setSetting(CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_ZERO_HP.KEY, formData.object.applyExhaustionOnZeroHp),
      setSetting(CONSTANTS.EXHAUSTION.SETTING.APPLY_EXHAUSTION_ON_COMBAT_END.KEY,
        formData.object.applyExhaustionOnCombatEnd),
      setSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY, formData.object.applyMassiveDamage),
      setSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY, formData.object.applyNegativeHp),
      setSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY, formData.object.negativeHpHealFromZero),
      setSetting(CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY,
        formData.object.rerollInitiativeEachRound),
      setSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_DICE_VALUE.KEY,
        formData.object.awardInspirationD20Value),
      setSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY, awardInspirationRollTypes),
      setSetting(CONSTANTS.MOB_DAMAGE.SETTING.ENABLE.KEY, formData.object.enableMobDamage),
      setSetting(CONSTANTS.MOB_DAMAGE.SETTING.USE_AVERAGE_DAMAGE.KEY, formData.object.useAverageMobDamage),
      setSetting(CONSTANTS.PROBABILISTIC_DAMAGE.SETTING.ENABLE.KEY, formData.object.enableProbabilisticDamage),
      setSetting(
        CONSTANTS.PROBABILISTIC_DAMAGE.SETTING.USE_AVERAGE_DAMAGE.KEY,
        formData.object.useAverageProbabilisticDamage
      ),
      setSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY, formData.object.proneRotation),
      setSetting(CONSTANTS.RESTING.SETTING.USE_CAMP_SUPPLIES.KEY, formData.object.useCampSupplies)
    ]);

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
