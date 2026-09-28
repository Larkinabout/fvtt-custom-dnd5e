import { CONSTANTS, MODULE } from "../constants.js";
import { addHelpButton, getSetting, hideApplications, queryGM } from "../utils.js";
import {
  evaluateProbabilisticDamage,
  getBestSave,
  getProbabilisticFactor,
  isUseKeyHeld,
  ON_SAVE_MULTIPLIER,
  useAverageDamageFor
} from "../gameplay/probalistic-damage.js";
import { TargetingMode } from "./targeting-mode.js";
import { AttackChoiceDialog } from "../applications/attack-choice-dialog.js";
import { getDistanceLabelHeight } from "../interface/token-distance.js";

const constants = CONSTANTS.ACTIVITIES;

const TYPE = "custom-dnd5e-multiattack";

/**
 * Activity types that can be added to a Multiattack.
 * @type {string[]}
 */
const ATTACK_TYPES = ["attack", "save", "damage"];

/**
 * Milliseconds to leave an attack's 3D dice showing before clearing them for the next attack.
 * @type {number}
 */
const DICE_PAUSE = 1000;

/* -------------------------------------------- */
/*  DATA MODEL                                  */
/* -------------------------------------------- */

/**
 * Data model for a multiattack activity.
 */
class BaseMultiattackActivityData extends dnd5e.dataModels.activity.BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    const { ArrayField, BooleanField, SchemaField, StringField } = foundry.data.fields;
    return {
      ...super.defineSchema(),
      multiattack: new SchemaField({
        attacks: new ArrayField(new SchemaField({
          item: new StringField(),
          activity: new StringField()
        })),
        probabilistic: new BooleanField({ initial: false }),
        autoApply: new BooleanField({ initial: false })
      })
    };
  }
}

/* -------------------------------------------- */
/*  ACTIVITY SHEET                              */
/* -------------------------------------------- */

/**
 * Sheet for the multiattack activity.
 */
class MultiattackActivitySheet extends dnd5e.applications.activity.ForwardSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["custom-dnd5e-multiattack-activity"],
    actions: {
      addAttack: MultiattackActivitySheet.addAttack,
      deleteAttack: MultiattackActivitySheet.deleteAttack
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: constants.TEMPLATE.MULTIATTACK_EFFECT
    }
  };

  /* -------------------------------------------- */
  /*  RENDERING                                   */
  /* -------------------------------------------- */

  /**
   * Hide the scaling options.
   * @inheritDoc
   */
  async _prepareActivationContext(context, options) {
    context = await super._prepareActivationContext(context, options);
    context.showScaling = false;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context, options) {
    context = await super._prepareEffectContext(context, options);
    const choices = getAttackChoices(this.item.actor);
    context.attackOptions = choices.map(choice => ({ value: choice.key, label: choice.label }));
    context.attacks = this.activity.multiattack.attacks.map((attack, index) => {
      const key = attackKey(attack);
      const choice = choices.find(c => c.key === key);
      const unknown = { value: key, label: game.i18n.localize("CUSTOM_DND5E.activities.multiattack.unknownAttack") };
      return {
        index,
        key,
        img: choice?.img ?? "icons/svg/hazard.svg",
        options: choice ? context.attackOptions : [unknown, ...context.attackOptions]
      };
    });
    context.emptyLabel = this.item.actor
      ? "CUSTOM_DND5E.activities.multiattack.noAttacks"
      : "CUSTOM_DND5E.activities.multiattack.noActor";
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    addHelpButton(this.element, constants.PAGE_UUID.MULTIATTACK);
    for ( const select of this.element.querySelectorAll("select[data-attack-index]") ) {
      select.addEventListener("change", event => this.#onChangeAttack(event));
    }
  }

  /* -------------------------------------------- */
  /*  EVENT HANDLERS                              */
  /* -------------------------------------------- */

  /**
   * Swap the attack in a row for the one picked in its dropdown.
   * @param {Event} event
   */
  async #onChangeAttack(event) {
    event.stopPropagation();
    const index = Number(event.currentTarget.dataset.attackIndex);
    const [item, activity] = event.currentTarget.value.split(".");
    const attacks = foundry.utils.deepClone(this.activity._source.multiattack.attacks);
    attacks[index] = { item, activity };
    await this.activity.update({ "multiattack.attacks": attacks });
  }

  /* -------------------------------------------- */

  /**
   * Add an attack row, copying the last row so repeated attacks only need a click each.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async addAttack(event, target) {
    const attacks = foundry.utils.deepClone(this.activity._source.multiattack.attacks);
    const next = attacks.at(-1) ?? getAttackChoices(this.item.actor)[0];
    if ( !next ) return;
    attacks.push({ item: next.item, activity: next.activity });
    await this.activity.update({ "multiattack.attacks": attacks });
  }

  /* -------------------------------------------- */

  /**
   * Remove an attack row.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async deleteAttack(event, target) {
    const index = Number(target.dataset.index);
    const attacks = foundry.utils.deepClone(this.activity._source.multiattack.attacks);
    attacks.splice(index, 1);
    await this.activity.update({ "multiattack.attacks": attacks });
  }
}

/* -------------------------------------------- */
/*  ACTIVITY                                    */
/* -------------------------------------------- */

/**
 * Activity that makes several attacks against chosen targets and posts the results in one chat card.
 */
export class MultiattackActivity extends dnd5e.documents.activity.ActivityMixin(BaseMultiattackActivityData) {
  /* -------------------------------------------- */
  /*  MODEL CONFIGURATION                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CUSTOM_DND5E.activities.multiattack"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: TYPE,
      img: "modules/custom-dnd5e/media/icons/activity/multiattack.svg",
      title: "CUSTOM_DND5E.activities.multiattack.title",
      hint: "CUSTOM_DND5E.activities.multiattack.hint",
      sheetClass: MultiattackActivitySheet
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  ACTIVATION                                  */
  /* -------------------------------------------- */

