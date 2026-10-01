import { CONSTANTS, MODULE } from "../constants.js";
import {
  formatModifier,
  formatSpellLevelModifier,
  getActionModifier,
  getCombatantActions,
  getCombatantSelections,
  getSpellChoicesForCombatant,
  onActionBarClosed,
  panToCombatant,
  submitChoice
} from "../gameplay/speed-factor-initiative.js";

const constants = CONSTANTS.SPEED_FACTOR_INITIATIVE;
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Key identifying a selection.
 * @param {object} selection
 * @returns {string}
 */
function selectionKey(selection) {
  return [selection.actionKey ?? "", selection.weaponKey ?? "", selection.spellLevel ?? "", selection.spellName ?? ""].join("|");
}

/**
 * A bar of action buttons, docked above the hotbar, for choosing a combatant's Speed Factor action.
 */
export class SpeedFactorActionBar extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Constructor.
   * @param {object} options
   * @param {string} options.combatId
   * @param {string} options.combatantId
   */
  constructor(options) {
    super(options);
    this.combatId = options.combatId;
    this.combatantId = options.combatantId;

    /**
     * The selections toggled on for this combatant.
     * @type {object[]}
     */
    this.selections = [];
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-speed-factor-action-bar`,
    classes: [`${MODULE.ID}-app`, `${MODULE.ID}-speed-factor-bar`, "dnd5e2", "faded-ui"],
    tag: "div",
    window: { frame: false, positioned: false },
    actions: {
      chooseAction: SpeedFactorActionBar.onChooseAction,
      toggleGroup: SpeedFactorActionBar.onToggleGroup,
      chooseSpellLevel: SpeedFactorActionBar.onChooseSpellLevel,
      chooseSpell: SpeedFactorActionBar.onChooseSpell,
      chooseWeapon: SpeedFactorActionBar.onChooseWeapon,
      done: SpeedFactorActionBar.onDone
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.ACTION_BAR
    }
  };

  /* -------------------------------------------- */

  /**
   * Action button tile width in pixels.
   * @type {number}
   */
  static CELL = 100;

  /**
   * Gap between tiles in pixels.
   * @type {number}
   */
  static GAP = 2;

  /* -------------------------------------------- */

  /**
   * Get the combatant.
   * @returns {Combatant|undefined}
   */
  get combatant() {
    return game.combats.get(this.combatId)?.combatants.get(this.combatantId);
  }

  /* -------------------------------------------- */

  /**
   * Set the combatant and re-render the action bar.
   * @param {string} combatId
   * @param {string} combatantId
   * @returns {Promise<void>}
   */
  async setCombatant(combatId, combatantId) {
    this.combatId = combatId;
    this.combatantId = combatantId;
    await this.render();
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    this.selections = getCombatantSelections(this.combatant);
    const spells = getSpellChoicesForCombatant(this.combatant);
    return {
      actions: getCombatantActions(this.combatant),
      spellLevels: Array.from({ length: 10 }, (_, level) => ({ level, modifier: formatSpellLevelModifier(level) })),
      spellList: spells.length ? spells : null
    };
  }

  /* -------------------------------------------- */

  /**
   * Watches the hotbar so the bar can match its width.
   * @type {ResizeObserver|null}
   */
  #resizeObserver = null;

  /**
   * Watches the hotbar so the bar can move with it when the chat notifications push it left.
   * @type {MutationObserver|null}
   */
  #mutationObserver = null;

  /* -------------------------------------------- */

  /**
   * Place the bar in above the hotbar.
   * @param {HTMLElement} element
   * @param {object} [options]
   * @returns {Promise<void>}
   */
  async _insertElement(element, options) {
    const uiBottom = document.getElementById("ui-bottom");
    if ( !uiBottom ) return super._insertElement(element, options);
    const existing = document.getElementById(element.id);
    const hotbar = this.#getHotbar();
    if ( existing ) existing.replaceWith(element);
    else if ( hotbar?.parentElement === uiBottom ) hotbar.before(element);
    else uiBottom.append(element);
  }

  /* -------------------------------------------- */

  /**
   * Start following the hotbar.
   * @param {object} context
   * @param {object} options
   */
  _onFirstRender(context, options) {
    const hotbar = this.#getHotbar();
    if ( !hotbar ) return;
    this.#resizeObserver = new ResizeObserver(() => this.#onHotbarResize());
    this.#resizeObserver.observe(hotbar);
    this.#mutationObserver = new MutationObserver(() => this.#followHotbarOffset());
    this.#mutationObserver.observe(hotbar, { attributes: true, attributeFilter: ["class", "style"] });
  }

  /* -------------------------------------------- */

  /**
   * Pan to the combatant's token and fit the bar to the hotbar after rendering.
   * @param {object} context
   * @param {object} options
   */
  _onRender(context, options) {
    panToCombatant(this.combatant);
    this.#fitColumns();
    this.#followHotbarOffset();
    this.#markSelected();
    this.#updateDone();
  }

  /* -------------------------------------------- */

  /**
   * Refit the columns and move any open group popover back over its button.
   */
  #onHotbarResize() {
    if ( !this.rendered ) return;
    this.#fitColumns();
    const popover = this.element.querySelector(".custom-dnd5e-speed-factor-group-popover:not(.hidden)");
    const button = popover && this.element.querySelector(
      `[data-action="toggleGroup"][data-group-key="${popover.dataset.groupKey}"]`);
    if ( button ) this.#positionPopover(popover, button);
  }

  /* -------------------------------------------- */

  /**
   * Get the hotbar element.
   * @returns {HTMLElement|null}
   */
  #getHotbar() {
    return (ui.hotbar?.element instanceof HTMLElement) ? ui.hotbar.element : document.getElementById("hotbar");
  }

  /* -------------------------------------------- */

  /**
   * Set the number of button columns so the bar is no wider than the hotbar.
   */
  #fitColumns() {
    const el = this.element;
    if ( !el ) return;
    const hotbarWidth = this.#getHotbar()?.offsetWidth ?? 0;
    const available = hotbarWidth > 50 ? hotbarWidth : (el.parentElement?.clientWidth ?? 600);
    const grid = el.querySelector(".custom-dnd5e-speed-factor-grid");
    const total = el.querySelectorAll(".custom-dnd5e-speed-factor-action-button").length || 1;
    const { CELL, GAP } = SpeedFactorActionBar;
    const columns = Math.max(1, Math.min(total, Math.floor((available - 20 + GAP) / (CELL + GAP))));
    if ( grid ) grid.style.gridTemplateColumns = `repeat(${columns}, ${CELL}px)`;
  }

  /* -------------------------------------------- */

  /**
   * Shift the bar sideways by the same amount as the hotbar.
   */
  #followHotbarOffset() {
    const hotbar = this.#getHotbar();
    if ( !this.element || !hotbar ) return;
    let offset = "0px";
    if ( hotbar.classList.contains("min") ) offset = "-70px";
    else if ( hotbar.matches(".offset:not(.lg)") ) offset = hotbar.style.getPropertyValue("--offset") || "0px";
    this.element.style.setProperty("--offset", offset);
  }

  /* -------------------------------------------- */

  /**
   * Close without animating.
   * @param {object} [options={}]
   * @returns {Promise<this>}
   */
  async close(options = {}) {
    return super.close({ ...options, animate: false });
  }

  /* -------------------------------------------- */

  /**
   * Handle closing the action bar.
   * @param {object} options
   * @returns {Promise<void>}
   */
  async _onClose(options) {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    await super._onClose(options);
    onActionBarClosed(this);
  }

  /* -------------------------------------------- */

  /**
   * Toggle an action button in the selection set.
   * @param {Event} event
   * @param {HTMLElement} target Clicked button
   * @returns {void}
   */
  static onChooseAction(event, target) {
    const actionKey = target.dataset.actionKey;
    if ( !actionKey ) return;
    this._toggle({ actionKey }, target);
  }

  /* -------------------------------------------- */

  /**
   * Toggle a spell level in the selection set.
   * @param {Event} event
   * @param {HTMLElement} target Clicked level button
   * @returns {void}
   */
  static onChooseSpellLevel(event, target) {
    const actionKey = target.dataset.groupKey;
    if ( !actionKey ) return;
    this._toggle({ actionKey, spellLevel: Number(target.dataset.level ?? 0) }, target);
  }

  /* -------------------------------------------- */

  /**
   * Toggle a specific spell in the selection set.
   * @param {Event} event
   * @param {HTMLElement} target Clicked spell button
   * @returns {void}
   */
  static onChooseSpell(event, target) {
    const actionKey = target.dataset.groupKey;
    if ( !actionKey ) return;
    this._toggle({
      actionKey,
      spellLevel: Number(target.dataset.spellLevel ?? 0),
      spellName: target.dataset.spellName
    }, target);
  }

  /* -------------------------------------------- */

  /**
   * Toggle a weapon in the selection set.
   * @param {Event} event
   * @param {HTMLElement} target Clicked weapon button
   * @returns {void}
   */
  static onChooseWeapon(event, target) {
    const actionKey = target.dataset.groupKey;
    const weaponKey = target.dataset.weaponKey;
    if ( !actionKey || !weaponKey ) return;
    this._toggle({ actionKey, weaponKey }, target);
  }

  /* -------------------------------------------- */

  /**
   * Finalise the combatant's choice and close the bar.
   * @returns {Promise<void>}
   */
  static async onDone() {
    await submitChoice(this.combatId, this.combatantId, { selections: this.selections });
    await this.close();
  }

  /* -------------------------------------------- */

  /**
   * Open or close a group's popover.
   * @param {Event} event
   * @param {HTMLElement} target Clicked group button
   * @returns {void}
   */
  static onToggleGroup(event, target) {
    const groupKey = target.dataset.groupKey;
    const popover = this.element.querySelector(
      `.custom-dnd5e-speed-factor-group-popover[data-group-key="${groupKey}"]`);
    const isOpen = popover && !popover.classList.contains("hidden");

    this.#closeGroupPopovers();
    if ( isOpen || !popover ) return;

    popover.classList.remove("hidden");
    this.#positionPopover(popover, target);
    const icon = target.querySelector(".modifier i");
    if ( icon ) icon.className = "fas fa-compress";
  }

  /* -------------------------------------------- */

  /**
   * Hide all group popovers and reset their toggle icons.
   * @returns {void}
   */
  #closeGroupPopovers() {
    this.element?.querySelectorAll(".custom-dnd5e-speed-factor-group-popover")
      .forEach(popover => popover.classList.add("hidden"));
    this.element?.querySelectorAll('[data-action="toggleGroup"] .modifier i')
      .forEach(icon => { icon.className = "fas fa-expand"; });
  }

  /* -------------------------------------------- */

  /**
   * Position a popover above the button.
   * @param {HTMLElement} popover
   * @param {HTMLElement} button
   */
  #positionPopover(popover, button) {
    const maxLeft = this.element.clientWidth - popover.offsetWidth;
    const centred = button.offsetLeft + ((button.offsetWidth - popover.offsetWidth) / 2);
    const left = maxLeft < 0 ? maxLeft / 2 : Math.min(Math.max(0, centred), maxLeft);
    popover.style.left = `${left}px`;
    popover.style.top = `${button.offsetTop - popover.offsetHeight - 6}px`;
  }

  /* -------------------------------------------- */

  /**
   * Toggle a selection on or off.
   * @param {object} selection
   * @param {HTMLElement} target Clicked button
   * @returns {void}
   */
  _toggle(selection, target) {
    const key = selectionKey(selection);
    const index = this.selections.findIndex(s => selectionKey(s) === key);
    if ( index >= 0 ) this.selections.splice(index, 1);
    else this.selections.push(selection);
    target?.classList.toggle("selected", index < 0);
    this.#updateGroupHighlights();
    this.#updateDone();
  }

  /* -------------------------------------------- */

  /**
   * Mark every selectable button that matches a current selection.
   * @returns {void}
   */
  #markSelected() {
    const keys = new Set(this.selections.map(selectionKey));
    const mark = (selection, button) => button.classList.toggle("selected", keys.has(selectionKey(selection)));
    this.element?.querySelectorAll('[data-action="chooseAction"]')
      .forEach(b => mark({ actionKey: b.dataset.actionKey }, b));
    this.element?.querySelectorAll('[data-action="chooseWeapon"]')
      .forEach(b => mark({ actionKey: b.dataset.groupKey, weaponKey: b.dataset.weaponKey }, b));
    this.element?.querySelectorAll('[data-action="chooseSpell"]').forEach(b => mark({
      actionKey: b.dataset.groupKey,
      spellLevel: Number(b.dataset.spellLevel ?? 0),
      spellName: b.dataset.spellName
    }, b));
    this.element?.querySelectorAll('[data-action="chooseSpellLevel"]')
      .forEach(b => mark({ actionKey: b.dataset.groupKey, spellLevel: Number(b.dataset.level ?? 0) }, b));
    this.#updateGroupHighlights();
  }

  /* -------------------------------------------- */

  /**
   * Highlight each group button whose popover contains a selected action.
   * @returns {void}
   */
  #updateGroupHighlights() {
    this.element?.querySelectorAll('[data-action="toggleGroup"]').forEach(button => {
      const popover = this.element.querySelector(
        `.custom-dnd5e-speed-factor-group-popover[data-group-key="${button.dataset.groupKey}"]`);
      button.classList.toggle("selected", !!popover?.querySelector(".selected"));
    });
  }

  /* -------------------------------------------- */

  /**
   * Update the Done button.
   * @returns {void}
   */
  #updateDone() {
    const button = this.element?.querySelector('[data-action="done"]');
    if ( !button ) return;
    const hasSelections = this.selections.length > 0;
    const label = hasSelections
      ? game.i18n.localize("CUSTOM_DND5E.speedFactorInitiative.dialog.done")
      : game.i18n.localize("CUSTOM_DND5E.speedFactorInitiative.dialog.skip");

    button.querySelector(".label").textContent = label;
    button.dataset.tooltip = label;
    button.querySelector(".modifier").textContent = hasSelections
      ? formatModifier(getActionModifier({ selections: this.selections }))
      : "";
    button.querySelector("i").className = hasSelections ? "fas fa-check" : "fas fa-forward-step";
    button.classList.toggle("custom-dnd5e-speed-factor-done", hasSelections);
    button.classList.toggle("custom-dnd5e-speed-factor-skip", !hasSelections);
  }
}
