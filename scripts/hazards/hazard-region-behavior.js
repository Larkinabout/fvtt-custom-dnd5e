import { CONSTANTS } from "../constants.js";
import { isPrimaryHandler } from "../utils.js";

const DEFAULT_ACTIVITY_TYPES = ["save", "damage", "attack"];

/**
 * The turn each token was last affected on.
 */
const lastAffected = new Map();

/* -------------------------------------------- */
/*  DATA MODEL                                  */
/* -------------------------------------------- */

/**
 * Region behavior that uses a hazard's activity on tokens.
 */
export class HazardRegionBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CUSTOM_DND5E.hazards.behavior"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    const { BooleanField, DocumentUUIDField, SchemaField, SetField, StringField } = foundry.data.fields;
    return {
      actor: new DocumentUUIDField({ type: "Actor" }),
      triggers: new SchemaField({
        enter: new StringField({ required: true, blank: true }),
        turnStart: new StringField({ required: true, blank: true }),
        turnEnd: new StringField({ required: true, blank: true }),
        oncePerTurn: new BooleanField({ initial: true })
      }),
      affects: new SchemaField({
        type: new StringField({ required: true, blank: false, initial: "all", choices: CONSTANTS.HAZARDS.AFFECTS }),
        include: new SetField(new DocumentUUIDField({ type: "Actor" })),
        exclude: new SetField(new DocumentUUIDField({ type: "Actor" }))
      })
    };
  }

  /* -------------------------------------------- */

  /** @override */
  static events = {
    [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: function(event) { return this.trigger("enter", event); },
    [CONST.REGION_EVENTS.TOKEN_TURN_START]: function(event) { return this.trigger("turnStart", event); },
    [CONST.REGION_EVENTS.TOKEN_TURN_END]: function(event) { return this.trigger("turnEnd", event); }
  };

  /* -------------------------------------------- */

  /**
   * Use the activity chosen for a trigger on the token that caused it.
   * @param {string} trigger enter, turnStart or turnEnd
   * @param {RegionEvent} event
   * @returns {Promise<void>}
   */
  async trigger(trigger, event) {
    if ( !isPrimaryHandler() ) return;
    const token = event.data.token;
    const key = this.triggers[trigger];
    if ( !key || !this.canAffect(token) ) return;

    const actor = await this.getActor();
    if ( !actor || (token.actor === actor) ) return;
    const activity = getHazardActivity(actor, key);
    if ( !activity ) return;
    if ( this.triggers.oncePerTurn && this.#alreadyAffected(token) ) return;

    const { TargetsField } = dnd5e.dataModels.chatMessage.fields;
    await activity.use(
      { create: { measuredTemplate: false }, consume: false, _bypassTargeting: true },
      { configure: false },
      { data: { system: { targets: TargetsField.getDescriptors([token]) } } }
    );
  }

  /* -------------------------------------------- */

  /**
   * Get the actor whose activities the hazard uses.
   * @returns {Promise<Actor|null>}
   */
  async getActor() {
    return this.region?.attachment.token?.actor ?? (this.actor ? await fromUuid(this.actor) : null);
  }

  /* -------------------------------------------- */

  /**
   * Get the hazard's actor without waiting.
   * @returns {Actor|null}
   */
  getActorSync() {
    const actor = this.region?.attachment.token?.actor ?? (this.actor ? fromUuidSync(this.actor) : null);
    return actor?.items ? actor : null;
  }

  /* -------------------------------------------- */

  /**
   * Whether a token is a creature the hazard can affect.
   * @param {TokenDocument} token
   * @returns {boolean}
   */
  canAffect(token) {
    const actor = token?.actor;
    if ( !actor ) return false;
    if ( token === this.region.attachment.token ) return false;
    if ( actor.type === CONSTANTS.DROP_ITEMS.ACTOR_TYPE ) return false;
    if ( isHazardActor(actor) ) return false;

    const { type, include, exclude } = this.affects;
    const uuids = [actor.uuid, token.baseActor?.uuid];
    if ( uuids.some(uuid => exclude.has(uuid)) ) return false;
    if ( uuids.some(uuid => include.has(uuid)) ) return true;
    return (type === "all") || (actor.type === type);
  }

  /* -------------------------------------------- */

  /**
   * Check whether the token has already been affected on the current combat turn.
   * @param {TokenDocument} token
   * @returns {boolean}
   */
  #alreadyAffected(token) {
    const combat = game.combat?.started ? game.combat : null;
    if ( !combat ) return false;
    const key = `${this.behavior.uuid}.${token.id}`;
    const turn = `${combat.id}.${combat.round}.${combat.turn}`;
    if ( lastAffected.get(key) === turn ) return true;
    lastAffected.set(key, turn);
    return false;
  }
}

/* -------------------------------------------- */
/*  HELPERS                                     */
/* -------------------------------------------- */

/**
 * Whether an actor uses the custom "Hazard" creature type.
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isHazardActor(actor) {
  const type = actor?.system?.details?.type;
  return (type?.value === "custom") && (type.custom?.trim().toLowerCase() === "hazard");
}

/* -------------------------------------------- */

/**
 * List every activity on an actor's items as a select option.
 * @param {Actor} actor
 * @returns {{value: string, label: string, group: string, type: string}[]} Options
 */
export function getActivityOptions(actor) {
  const options = [];
  for ( const item of actor?.items ?? [] ) {
    for ( const activity of item.system.activities ?? [] ) {
      options.push({
        value: `${item.id}.${activity.id}`,
        label: activity.name,
        group: item.name,
        type: activity.type
      });
    }
  }
  return options;
}

/* -------------------------------------------- */

/**
 * Find an activity on a hazard actor.
 * @param {Actor} actor
 * @param {string} key Item id and activity id joined by a dot
 * @returns {Activity|null}
 */
export function getHazardActivity(actor, key) {
  const [itemId, activityId] = key.split(".");
  return actor.items.get(itemId)?.system.activities?.get(activityId) ?? null;
}

/* -------------------------------------------- */

/**
 * Get the default activity.
 * @param {Actor} actor
 * @returns {string} Item id and activity id joined by a dot, or an empty string
 */
export function getDefaultActivity(actor) {
  return getActivityOptions(actor).find(option => DEFAULT_ACTIVITY_TYPES.includes(option.type))?.value ?? "";
}