  /**
   * Pick targets and attacks first, then use the activity without its own chat card.
   * @override
   */
  async use(usage = {}, dialog = {}, message = {}) {
    if ( !this.item.isEmbedded || !this.item.isOwner || !this.canUse ) return super.use(usage, dialog, message);

    const pool = this.multiattack.attacks.filter(attack => getAttackActivity(this.actor, attack));
    if ( !pool.length ) {
      ui.notifications.warn("CUSTOM_DND5E.activities.multiattack.warning.noAttacks", { localize: true });
      return;
    }

    const probabilistic = this.multiattack.probabilistic || isUseKeyHeld();
    const selections = await chooseAttacks(this.actor, pool);
    if ( !selections?.length ) return;

    return super.use(
      { ...usage, multiattack: { probabilistic, selections } },
      dialog,
      { ...message, create: false }
    );
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    const { probabilistic, selections } = config.multiattack ?? {};
    if ( !selections?.length ) return;
    await rollMultiattack(this, selections, { probabilistic, event: config.event });
  }
}

/* -------------------------------------------- */
/*  ATTACK CHOICES                              */
/* -------------------------------------------- */

/**
 * Get the attack, save and damage activities on the actor's items that can be added to a Multiattack.
 * @param {Actor} actor
 * @returns {object[]} Choices
 */
function getAttackChoices(actor) {
  if ( !actor ) return [];
  const choices = [];
  for ( const item of actor.items ) {
    for ( const activity of getItemAttackActivities(item) ) {
      choices.push({
        key: attackKey({ item: item.id, activity: activity.id }),
        item: item.id,
        activity: activity.id,
        img: item.img,
        label: getAttackLabel(activity)
      });
    }
  }
  return choices.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
}

/* -------------------------------------------- */

/**
 * Get an item's activities that can be added to a Multiattack.
 * @param {Item} item
 * @returns {Activity[]} Activities
 */
function getItemAttackActivities(item) {
  return item.system.activities?.filter(activity => ATTACK_TYPES.includes(activity.type)) ?? [];
}

/* -------------------------------------------- */

/**
 * Get the name shown for an attack. Includes the activity name when the item has more than one attack.
 * @param {Activity} activity
 * @returns {string} Attack name
 */
function getAttackLabel(activity) {
  const item = activity.item;
  return getItemAttackActivities(item).length > 1 ? `${item.name}: ${activity.name}` : item.name;
}

/* -------------------------------------------- */

/**
 * Get the key for an attack row.
 * @param {{item: string, activity: string}} attack
 * @returns {string} Key in the form "itemId.activityId"
 */
function attackKey({ item, activity }) {
  return `${item}.${activity}`;
}

/* -------------------------------------------- */

/**
 * Find the activity for an attack.
 * @param {Actor} actor
 * @param {{item: string, activity: string}} attack
 * @returns {Activity|undefined}
 */
function getAttackActivity(actor, { item, activity }) {
  return actor?.items.get(item)?.system.activities?.get(activity);
}

/* -------------------------------------------- */
/*  TARGET SELECTION                            */
/* -------------------------------------------- */

/**
 * Pair each attack in the pool with a target using the targeting prompt or the user's current targets.
 * @param {Actor} actor
 * @param {object[]} pool Attack rows
 * @returns {Promise<object[]|null>} Selections of item id, activity id and token UUID, or null if cancelled
 */
async function chooseAttacks(actor, pool) {
  const setting = getSetting(constants.SETTING.CONFIG.KEY);
  if ( setting?.targeting && canvas.ready ) return chooseAttacksWithPrompt(actor, pool, setting);
  return chooseAttacksFromTargets(actor, pool);
}

/* -------------------------------------------- */

/**
 * Target one token at a time, then pick which of the remaining attacks to make against it.
 * @param {Actor} actor
 * @param {object[]} pool Attack rows
 * @param {object} setting Activities setting
 * @returns {Promise<object[]|null>} Selections, or null if cancelled
 */
async function chooseAttacksWithPrompt(actor, pool, setting) {
  const restoreApplications = await hideApplications();
  try {
    return await targetEachAttack(actor, pool, setting);
  } finally {
    restoreApplications();
  }
}

/* -------------------------------------------- */

/**
 * Run the targeting prompt once for each attack, asking which attack to use when more than one kind is left.
 * @param {Actor} actor
 * @param {object[]} pool Attack rows
 * @param {object} setting Activities setting
 * @returns {Promise<object[]|null>} Selections, or null if cancelled
 */
async function targetEachAttack(actor, pool, setting) {
  const remaining = [...pool];
  const selections = [];
  const markers = createAttackMarkers();
  const typeLabel = game.i18n.localize(CONFIG.DND5E.individualTargetTypes.creature?.label ?? "Creature");
  ui.notifications.info(game.i18n.localize("CUSTOM_DND5E.activities.multiattack.selectTargets"));

  try {
    while ( remaining.length ) {
      canvas.tokens.setTargets([]);
      const label = game.i18n.format("CUSTOM_DND5E.activities.multiattack.attackCount", {
        current: selections.length + 1, total: pool.length
      });
      const completed = await TargetingMode.activate({ count: 1, typeLabel, label, notify: false, hideApps: false });
      if ( !completed ) return null;

      // Enter with nothing targeted finishes early
      const token = game.user.targets.first();
      if ( !token ) break;

      const attack = await chooseAttack(actor, remaining, token);
      if ( !attack ) return null;
      remaining.splice(remaining.indexOf(attack), 1);
      selections.push({ ...attack, tokenUuid: token.document.uuid });
      markers.add(token, selections.length);
    }
  } finally {
    markers.clear();
  }

  if ( setting.clearTargets === "after" ) canvas.tokens.setTargets([]);
  return selections;
}

/* -------------------------------------------- */

/**
 * Create markers shown on tokens during targeting.
 * @returns {{add: Function, clear: Function}} Functions to add an attack number to a token and remove all markers
 */
