import { CONSTANTS, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

const SETTING = CONSTANTS.HAZARDS.SETTING;

/**
 * Class representing the Configure Hazards form.
 */
export class HazardsForm extends CustomDnd5eForm {
  constructor(...args) {
    super(args);
    this.type = "hazards";
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      reset: HazardsForm.reset
    },
    form: {
      handler: HazardsForm.submit
    },
    id: `${MODULE.ID}-hazards-form`,
    window: {
      title: "CUSTOM_DND5E.menu.hazards.label"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: CONSTANTS.HAZARDS.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    const visibilityChoices = Object.fromEntries(
      Object.entries(CONST.REGION_VISIBILITY).map(([key, value]) => [value, `REGION.VISIBILITY.${key}.label`])
    );
    const restrictionTypeChoices = Object.fromEntries(
      CONST.EDGE_RESTRICTION_TYPES.map(type => [type, `REGION.RESTRICTION_TYPES.${type}.label`])
    );
    return {
      enable: getSetting(SETTING.ENABLE.KEY),
      tokenScale: getSetting(SETTING.TOKEN_SCALE.KEY) || 1,
      tokenHidden: getSetting(SETTING.TOKEN_HIDDEN.KEY),
      imageShape: getSetting(SETTING.IMAGE_SHAPE.KEY) || "none",
      imageShapeChoices: SETTING.IMAGE_SHAPE.CHOICES,
      imageBorderColor: getSetting(SETTING.IMAGE_BORDER_COLOR.KEY) || "#9f9275",
      imageBorderThickness: getSetting(SETTING.IMAGE_BORDER_THICKNESS.KEY) || 0,
      regionDistance: getSetting(SETTING.REGION_DISTANCE.KEY) ?? 5,
      regionDistanceUnits: canvas?.scene?.grid?.units || "",
      promptDistance: getSetting(SETTING.PROMPT_DISTANCE.KEY),
      regionVisibility: getSetting(SETTING.REGION_VISIBILITY.KEY),
      regionVisibilityChoices: visibilityChoices,
      regionRestricted: getSetting(SETTING.REGION_RESTRICTED.KEY),
      regionRestrictionType: getSetting(SETTING.REGION_RESTRICTION_TYPE.KEY) || "move",
      regionRestrictionTypeChoices: restrictionTypeChoices,
      regionRestrictionPriority: getSetting(SETTING.REGION_RESTRICTION_PRIORITY.KEY) ?? 0,
      affects: getSetting(SETTING.AFFECTS.KEY) || "all",
      affectsChoices: CONSTANTS.HAZARDS.AFFECTS,
      regionColorFromImage: getSetting(SETTING.REGION_COLOR_FROM_IMAGE.KEY)
    };
  }

  /* -------------------------------------------- */

  static async reset() {
    const reset = async () => {
      await Promise.all(Object.values(SETTING).map(setting => resetSetting(setting.KEY)));
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
    const visibilities = Object.values(CONST.REGION_VISIBILITY);
    const visibility = Number(data.regionVisibility);
    await Promise.all([
      setSetting(SETTING.ENABLE.KEY, data.enable),
      setSetting(SETTING.TOKEN_SCALE.KEY, Math.max(0.1, Number(data.tokenScale) || 1)),
      setSetting(SETTING.TOKEN_HIDDEN.KEY, data.tokenHidden),
      setSetting(SETTING.IMAGE_SHAPE.KEY,
        Object.keys(SETTING.IMAGE_SHAPE.CHOICES).includes(data.imageShape) ? data.imageShape : "none"),
      setSetting(SETTING.IMAGE_BORDER_COLOR.KEY, data.imageBorderColor || "#9f9275"),
      setSetting(SETTING.IMAGE_BORDER_THICKNESS.KEY, Math.max(0, Number(data.imageBorderThickness) || 0)),
      setSetting(SETTING.REGION_DISTANCE.KEY, Math.max(0, Number(data.regionDistance) || 0)),
      setSetting(SETTING.PROMPT_DISTANCE.KEY, data.promptDistance),
      setSetting(SETTING.REGION_VISIBILITY.KEY,
        visibilities.includes(visibility) ? visibility : CONST.REGION_VISIBILITY.LAYER_UNLOCKED),
      setSetting(SETTING.REGION_RESTRICTED.KEY, data.regionRestricted),
      setSetting(SETTING.REGION_RESTRICTION_TYPE.KEY,
        CONST.EDGE_RESTRICTION_TYPES.includes(data.regionRestrictionType) ? data.regionRestrictionType : "move"),
      setSetting(SETTING.REGION_RESTRICTION_PRIORITY.KEY,
        Math.max(0, Math.round(Number(data.regionRestrictionPriority) || 0))),
      setSetting(SETTING.AFFECTS.KEY, data.affects in CONSTANTS.HAZARDS.AFFECTS ? data.affects : "all"),
      setSetting(SETTING.REGION_COLOR_FROM_IMAGE.KEY, data.regionColorFromImage)
    ]);
    canvas.tokens?.placeables.forEach(token => token.renderFlags.set({ refresh: true }));
  }
}
