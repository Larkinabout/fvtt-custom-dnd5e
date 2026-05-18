import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

const TOKEN = CONSTANTS.TOKEN.SETTING;
const TD = CONSTANTS.TOKEN_DISTANCE.SETTING;
const RAD = CONSTANTS.RADIAL_STATUS_EFFECTS.SETTING;
const RULER = CONSTANTS.RULER_TRAVEL_TIME.SETTING;
const CURSOR = CONSTANTS.SHOW_PRESSED_KEYS.SETTING;
const CHAT = CONSTANTS.CHAT_COMMANDS.SETTING;
const GIVE = CONSTANTS.GIVE_ITEM.SETTING;

/**
 * Class representing the Configure Interface Form.
 */
export class InterfaceForm extends CustomDnd5eForm {
  constructor(...args) {
    super(args);
    this.type = "interface";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.INTERFACE.UUID;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      reset: InterfaceForm.reset
    },
    form: {
      handler: InterfaceForm.submit
    },
    id: `${MODULE.ID}-interface-form`,
    window: {
      title: "CUSTOM_DND5E.form.interface.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: CONSTANTS.INTERFACE.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    return {
      tokenBorderEnable: getSetting(TOKEN.BORDER_ENABLE.KEY),
      tokenBorderShape: getSetting(TOKEN.BORDER_SHAPE.KEY),
      tokenBorderThickness: getSetting(TOKEN.BORDER_THICKNESS.KEY),
      tokenBorderScale: getSetting(TOKEN.BORDER_SCALE.KEY),
      tokenBorderScaleWithToken: getSetting(TOKEN.BORDER_SCALE_WITH_TOKEN.KEY),
      radialStatusEffects: getSetting(RAD.KEY),
      radialStatusEffectsClickToToggle: getSetting(RAD.CLICK_TO_TOGGLE.KEY),
      tokenHudImprovements: getSetting(TOKEN.HUD_IMPROVEMENTS.KEY),
      tokenHudScale: getSetting(TOKEN.HUD_SCALE.KEY),
      enableTokenDistance: getSetting(TD.ENABLE.KEY),
      tokenDistanceViewRole: getSetting(TD.VIEW_ROLE.KEY),
      applyElevationToSelectedTokens: getSetting(TOKEN.APPLY_ELEVATION_TO_SELECTED_TOKENS.KEY),
      toggleStatusEffectOnSelectedTokens: getSetting(TOKEN.TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS.KEY),
      rulerTravelTime: getSetting(RULER.KEY),
      showPressedKeys: getSetting(CURSOR.KEY),
      chatCommands: getSetting(CHAT.KEY),
      giveItem: getSetting(GIVE.ENABLE.KEY),
      giveItemRange: getSetting(GIVE.RANGE.KEY) || "",
      giveItemRangeUnits: canvas?.scene?.grid?.units || "",
      giveItemRequireAcceptanceFriendly: (getSetting(GIVE.REQUIRE_ACCEPTANCE.KEY) ?? []).map(Number).includes(CONST.TOKEN_DISPOSITIONS.FRIENDLY),
      giveItemRequireAcceptanceNeutral: (getSetting(GIVE.REQUIRE_ACCEPTANCE.KEY) ?? []).map(Number).includes(CONST.TOKEN_DISPOSITIONS.NEUTRAL),
      giveItemRequireAcceptanceHostile: (getSetting(GIVE.REQUIRE_ACCEPTANCE.KEY) ?? []).map(Number).includes(CONST.TOKEN_DISPOSITIONS.HOSTILE),
      giveItemRequireAcceptancePcToPc: (getSetting(GIVE.REQUIRE_ACCEPTANCE.KEY) ?? []).includes("pcToPc"),
      giveItemRequireAcceptancePcToNpc: (getSetting(GIVE.REQUIRE_ACCEPTANCE.KEY) ?? []).includes("pcToNpc"),
      giveItemRequireAcceptanceNpcToPc: (getSetting(GIVE.REQUIRE_ACCEPTANCE.KEY) ?? []).includes("npcToPc"),
      selects: {
        tokenBorderShape: {
          choices: {
            circle: "CUSTOM_DND5E.circle",
            square: "CUSTOM_DND5E.square"
          }
        },
        tokenDistanceViewRole: {
          choices: {
            1: "USER.RolePlayer",
            2: "USER.RoleTrusted",
            3: "USER.RoleAssistant",
            4: "USER.RoleGamemaster"
          }
        }
      }
    };
  }

  /* -------------------------------------------- */

  static async reset() {
    const reset = async () => {
      await Promise.all([
        resetSetting(TOKEN.BORDER_ENABLE.KEY),
        resetSetting(TOKEN.BORDER_SHAPE.KEY),
        resetSetting(TOKEN.BORDER_THICKNESS.KEY),
        resetSetting(TOKEN.BORDER_SCALE.KEY),
        resetSetting(TOKEN.BORDER_SCALE_WITH_TOKEN.KEY),
        resetSetting(RAD.KEY),
        resetSetting(RAD.CLICK_TO_TOGGLE.KEY),
        resetSetting(TOKEN.HUD_IMPROVEMENTS.KEY),
        resetSetting(TOKEN.HUD_SCALE.KEY),
        resetSetting(TD.ENABLE.KEY),
        resetSetting(TD.VIEW_ROLE.KEY),
        resetSetting(TOKEN.APPLY_ELEVATION_TO_SELECTED_TOKENS.KEY),
        resetSetting(TOKEN.TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS.KEY),
        resetSetting(RULER.KEY),
        resetSetting(CURSOR.KEY),
        resetSetting(CHAT.KEY),
        resetSetting(GIVE.ENABLE.KEY),
        resetSetting(GIVE.RANGE.KEY),
        resetSetting(GIVE.REQUIRE_ACCEPTANCE.KEY)
      ]);
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CUSTOM_DND5E.dialog.reset.title") },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.reset.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => reset()
      },
      no: { label: game.i18n.localize("CUSTOM_DND5E.no") }
    });
  }

  /* -------------------------------------------- */

  static async submit(event, form, formData) {
    const data = formData.object;
    await Promise.all([
      setSetting(TOKEN.BORDER_ENABLE.KEY, data.tokenBorderEnable),
      setSetting(TOKEN.BORDER_SHAPE.KEY, data.tokenBorderShape),
      setSetting(TOKEN.BORDER_THICKNESS.KEY, Number(data.tokenBorderThickness) || 6),
      setSetting(TOKEN.BORDER_SCALE.KEY, Number(data.tokenBorderScale) || 1),
      setSetting(TOKEN.BORDER_SCALE_WITH_TOKEN.KEY, data.tokenBorderScaleWithToken),
      setSetting(RAD.KEY, data.radialStatusEffects),
      setSetting(RAD.CLICK_TO_TOGGLE.KEY, data.radialStatusEffectsClickToToggle),
      setSetting(TOKEN.HUD_IMPROVEMENTS.KEY, data.tokenHudImprovements),
      setSetting(TOKEN.HUD_SCALE.KEY, Number(data.tokenHudScale) || 1.25),
      setSetting(TD.ENABLE.KEY, data.enableTokenDistance),
      setSetting(TD.VIEW_ROLE.KEY, Number(data.tokenDistanceViewRole)),
      setSetting(TOKEN.APPLY_ELEVATION_TO_SELECTED_TOKENS.KEY, data.applyElevationToSelectedTokens),
      setSetting(TOKEN.TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS.KEY, data.toggleStatusEffectOnSelectedTokens),
      setSetting(RULER.KEY, data.rulerTravelTime),
      setSetting(CURSOR.KEY, data.showPressedKeys),
      setSetting(CHAT.KEY, data.chatCommands),
      setSetting(GIVE.ENABLE.KEY, data.giveItem),
      setSetting(GIVE.RANGE.KEY, Math.max(0, Number(data.giveItemRange) || 0)),
      setSetting(GIVE.REQUIRE_ACCEPTANCE.KEY, [
        data.giveItemRequireAcceptanceFriendly ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : null,
        data.giveItemRequireAcceptanceNeutral ? CONST.TOKEN_DISPOSITIONS.NEUTRAL : null,
        data.giveItemRequireAcceptanceHostile ? CONST.TOKEN_DISPOSITIONS.HOSTILE : null,
        data.giveItemRequireAcceptancePcToPc ? "pcToPc" : null,
        data.giveItemRequireAcceptancePcToNpc ? "pcToNpc" : null,
        data.giveItemRequireAcceptanceNpcToPc ? "npcToPc" : null
      ].filter(v => v !== null))
    ]);

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