function createAttackMarkers() {
  const markers = new Map();
  const resolution = (window.devicePixelRatio || 1) * 4;
  const fontSize = Math.max(12, Math.round((canvas.dimensions?.size ?? 100) * 0.22));
  const textStyle = {
    fontFamily: "Signika, sans-serif",
    fontSize,
    fontWeight: "bold",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: Math.max(2, Math.round(fontSize / 8)),
    lineJoin: "round",
    miterLimit: 1,
    padding: 4
  };
  const iconStyle = {
    ...textStyle,
    fontFamily: ["Font Awesome 7 Pro", "Font Awesome 6 Pro", "Font Awesome 6 Free"],
    fontSize: Math.round(fontSize * 0.875),
    fontWeight: "900"
  };

  const strength = 0.4;
  const tintMatrix = [
    1 - strength, 0, 0, 0, strength * 0.2,
    0, 1 - strength, 0, 0, strength * 0.8,
    0, 0, 1 - strength, 0, strength * 0.2,
    0, 0, 0, 1, 0
  ];

  /**
   * Remove a token's tint and label.
   * @param {object} marker
   */
  const removeVisuals = marker => {
    if ( marker.mesh && !marker.mesh.destroyed ) {
      const filters = marker.mesh.filters?.filter(filter => filter !== marker.filter);
      marker.mesh.filters = filters?.length ? filters : null;
    }
    marker.filter?.destroy();
    if ( marker.label && !marker.label.destroyed ) {
      marker.label.parent?.removeChild(marker.label);
      marker.label.destroy({ children: true });
    }
    marker.mesh = marker.filter = marker.label = null;
  };

  /**
   * Tint the token image green and draw the label.
   * @param {Token} token
   * @param {object} marker
   */
  const drawVisuals = (token, marker) => {
    removeVisuals(marker);

    if ( token.mesh ) {
      const filter = new PIXI.ColorMatrixFilter();
      filter.matrix = tintMatrix;
      token.mesh.filters = [...(token.mesh.filters ?? []), filter];
      marker.mesh = token.mesh;
      marker.filter = filter;
    }

    const label = new PIXI.Container();
    label.eventMode = "none";
    const icon = new PIXI.Text("\uf05b", new PIXI.TextStyle(iconStyle));
    const text = new PIXI.Text(marker.numbers.join(", "), new PIXI.TextStyle(textStyle));
    for ( const part of [icon, text] ) {
      part.resolution = resolution;
      part.roundPixels = true;
    }
    label.addChild(icon, text);

    const gap = Math.round(fontSize / 8);
    const height = Math.max(icon.height, text.height);
    icon.position.set(0, (height - icon.height) / 2);
    text.position.set(icon.width + gap, (height - text.height) / 2);
    label.pivot.set((icon.width + gap + text.width) / 2, height / 2);

    const distanceHeight = getDistanceLabelHeight(token);
    const offset = distanceHeight ? (distanceHeight / 2) + gap + (height / 2) : 0;
    label.position.set(token.w / 2, (token.h / 2) - offset);

    token.addChild(label);
    marker.label = label;
  };

  const hookId = Hooks.on("drawToken", token => {
    const marker = markers.get(token.document.id);
    if ( marker ) drawVisuals(token, marker);
  });

  return {
    add(token, number) {
      const id = token.document.id;
      const marker = markers.get(id) ?? { numbers: [] };
      markers.set(id, marker);
      marker.numbers.push(number);
      drawVisuals(token, marker);
    },
    clear() {
      Hooks.off("drawToken", hookId);
      for ( const marker of markers.values() ) removeVisuals(marker);
      markers.clear();
    }
  };
}

/* -------------------------------------------- */

/**
 * Ask which of the remaining attacks to make against a target. Skips the question when only one kind is left.
 * @param {Actor} actor
 * @param {object[]} remaining Attack rows not yet used
 * @param {Token} token Target token
 * @returns {Promise<object|null>} Chosen attack row, or null if the dialog was closed
 */
async function chooseAttack(actor, remaining, token) {
  const distinct = [...new Map(remaining.map(attack => [attackKey(attack), attack])).values()];
  if ( distinct.length === 1 ) return distinct[0];

  const choices = distinct.map(attack => {
    const activity = getAttackActivity(actor, attack);
    const count = remaining.filter(a => attackKey(a) === attackKey(attack)).length;
    return { id: attackKey(attack), name: `${getAttackLabel(activity)} (${count})`, img: activity?.item.img };
  });
  const key = await AttackChoiceDialog.create(choices, {
    window: {
      title: game.i18n.format("CUSTOM_DND5E.activities.multiattack.chooseAttack", { name: token.document.name }),
      icon: token.document.texture?.src
    }
  });
  return distinct.find(attack => attackKey(attack) === key) ?? null;
}

/* -------------------------------------------- */

/**
 * Use the current targets. With one target every attack goes to it,
 * otherwise a dialog asks which target each attack is made against.
 * @param {Actor} actor
 * @param {object[]} pool Attack rows
 * @returns {Promise<object[]|null>} Selections, or null if cancelled
 */
async function chooseAttacksFromTargets(actor, pool) {
  const targets = Array.from(game.user.targets);
  if ( !targets.length ) {
    ui.notifications.warn("CUSTOM_DND5E.activities.multiattack.warning.noTargets", { localize: true });
    return null;
  }

  if ( targets.length === 1 ) return pool.map(attack => ({ ...attack, tokenUuid: targets[0].document.uuid }));

  const { createFormGroup, createSelectInput } = foundry.applications.fields;
  const options = targets.map(token => ({ value: token.document.uuid, label: token.document.name }));
  const content = pool.map((attack, index) => createFormGroup({
    label: getAttackLabel(getAttackActivity(actor, attack)),
    input: createSelectInput({
      name: `target${index}`,
      options,
      value: options[index % options.length].value,
      blank: game.i18n.localize("CUSTOM_DND5E.none")
    })
  }).outerHTML).join("");

  const result = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CUSTOM_DND5E.activities.multiattack.assignTargets") },
    content,
    ok: { label: game.i18n.localize("CUSTOM_DND5E.activities.multiattack.rollAttacks") },
    rejectClose: false
  });
  if ( !result ) return null;

  return pool
    .map((attack, index) => ({ ...attack, tokenUuid: result[`target${index}`] }))
    .filter(selection => selection.tokenUuid);
}

/* -------------------------------------------- */
/*  ROLLING                                     */
/* -------------------------------------------- */

