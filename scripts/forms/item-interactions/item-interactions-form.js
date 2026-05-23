import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../../constants.js";
import { getSetting, setSetting, resetSetting } from "../../utils.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";

const GIVE_ITEMS = CONSTANTS.GIVE_ITEMS.SETTING;
const DROP_ITEMS = CONSTANTS.DROP_ITEMS.SETTING;

/**
 * Class representing the Configure Item Interactions form.
 */
export class ItemInteractionsForm extends CustomDnd5eForm {
  constructor(...args) {
    super(args);
    this.type = "itemInteractions";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ITEM_INTERACTIONS.UUID;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      reset: ItemInteractionsForm.reset
    },
    form: {
      handler: ItemInteractionsForm.submit
    },
    id: `${MODULE.ID}-item-interactions-form`,
    window: {
      title: "CUSTOM_DND5E.menu.itemInteractions.label"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: CONSTANTS.ITEM_INTERACTIONS.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    const requireAcceptance = getSetting(GIVE_ITEMS.REQUIRE_ACCEPTANCE.KEY) ?? [];
    const requireAcceptanceDispositions = requireAcceptance.map(Number);
    return {
      giveItemsEnable: getSetting(GIVE_ITEMS.ENABLE.KEY),
      giveItemsRange: getSetting(GIVE_ITEMS.RANGE.KEY) || "",
      giveItemsRangeUnits: canvas?.scene?.grid?.units || "",
      giveItemsRequireAcceptanceFriendly: requireAcceptanceDispositions.includes(CONST.TOKEN_DISPOSITIONS.FRIENDLY),
      giveItemsRequireAcceptanceNeutral: requireAcceptanceDispositions.includes(CONST.TOKEN_DISPOSITIONS.NEUTRAL),
      giveItemsRequireAcceptanceHostile: requireAcceptanceDispositions.includes(CONST.TOKEN_DISPOSITIONS.HOSTILE),
      giveItemsRequireAcceptancePcToPc: requireAcceptance.includes("pcToPc"),
      giveItemsRequireAcceptancePcToNpc: requireAcceptance.includes("pcToNpc"),
      giveItemsRequireAcceptanceNpcToPc: requireAcceptance.includes("npcToPc"),
      dropItemsEnable: getSetting(DROP_ITEMS.ENABLE.KEY),
      dropItemsTakeRange: getSetting(DROP_ITEMS.RANGE.KEY) || "",
      dropItemsDropRange: getSetting(DROP_ITEMS.DROP_RANGE.KEY) || "",
      dropItemsDropRangeUnits: canvas?.scene?.grid?.units || "",
      dropItemsTokenScale: getSetting(DROP_ITEMS.TOKEN_SCALE.KEY) || 1,
      dropItemsAllowPlayerDrops: getSetting(DROP_ITEMS.ALLOW_PLAYER_DROPS.KEY),
      dropItemsChatNotifications: getSetting(DROP_ITEMS.CHAT_NOTIFICATIONS.KEY),
      dropItemsDroppableTypes: DROP_ITEMS.DROPPABLE_TYPES.CHOICES.map(type => ({
        type,
        label: `TYPES.Item.${type}`,
        checked: (getSetting(DROP_ITEMS.DROPPABLE_TYPES.KEY) ?? []).includes(type)
      }))
    };
  }

  /* -------------------------------------------- */

  static async reset() {
    const reset = async () => {
      await Promise.all([
        resetSetting(GIVE_ITEMS.ENABLE.KEY),
        resetSetting(GIVE_ITEMS.RANGE.KEY),
        resetSetting(GIVE_ITEMS.REQUIRE_ACCEPTANCE.KEY),
        resetSetting(DROP_ITEMS.ENABLE.KEY),
        resetSetting(DROP_ITEMS.RANGE.KEY),
        resetSetting(DROP_ITEMS.DROP_RANGE.KEY),
        resetSetting(DROP_ITEMS.TOKEN_SCALE.KEY),
        resetSetting(DROP_ITEMS.DROPPABLE_TYPES.KEY),
        resetSetting(DROP_ITEMS.ALLOW_PLAYER_DROPS.KEY),
        resetSetting(DROP_ITEMS.CHAT_NOTIFICATIONS.KEY)
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
      setSetting(GIVE_ITEMS.ENABLE.KEY, data.giveItemsEnable),
      setSetting(GIVE_ITEMS.RANGE.KEY, Math.max(0, Number(data.giveItemsRange) || 0)),
      setSetting(GIVE_ITEMS.REQUIRE_ACCEPTANCE.KEY, [
        data.giveItemsRequireAcceptanceFriendly ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : null,
        data.giveItemsRequireAcceptanceNeutral ? CONST.TOKEN_DISPOSITIONS.NEUTRAL : null,
        data.giveItemsRequireAcceptanceHostile ? CONST.TOKEN_DISPOSITIONS.HOSTILE : null,
        data.giveItemsRequireAcceptancePcToPc ? "pcToPc" : null,
        data.giveItemsRequireAcceptancePcToNpc ? "pcToNpc" : null,
        data.giveItemsRequireAcceptanceNpcToPc ? "npcToPc" : null
      ].filter(v => v !== null)),
      setSetting(DROP_ITEMS.ENABLE.KEY, data.dropItemsEnable),
      setSetting(DROP_ITEMS.RANGE.KEY, Math.max(0, Number(data.dropItemsTakeRange) || 0)),
      setSetting(DROP_ITEMS.DROP_RANGE.KEY, Math.max(0, Number(data.dropItemsDropRange) || 0)),
      setSetting(DROP_ITEMS.TOKEN_SCALE.KEY, Math.max(0.1, Number(data.dropItemsTokenScale) || 1)),
      setSetting(DROP_ITEMS.ALLOW_PLAYER_DROPS.KEY, data.dropItemsAllowPlayerDrops),
      setSetting(DROP_ITEMS.CHAT_NOTIFICATIONS.KEY, data.dropItemsChatNotifications),
      setSetting(DROP_ITEMS.DROPPABLE_TYPES.KEY,
        DROP_ITEMS.DROPPABLE_TYPES.CHOICES.filter(type => data[`dropItemsDroppableType_${type}`]))
    ]);

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
