import { CONSTANTS } from "../constants.js";
import { getActivityOptions } from "./hazard-region-behavior.js";

const ACTIVITY_FIELDS = ["enter", "turnStart", "turnEnd"];

/**
 * Config sheet for the Hazard region behavior.
 */
export class HazardConfig extends foundry.applications.sheets.RegionBehaviorConfig {
  /** @override */
  static PARTS = {
    form: {
      template: CONSTANTS.HAZARDS.TEMPLATE.CONFIG,
      scrollable: [""]
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getFields() {
    const fieldsets = super._getFields();
    const index = fieldsets.findIndex(fieldset => fieldset.fields?.some(node => node.field.name === "actor"));
    if ( index < 0 ) return fieldsets;

    const [system] = fieldsets.splice(index, 1);
    const options = [
      { value: "", label: game.i18n.localize("CUSTOM_DND5E.hazards.noActivity") },
      ...getActivityOptions(this.document.system.getActorSync())
    ];
    const attached = !!this.document.region?.attachment.token;
    const groups = new Map();

    for ( const node of system.fields ) {
      const { name, parent } = node.field;
      if ( ACTIVITY_FIELDS.includes(name) ) node.options = options;
      if ( (name === "actor") && attached ) continue;
      const group = parent === this.document.system.schema ? null : parent;
      const key = group?.name ?? "";
      if ( !groups.has(key) ) groups.set(key, { fieldset: true, legend: group?.label || system.legend, fields: [] });
      groups.get(key).fields.push(node);
    }

    fieldsets.push(...groups.values());
    return fieldsets;
  }
}