/**
 * Roll every selected attack and post the results in a single chat card.
 * @param {MultiattackActivity} multiattack
 * @param {object[]} selections Item id, activity id and token UUID for each attack
 * @param {object} options
 * @param {boolean} options.probabilistic Use probabilistic damage
 * @param {Event} [options.event]
 */
async function rollMultiattack(multiattack, selections, { probabilistic, event }) {
  const actor = multiattack.actor;
  const entries = [];
  const entryRolls = [];

  for ( const selection of selections ) {
    const activity = getAttackActivity(actor, selection);
    const tokenDoc = fromUuidSync(selection.tokenUuid);
    const target = tokenDoc?.actor;
    if ( !activity || !target ) continue;

    const result = probabilistic
      ? await rollProbabilisticAttack(activity, target, event)
      : await rollAttack(activity, target, event);
    entryRolls.push(result.rolls);

    entries.push({
      targets: dnd5e.dataModels.chatMessage.fields.TargetsField.getDescriptors([tokenDoc]),
      activityUuid: activity.uuid,
      attack: getAttackLabel(activity),
      result: result.result,
      isMiss: result.isMiss,
      damages: getDamageDescriptions(result.damageRolls),
      multiplier: result.multiplier,
      d20Roll: result.d20Roll?.toJSON() ?? null,
      damageRolls: result.damageRolls.map(roll => roll.toJSON()),
      applied: false
    });
  }

  if ( !entries.length ) return;

  const setting = getSetting(constants.SETTING.CONFIG.KEY);
  const diceMode = setting?.multiattackDice ?? "all";
  const autoApply = multiattack.multiattack.autoApply;

  const messageData = {
    type: constants.MULTIATTACK_MESSAGE_TYPE,
    speaker: ChatMessage.getSpeaker({ actor }),
    system: { ...multiattack.messageSources, probabilistic, autoApply, diceMode, entries }
  };
  ChatMessage.applyMode(messageData);

  if ( diceMode === "all" ) await showDice(entryRolls.flat(), messageData);
  else if ( diceMode === "stagger" ) {
    await showDiceInTurn(entries, entryRolls, messageData, { panToTargets: !!setting?.multiattackPanToTargets });
  }

  const message = await ChatMessage.create(messageData);

  if ( message && autoApply ) {
    await applyMultiattackDamage(message, entries.map((entry, index) => index));
  }
}

/* -------------------------------------------- */

/**
 * Show each attack's 3D dice one attack at a time, rather than all at once.
 * @param {object[]} entries Rows for the chat card
 * @param {Roll[][]} entryRolls Rolls for each row
 * @param {object} messageData
 * @param {object} [options]
 * @param {boolean} [options.panToTargets=false] Wheher to pan the canvas to each target
 * @returns {Promise<void>}
 */
async function showDiceInTurn(entries, entryRolls, messageData, { panToTargets = false } = {}) {
  if ( !game.dice3d ) return;
  let hasThrown = false;
  for ( const [index, rolls] of entryRolls.entries() ) {
    if ( !rolls.some(roll => roll.dice.length) ) continue;

    if ( hasThrown ) {
      await new Promise(resolve => {
        setTimeout(resolve, DICE_PAUSE);
      });
      await clear3dDice();
    }
    hasThrown = true;

    const token = getTargetToken(entries[index]);
    if ( panToTargets && token ) await canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
    await showDice(rolls, messageData);
  }
}

/* -------------------------------------------- */

/**
 * Throw the dice of the given rolls together with Dice So Nice, to everyone who can see the chat card,
 * and wait for them to settle. Does nothing if Dice So Nice isn't active or no dice were rolled.
 * @param {Roll[]} rolls Evaluated rolls
 * @param {object} messageData
 * @param {string[]} [messageData.whisper] Ids of the whispered users
 * @param {boolean} [messageData.blind] Whether the card is a blind roll
 * @param {object} [messageData.speaker]
 * @returns {Promise<void>}
 */
async function showDice(rolls, { whisper, blind, speaker }) {
  if ( !game.dice3d || !rolls.some(roll => roll.dice.length) ) return;
  await game.dice3d.showForRoll(
    await combineRolls(rolls), game.user, true, whisper?.length ? whisper : null, !!blind, null, speaker
  );
}

/* -------------------------------------------- */

/**
 * Clear £D dice from the table on every client.
 * @returns {Promise<void>}
 */
async function clear3dDice() {
  game.socket.emit(`module.${MODULE.ID}`, { action: "clear3dDice" });
  await clearLocal3dDice();
}

/* -------------------------------------------- */

/**
 * Clear 3D dice from the table on this client.
 * @returns {Promise<void>}
 */
export async function clearLocal3dDice() {
  const box = game.dice3d?.box;
  if ( !box?.clearAll ) return;
  const isBusy = () => box._preparingThrow || box.rolling || box.running;

  const deadline = Date.now() + 10000;
  while ( isBusy() && (Date.now() < deadline) ) {
    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });
  }
  if ( !isBusy() ) await box.clearAll();
}

/* -------------------------------------------- */

/**
 * Join an attack's rolls into one roll, so Dice So Nice throws the attack and damage dice together.
 * @param {Roll[]} rolls Evaluated rolls
 * @returns {Promise<Roll>} One evaluated roll
 */
async function combineRolls(rolls) {
  if ( rolls.length === 1 ) return rolls[0];
  const terms = [];
  for ( const roll of rolls ) {
    if ( terms.length ) {
      const operator = new foundry.dice.terms.OperatorTerm({ operator: "+" });
      if ( !operator._evaluated ) await operator.evaluate();
      terms.push(operator);
    }
    terms.push(...roll.terms);
  }
  return Roll.fromTerms(terms);
}

/* -------------------------------------------- */

/**
 * Work out damage scaled by the chance to hit or chance the target fails its save.
 * @param {Activity} activity
 * @param {Actor} target
 * @param {Event} [event]
 * @returns {Promise<object>} Rolls, damage rolls, damage multiplier, result details and whether it missed
 */
async function rollProbabilisticAttack(activity, target, event) {
  const { factor, result } = getProbabilisticFactor(activity, target, event);
  if ( factor <= 0 ) return { rolls: [], damageRolls: [], multiplier: 1, result, isMiss: true };

  const { rolls } = await evaluateProbabilisticDamage(activity, factor, {
    useAverageDamage: useAverageDamageFor(activity.actor)
  });
  return { rolls, damageRolls: rolls, multiplier: 1, result, isMiss: false };
}

