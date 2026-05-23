/**
 * Data model for the Item Actor used by the Drop Items feature.
 */
export class ItemActorDataModel extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      droppedBy: new fields.StringField({ required: false, blank: true, initial: "" }),
      droppedAt: new fields.NumberField({ required: false, integer: true, initial: 0, nullable: false }),
      itemUuid: new fields.StringField({ required: false, blank: true, initial: "" }),
      isContainer: new fields.BooleanField({ required: false, initial: false }),
      locked: new fields.BooleanField({ required: false, initial: false }),
      affixed: new fields.BooleanField({ required: false, initial: false })
    };
  }

  /* -------------------------------------------- */

  /**
   * Stub the dnd5e-specific caches so the system's `ready` hook doesn't
   * throw for non-dnd5e actor types.
   * @inheritdoc
   */
  prepareBaseData() {
    const actor = this.parent;
    if ( !actor ) return;
    if ( !actor.sourcedItems ) {
      const map = new Map();
      map._redirectKeys = () => {};
      actor.sourcedItems = map;
    }
    if ( !actor.identifiedItems ) actor.identifiedItems = new Map();
  }
}
