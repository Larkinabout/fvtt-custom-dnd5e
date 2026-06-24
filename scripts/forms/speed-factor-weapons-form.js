import { CONSTANTS, MODULE } from "../constants.js";
import { ConfigForm, createListSettingConfig } from "./config-form.js";
import { buildDefaultWeapons, getWeaponModifiers } from "../gameplay/speed-factor-initiative.js";

const constants = CONSTANTS.SPEED_FACTOR_INITIATIVE;

/* -------------------------------------------- */
/*  CONFIG SHIM                                 */
/* -------------------------------------------- */

/**
 * Config descriptor for the Speed Factor weapons list.
 * @type {object}
 */
const weaponsConfig = createListSettingConfig({
  settingKey: constants.SETTING.WEAPONS.KEY,
  uuid: constants.UUID,
  getDefaults: buildDefaultWeapons
});

/* -------------------------------------------- */
/*  FORM                                        */
/* -------------------------------------------- */

/**
 * Edit-in-list table of weapon initiative modifiers derived from the system's base weapons.
 */
export class SpeedFactorWeaponsForm extends ConfigForm {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.config = weaponsConfig;
    this.includeConfig = false;
    this.editInList = true;
    this.disableCreate = true;
    this.listTitle = "CUSTOM_DND5E.speedFactorInitiative.weaponsForm.title";
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-speed-factor-weapons-form`,
    window: {
      title: "CUSTOM_DND5E.speedFactorInitiative.weaponsForm.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.WEAPONS_FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Build the weapon list attaching the modifier to each entry.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const context = await super._prepareContext();

    const items = {};
    for ( const weapon of getWeaponModifiers() ) {
      items[weapon.key] = {
        label: weapon.label,
        visible: weapon.visible,
        system: true,
        fields: [await this._resolveField(
          { name: "modifier", type: "number", step: 1, label: "CUSTOM_DND5E.speedFactorInitiative.field.modifierShort.label" },
          { modifier: weapon.modifier },
          weapon.key,
          true,
          null,
          "flex0"
        )]
      };
    }

    context.items = items;
    return context;
  }
}