/* -------------------------------------------- */

/**
 * Roll the attack or the target's saving throw, then roll damage if it lands.
 * @param {Activity} activity
 * @param {Actor} target
 * @param {Event} [event]
 * @returns {Promise<object>} Rolls, damage rolls, the d20 roll, damage multiplier, result details,
 *   whether it missed and whether it is waiting on a player's saving throw
 */
async function rollAttack(activity, target, event) {
  const rollOptions = [{ configure: false }, { create: false }];

  if ( activity.type === "attack" ) {
    const ac = target.system.attributes?.ac?.value ?? null;
    const attackRolls = await activity.rollAttack({ event, target: ac ?? undefined }, ...rollOptions) ?? [];
    const roll = attackRolls[0];
    if ( !roll ) return { rolls: [], damageRolls: [], multiplier: 1, result: null, isMiss: true };

    const isHit = roll.isCritical || (!roll.isFumble && ((ac === null) || (roll.total >= ac)));
    let type = isHit ? "hit" : "miss";
    if ( roll.isCritical ) type = "critical";
    const result = { type, total: roll.total, ac, die: getDieResult(roll) };
    if ( !isHit ) return { rolls: attackRolls, damageRolls: [], d20Roll: roll, multiplier: 1, result, isMiss: true };

    const damageRolls = await activity.rollDamage({ event, isCritical: roll.isCritical }, ...rollOptions) ?? [];
    return {
      rolls: [...attackRolls, ...damageRolls], damageRolls, d20Roll: roll, multiplier: 1, result, isMiss: false
    };
  }

  if ( activity.type === "save" ) {
    const dc = activity.save.dc.value;
    const { ability } = getBestSave(activity, target);

    if ( target.hasPlayerOwner ) {
      const result = { type: "pendingSave", dc: dc ?? null, ability, onSave: activity.damage.onSave };
      return { rolls: [], damageRolls: [], multiplier: 1, result, isMiss: false, isPending: true };
    }

    const saveRolls = await target.rollSavingThrow({ ability, target: dc }, ...rollOptions) ?? [];
    const total = saveRolls[0]?.total;
    const isSave = Number.isFinite(total) && Number.isFinite(dc) && (total >= dc);
    const multiplier = isSave ? (ON_SAVE_MULTIPLIER[activity.damage.onSave] ?? 0.5) : 1;
    const result = {
      type: isSave ? "saved" : "failed", total: total ?? null, dc: dc ?? null, ability, die: getDieResult(saveRolls[0])
    };
    const damageRolls = multiplier > 0 ? (await activity.rollDamage({ event }, ...rollOptions) ?? []) : [];
    return {
      rolls: [...saveRolls, ...damageRolls], damageRolls, d20Roll: saveRolls[0], multiplier, result,
      isMiss: multiplier === 0
    };
  }

  const damageRolls = await activity.rollDamage({ event }, ...rollOptions) ?? [];
  return { rolls: damageRolls, damageRolls, multiplier: 1, result: null, isMiss: false };
}

/* -------------------------------------------- */

/**
 * Get the number rolled on the d20 of an attack roll or saving throw, and whether it was a natural 20 or 1.
 * @param {D20Roll} [roll]
 * @returns {{natural: number, isCritical: boolean, isFumble: boolean}|null} Die result, or null if there is no d20
 */
function getDieResult(roll) {
  const natural = roll?.d20?.total;
  if ( !Number.isFinite(natural) ) return null;
  return { natural, isCritical: !!roll.isCritical, isFumble: !!roll.isFumble };
}

/* -------------------------------------------- */

/**
 * Get the short label for an ability.
 * @param {string} ability Ability key
 * @returns {string} Ability abbreviation
 */
function getAbilityLabel(ability) {
  return (CONFIG.DND5E.abilities[ability]?.abbreviation ?? ability ?? "").toUpperCase();
}

/* -------------------------------------------- */

/**
 * Whether the current user can see a save's DC and result.
 * @param {ChatMessage} message
 * @param {string} [rolledBy] Id of the user who rolled the save
 * @returns {boolean} Whether the DC and result can be shown
 */
function canSeeChallenge(message, rolledBy) {
  const roller = game.users.get(rolledBy);
  if ( !roller ) return message.shouldDisplayChallenge;
  if ( game.user.isGM || (roller === game.user) ) return true;
  switch ( game.settings.get("dnd5e", "challengeVisibility") ) {
    case "all": return true;
    case "player": return !roller.isGM;
    default: return false;
  }
}

/* -------------------------------------------- */

/**
 * Work out which parts of a row's result the current user can see.
 * @param {object} [result]
 * @param {ChatMessage} message
 * @returns {{label: string, isVisible: boolean}} Result label and whether hit or miss can be shown
 */
function getResultDisplay(result, message) {
  if ( !result ) return { label: "", isVisible: true };
  const key = "CUSTOM_DND5E.activities.multiattack.result";
  const ability = getAbilityLabel(result.ability);

  if ( ["saveChance", "saved", "failed", "pendingSave"].includes(result.type) ) {
    if ( !canSeeChallenge(message, result.rolledBy) ) {
      if ( ["saved", "failed"].includes(result.type) ) {
        return {
          label: game.i18n.format(`${key}.${result.type}NoDC`, { ability, total: result.total ?? "?" }),
          isVisible: true
        };
      }
      return { label: game.i18n.format(`${key}.save`, { ability }), isVisible: false };
    }
    if ( result.type === "pendingSave" ) {
      return { label: game.i18n.format(`${key}.pendingSave`, { ability, dc: result.dc ?? "?" }), isVisible: false };
    }
    return {
      label: game.i18n.format(`${key}.${result.type}`, {
        chance: result.chance, dc: result.dc ?? "?", total: result.total ?? "?", ability
      }),
      isVisible: true
    };
  }

  const visibility = game.settings.get("dnd5e", "attackRollVisibility");
  const showResult = game.user.isGM || (visibility !== "none");
  const showAC = game.user.isGM || (visibility === "all");

  if ( result.type === "hitChance" ) {
    if ( !showResult ) return { label: "", isVisible: false };
    const type = showAC ? "hitChance" : "hitChanceNoAC";
    return { label: game.i18n.format(`${key}.${type}`, { chance: result.chance, ac: result.ac }), isVisible: true };
  }

  if ( !showResult ) {
    return { label: game.i18n.format(`${key}.attackRoll`, { total: result.total }), isVisible: false };
  }
  const type = (showAC && (result.ac !== null)) || (result.type === "critical") ? result.type : `${result.type}NoAC`;
  return { label: game.i18n.format(`${key}.${type}`, { total: result.total, ac: result.ac }), isVisible: true };
}

/* -------------------------------------------- */
/*  ROLL BREAKDOWNS                             */
/* -------------------------------------------- */

/**
 * Render the breakdown of an attack roll or saving throw.
 * @param {object} [rollData]
 * @returns {Promise<string>} Breakdown HTML
 */
async function getRollBreakdown(rollData) {
  if ( !rollData ) return "";
  try {
    return await Roll.fromData(rollData).getTooltip();
  } catch {
    return "";
  }
}

/* -------------------------------------------- */

/**
 * Render the breakdown of a row's damage.
 * @param {object[]} [rollsData]
 * @param {object} [options]
 * @param {boolean} [options.probabilistic=false] Whether the damage is probabilistic
 * @returns {Promise<string>} Breakdown HTML
 */
async function getDamageBreakdown(rollsData, { probabilistic = false } = {}) {
  if ( !rollsData?.length ) return "";
  try {
    const rolls = rollsData.map(data => Roll.fromData(data));
    const aggregated = (CONFIG.DND5E.aggregateDamageDisplay && !probabilistic)
      ? dnd5e.dice.aggregateDamageRolls(rolls)
      : rolls;
    const parts = aggregated.map(roll => {
      const part = probabilistic ? getScaledDamagePart(roll) : roll.aggregateTerms();
      part.config = CONFIG.DND5E.damageTypes[part.type] ?? CONFIG.DND5E.healingTypes[part.type] ?? null;
      part.label = part.config?.labelShort ?? part.config?.label ?? "";
      return part;
    });
    return await foundry.applications.handlebars.renderTemplate(
      "systems/dnd5e/templates/chat/parts/damage-breakdown.hbs", { parts }
    );
  } catch {
    return "";
  }
}

/* -------------------------------------------- */

/**
 * Build a damage breakdown part for a probabilistic damage roll.
 * @param {DamageRoll} roll
 * @returns {object} Part with the damage type, total and dice
 */
function getScaledDamagePart(roll) {
  const part = { type: roll.options.type, total: Math.max(0, roll.total), constant: null, dice: [], icon: null,
    method: null };
  for ( const die of roll.dice ) {
    const { rolls, icon, method } = die.getTooltipData();
    part.dice.push(...rolls);
    part.icon ??= icon;
    part.method ??= method;
  }
  return part;
}

/* -------------------------------------------- */
/*  DAMAGE APPLICATION                          */
/* -------------------------------------------- */

/**
 * Apply or undo damage from a Multiattack chat card for the given rows.
 * @param {ChatMessage} message
 * @param {number[]} indices Rows to apply or undo
 * @param {object} [options]
 * @param {boolean} [options.undo=false] Whether to restore hit points lost when damage was applied
 * @returns {Promise<void>}
 */
export async function applyMultiattackDamage(message, indices, { undo = false } = {}) {
  const entries = message.system.toObject().entries;
  const toChange = indices.filter(index => entries[index]?.damages.length && (!!entries[index].applied === undo));
  if ( !toChange.length ) return;

  const canChangeAll = toChange.every(index => getTargetActor(entries[index])?.isOwner);
  const canUpdateMessage = message.canUserModify(game.user, "update");
  if ( !canChangeAll || !canUpdateMessage ) {
    return queryGM("applyMultiattackDamage", { messageId: message.id, indices: toChange, undo });
  }

  for ( const index of toChange ) {
    const entry = entries[index];
    const actor = getTargetActor(entry);
    if ( !actor ) continue;

    if ( undo ) {
      await restoreHitPoints(actor, entry.hpLost);
      entry.applied = false;
      entry.hpLost = null;
      continue;
    }

    const before = getHitPoints(actor);
    await actor.applyDamage(
      entry.damages.map(damage => ({ ...damage, properties: new Set(damage.properties) })),
      { multiplier: entry.multiplier ?? 1 }
    );
    const after = getHitPoints(actor);
    entry.applied = true;
    entry.hpLost = { value: before.value - after.value, temp: before.temp - after.temp };
  }

  await message.update({ "system.entries": entries });
}

/* -------------------------------------------- */

/**
 * Get the actor for an attack row.
 * @param {object} entry Attack row
 * @returns {Actor|undefined} Target actor
 */
function getTargetActor(entry) {
  return dnd5e.dataModels.chatMessage.fields.TargetsField.resolve(entry.targets?.[0] ?? {}).actor;
}

/* -------------------------------------------- */

/**
 * Get the token for an attack row.
 * @param {object} entry Attack row
 * @returns {Token|undefined} Target token
 */
function getTargetToken(entry) {
  return dnd5e.dataModels.chatMessage.fields.TargetsField.resolve(entry.targets?.[0] ?? {}).token;
}

/* -------------------------------------------- */

/**
 * Get damage descriptions split by damage type.
 * @param {DamageRoll[]} rolls
 * @returns {object[]} Damage descriptions
 */
function getDamageDescriptions(rolls) {
  if ( !rolls.length ) return [];
  return dnd5e.dice.aggregateDamageRolls(rolls, { respectProperties: true })
    .map(roll => ({
      value: Math.max(0, roll.total),
      type: roll.options.type,
      properties: Array.from(roll.options.properties ?? [])
    }))
    .filter(damage => damage.value > 0);
}

/* -------------------------------------------- */

/**
 * Get a attack row's damage total.
 * @param {object} entry Attack row
 * @returns {number} Damage total
 */
function getDamageTotal(entry) {
  const total = (entry.damages ?? []).reduce((sum, damage) => sum + damage.value, 0);
  return Math.trunc(total * (entry.multiplier ?? 1));
}

/* -------------------------------------------- */

/**
 * Get an actor's current hit points and temporary hit points.
 * @param {Actor} actor
 * @returns {{value: number, temp: number}} Hit points
 */
function getHitPoints(actor) {
  const hp = actor.system.attributes?.hp ?? {};
  return { value: hp.value ?? 0, temp: hp.temp ?? 0 };
}

/* -------------------------------------------- */

/**
 * Restore hit points and temporary hit points lost to applied damage.
 * @param {Actor} actor
 * @param {{value: number, temp: number}} [hpLost] Hit points and temporary hit points lost
 * @returns {Promise<void>}
 */
async function restoreHitPoints(actor, hpLost) {
  if ( !hpLost ) return;
  const hp = actor.system.attributes?.hp;
  if ( !hp ) return;
  const max = hp.effectiveMax ?? hp.max ?? Infinity;
  await actor.update({
    "system.attributes.hp.value": Math.min((hp.value ?? 0) + hpLost.value, max),
    "system.attributes.hp.temp": (hp.temp ?? 0) + hpLost.temp
  });
}

/* -------------------------------------------- */

/**
 * Record a player's saving throw on a Multiattack chat card and work out the damage from it.
 * @param {ChatMessage} message
 * @param {number} index Row the save was rolled for
 * @param {object} saveRoll
 * @param {object} [options]
 * @param {string} [options.rolledBy] Id of the user who rolled the save
 * @returns {Promise<void>}
 */
export async function resolveMultiattackSave(message, index, saveRoll, { rolledBy = game.user.id } = {}) {
  if ( !message.canUserModify(game.user, "update") ) {
    return queryGM("resolveMultiattackSave", { messageId: message.id, index, saveRoll });
  }

  const entries = message.system.toObject().entries;
  const entry = entries[index];
  if ( entry?.result?.type !== "pendingSave" ) return;

  const roll = Roll.fromData(saveRoll);
  const total = roll.total;
  const { dc, ability, onSave } = entry.result;
  const isSave = Number.isFinite(dc) && (total >= dc);
  const multiplier = isSave ? (ON_SAVE_MULTIPLIER[onSave] ?? 0.5) : 1;
  const damageRolls = multiplier > 0 ? await rollSaveDamage(message, entry, message.system.diceMode) : [];
  entry.damages = getDamageDescriptions(damageRolls);
  entry.multiplier = multiplier;
  entry.d20Roll = saveRoll;
  entry.damageRolls = damageRolls.map(damageRoll => damageRoll.toJSON());
  entry.isMiss = multiplier === 0;
  entry.result = { type: isSave ? "saved" : "failed", total, dc, ability, die: getDieResult(roll), rolledBy };

  await message.update({ "system.entries": entries });
  if ( message.system.autoApply ) await applyMultiattackDamage(message, [index]);
}

/* -------------------------------------------- */

/**
 * Roll damage for a row once the player has rolled their saving throw.
 * @param {ChatMessage} message
 * @param {object} entry Row the save was rolled for
 * @param {string} [diceMode] How the card shows 3D dice: "all", "stagger" or "none"
 * @returns {Promise<DamageRoll[]>} Damage rolls
 */
async function rollSaveDamage(message, entry, diceMode) {
  const activity = fromUuidSync(entry.activityUuid, { strict: false });
  if ( !activity ) return [];
  const damageRolls = await activity.rollDamage({}, { configure: false }, { create: false }) ?? [];
  if ( diceMode !== "none" ) await showDice(damageRolls, message);
  return damageRolls;
}

/* -------------------------------------------- */
/*  GM QUERIES                                  */
/* -------------------------------------------- */

/**
 * Apply or undo damage from a Multiattack chat card for a player.
 * @param {object} queryData
 * @param {string} queryData.messageId
 * @param {number[]} queryData.indices Rows to apply or undo
 * @param {boolean} [queryData.undo] Whether to undo the damage instead of applying it
 * @param {object} context
 * @param {User} context.user User who asked
 * @returns {Promise<void>}
 */
export async function onApplyDamageQuery({ messageId, indices, undo }, { user }) {
  const message = game.messages.get(messageId);
  if ( !message ) return;
  if ( !user.isGM && (message.author !== user) ) {
    throw new Error(game.i18n.localize("CUSTOM_DND5E.activities.multiattack.warning.notAttacker"));
  }
  await applyMultiattackDamage(message, indices, { undo: !!undo });
}

/* -------------------------------------------- */

/**
 * Record a player's saving throw on a Multiattack chat card.
 * @param {object} queryData
 * @param {string} queryData.messageId
 * @param {number} queryData.index Row the save was rolled for
 * @param {object} queryData.saveRoll
 * @param {object} context
 * @param {User} context.user User who rolled the save
 * @returns {Promise<void>}
 */
export async function onResolveSaveQuery({ messageId, index, saveRoll }, { user }) {
  const message = game.messages.get(messageId);
  const entry = message?.system.entries?.[index];
  if ( !entry ) return;
  const actor = getTargetActor(entry);
  if ( !actor?.testUserPermission(user, "OWNER") ) {
    throw new Error(game.i18n.localize("CUSTOM_DND5E.activities.multiattack.warning.notTargetOwner"));
  }
  await resolveMultiattackSave(message, index, saveRoll, { rolledBy: user.id });
}

/* -------------------------------------------- */
/*  CHAT CARD                                   */
/* -------------------------------------------- */

/**
 * Data model for the Multiattack chat card.
 */
export class MultiattackMessageData extends dnd5e.dataModels.abstract.ChatMessageDataModel {
  /**
   * Define the schema.
   * @override
   */
  static defineSchema() {
    const { ArrayField, BooleanField, DocumentUUIDField, NumberField, ObjectField, SchemaField, StringField } =
      foundry.data.fields;
    const { SourceReferenceField, TargetsField } = dnd5e.dataModels.chatMessage.fields;
    return {
      activity: new SourceReferenceField({
        uuid: new StringField({ blank: false, nullable: true, required: true })
      }, { initial: null, nullable: true }),
      item: new SourceReferenceField({
        compendiumSource: new DocumentUUIDField()
      }, { initial: null, nullable: true }),
      probabilistic: new BooleanField(),
      autoApply: new BooleanField(),
      diceMode: new StringField({ required: true, blank: false, initial: "all" }),
      entries: new ArrayField(new SchemaField({
        // The same target list field as dnd5e's attack cards, holding just the row's one target
        targets: new TargetsField(),
        activityUuid: new StringField(),
        attack: new StringField(),
        result: new ObjectField({ nullable: true, initial: null }),
        isMiss: new BooleanField(),
        damages: new ArrayField(new SchemaField({
          value: new NumberField({ required: true, initial: 0 }),
          type: new StringField(),
          properties: new ArrayField(new StringField())
        })),
        multiplier: new NumberField({ required: true, initial: 1 }),
        d20Roll: new ObjectField({ nullable: true, initial: null }),
        damageRolls: new ArrayField(new ObjectField()),
        applied: new BooleanField(),
        hpLost: new SchemaField({
          value: new NumberField({ required: true, initial: 0 }),
          temp: new NumberField({ required: true, initial: 0 })
        }, { nullable: true, initial: null })
      }))
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      applyAllMultiattackDamage: MultiattackMessageData.#applyAllDamage,
      applyMultiattackDamage: MultiattackMessageData.#applyDamage,
      rollMultiattackSave: MultiattackMessageData.#rollSave
    },
    template: constants.TEMPLATE.MULTIATTACK_CARD
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  RENDERING                                   */
  /* -------------------------------------------- */

  /** @override */
  _getEnrichmentOptions() {
    return { avatar: false };
  }

  /* -------------------------------------------- */

  /**
   * Leave rolled privately content in place for users who can't see the card.
   * @inheritDoc
   */
  async render(options) {
    if ( !this.parent.isContentVisible ) return "";
    return super.render(options);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the card for the current user, hiding results and ACs they aren't allowed to see.
   * @inheritDoc
   */
  async _prepareContext(options) {
    const canApply = game.user.isGM || this.parent.isAuthor;

    const entries = await Promise.all(this.entries.map(async (entry, index) => {
      const { label, isVisible } = getResultDisplay(entry.result, this.parent);
      const damages = entry.damages ?? [];
      const isPendingSave = entry.result?.type === "pendingSave";
      return {
        ...entry,
        index,
        target: entry.targets[0] ?? {},
        canRollSave: isPendingSave && !!getTargetActor(entry)?.isOwner,
        saveLabel: isPendingSave
          ? game.i18n.format("CUSTOM_DND5E.activities.multiattack.rollSave", {
            ability: getAbilityLabel(entry.result.ability)
          })
          : "",
        resultLabel: label,
        die: entry.result?.die ?? null,
        isMiss: entry.isMiss && isVisible,
        hasDamage: !!damages.length,
        total: isPendingSave ? "?" : getDamageTotal(entry),
        d20Breakdown: await getRollBreakdown(entry.d20Roll),
        damageBreakdown: await getDamageBreakdown(entry.damageRolls, { probabilistic: this.probabilistic })
      };
    }));

    const subtitle = this.probabilistic
      ? `${this.activity?.name} • ${game.i18n.localize("CUSTOM_DND5E.probabilisticDamage")}`
      : this.activity?.name;

    return {
      header: { item: this.item ?? {}, activity: this.activity ?? {}, subtitle },
      entries,
      canApply,
      showApplyAll: canApply && !this.autoApply && entries.some(entry => entry.hasDamage),
      canApplyAll: !!this.#getUnappliedIndices().length
    };
  }

  /* -------------------------------------------- */

  /**
   * Use the compact layout and let target images select and pan to their token.
   * @inheritDoc
   */
  _onRender(element, options = {}) {
    super._onRender(element, options);
    element.classList.add("compact");

    for ( const image of element.querySelectorAll(".custom-dnd5e-multiattack-target[data-token-uuid]") ) {
      image.addEventListener("click", this.parent._onTargetMouseDown.bind(this.parent));
      image.addEventListener("pointerover", this.parent._onTargetHoverIn.bind(this.parent));
      image.addEventListener("pointerout", this.parent._onTargetHoverOut.bind(this.parent));
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the rows with damage that has not been applied yet.
   * @returns {number[]} Row indices
   */
  #getUnappliedIndices() {
    return this.entries
      .map((entry, index) => index)
      .filter(index => !this.entries[index].applied && this.entries[index].damages.length);
  }

  /* -------------------------------------------- */
  /*  EVENT HANDLERS                              */
  /* -------------------------------------------- */

  /**
   * Apply a row's damage, or undo it if it has already been applied.
   * @this {MultiattackMessageData}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #applyDamage(event, target) {
    const index = Number(target.closest("[data-index]")?.dataset.index);
    const entry = this.entries[index];
    if ( !entry ) return;
    target.disabled = true;
    applyMultiattackDamage(this.parent, [index], { undo: !!entry.applied });
  }

  /* -------------------------------------------- */

  /**
   * Roll the target's saving throw for a row waiting on it.
   * @this {MultiattackMessageData}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollSave(event, target) {
    const index = Number(target.closest("[data-index]")?.dataset.index);
    const entry = this.entries[index];
    if ( entry?.result?.type !== "pendingSave" ) return;
    const actor = getTargetActor(entry);
    if ( !actor?.isOwner ) return;

    target.disabled = true;
    const rolls = await actor.rollSavingThrow({ ability: entry.result.ability, target: entry.result.dc, event });
    if ( !Number.isFinite(rolls?.[0]?.total) ) {
      target.disabled = false;
      return;
    }
    await resolveMultiattackSave(this.parent, index, rolls[0].toJSON());
  }

  /* -------------------------------------------- */

  /**
   * Apply damage from every row not yet applied.
   * @this {MultiattackMessageData}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #applyAllDamage(event, target) {
    const indices = this.#getUnappliedIndices();
    if ( !indices.length ) return;
    target.disabled = true;
    applyMultiattackDamage(this.parent, indices);
  }
}
