import { CONSTANTS, MODULE } from "../constants.js";
import { Logger } from "../utils.js";

const FLAG = "locked";
const DESCRIPTION_FLAG = "lockedDescription";
const DESCRIPTION_PATH = `flags.${MODULE.ID}.${DESCRIPTION_FLAG}`;
const CONTAINER_DATA = "dnd5e.dataModels.item.ContainerData.prototype";

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register patches and hooks for locking a container.
 */
export function registerContainerLock() {
  libWrapper.register(MODULE.ID, `${CONTAINER_DATA}.canViewContents`, canViewContentsPatch, "MIXED");
  libWrapper.register(MODULE.ID, `${CONTAINER_DATA}.canDropContents`, canDropContentsPatch, "MIXED");
  libWrapper.register(MODULE.ID, `${CONTAINER_DATA}.prepareDerivedData`, prepareDerivedDataPatch, "WRAPPER");
  libWrapper.register(MODULE.ID, `${CONTAINER_DATA}.getCardData`, descriptionPatch, "WRAPPER");
  libWrapper.register(MODULE.ID, `${CONTAINER_DATA}.getTooltipData`, descriptionPatch, "WRAPPER");
  libWrapper.register(MODULE.ID, `${CONTAINER_DATA}.toEmbed`, toEmbedPatch, "MIXED");
  libWrapper.register(MODULE.ID, "dnd5e.documents.Item5e.prototype.getChatData", getChatDataPatch, "WRAPPER");
  Hooks.on("dnd5e.getItemContextOptions", onGetItemContextOptions);
  Hooks.on("getHeaderControlsContainerSheet", onGetHeaderControls);
  Hooks.on("renderActorSheetV2", addLockIcons);
  Hooks.on("renderContainerSheet", addLockIcons);
  Hooks.on("renderContainerSheet", addLockedDescription);
}

/* -------------------------------------------- */
/*  LOCK STATE                                  */
/* -------------------------------------------- */

/**
 * Whether an item is a locked container.
 * @param {Item|object} item
 * @returns {boolean}
 */
export function isContainerLocked(item) {
  return (item?.type === "container") && !!foundry.utils.getProperty(item, `flags.${MODULE.ID}.${FLAG}`);
}

/* -------------------------------------------- */

/**
 * Set or clear the locked flag on container item data.
 * @param {object} data
 * @param {boolean} locked
 */
export function setContainerLockData(data, locked) {
  if ( locked ) foundry.utils.setProperty(data, `flags.${MODULE.ID}.${FLAG}`, true);
  else if ( data.flags?.[MODULE.ID] ) delete data.flags[MODULE.ID][FLAG];
}

/* -------------------------------------------- */

/**
 * Add the Locked prefix to a name.
 * @param {string} name
 * @returns {string} Prefixed name
 */
export function getLockedName(name) {
  return game.i18n.format("CUSTOM_DND5E.dropItems.lockedName", { name });
}

/* -------------------------------------------- */

/**
 * Get an item's name without the Locked prefix, keeping the unidentified name where one applies.
 * @param {Item} item
 * @returns {string}
 */
export function getUnlockedName(item) {
  if ( item.type !== "container" ) return item.name;
  const system = item.system;
  return (!system.identified && system.unidentified?.name) || item._source.name;
}

/* -------------------------------------------- */

/**
 * Whether a container is locked.
 * @param {Item} item
 * @returns {boolean}
 */
function isLocked(item) {
  if ( item?.type !== "container" ) return false;
  if ( isContainerLocked(item) ) return true;
  const actor = item.parent;
  return (actor?.type === CONSTANTS.DROP_ITEMS.ACTOR_TYPE) && !!actor.system?.locked && !item.system.container;
}

/* -------------------------------------------- */

/**
 * Whether a container's contents and description are hidden from the current user.
 * @param {Item} item
 * @returns {boolean}
 */
function isHiddenFromUser(item) {
  return !game.user.isGM && isLocked(item);
}

/* -------------------------------------------- */

/**
 * Enrich an item's locked description.
 * @param {Item} item
 * @param {object} [options]
 * @returns {Promise<string>} Enriched HTML
 */
function enrichLockedDescription(item, options = {}) {
  return foundry.applications.ux.TextEditor.implementation.enrichHTML(
    foundry.utils.getProperty(item, DESCRIPTION_PATH) ?? "",
    { secrets: item.isOwner, relativeTo: item, rollData: item.getRollData(), ...options }
  );
}

/* -------------------------------------------- */

/**
 * Lock or unlock a container item.
 * @param {Item} item
 * @returns {Promise<Item>} Updated item
 */
function toggleContainerLock(item) {
  return isContainerLocked(item) ? item.unsetFlag(MODULE.ID, FLAG) : item.setFlag(MODULE.ID, FLAG, true);
}

/* -------------------------------------------- */
/*  PATCHES                                     */
/* -------------------------------------------- */

/**
 * Show a locked container's name with the Locked prefix.
 * @param {Function} wrapped
 */
function prepareDerivedDataPatch(wrapped) {
  wrapped();
  const item = this.parent;
  if ( isLocked(item) ) item.name = getLockedName(getUnlockedName(item));
}

/* -------------------------------------------- */

/**
 * Hide a locked container's contents from players.
 * @param {Function} wrapped
 * @returns {boolean} Whether the current user can view the contents
 */
function canViewContentsPatch(wrapped) {
  if ( isHiddenFromUser(this.parent) ) return false;
  return wrapped();
}

/* -------------------------------------------- */

/**
 * Stop players adding items to a locked container.
 * @param {Function} wrapped
 * @param {...any} args
 * @returns {Promise<boolean>|boolean} Whether items can be added
 */
function canDropContentsPatch(wrapped, ...args) {
  if ( isHiddenFromUser(this.parent) ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.containerLocked"), true, { prefix: false });
    return false;
  }
  return wrapped(...args);
}

/* -------------------------------------------- */

/**
 * Swap in the locked description on chat cards and tooltips.
 * @param {Function} wrapped
 * @param {object} [options]
 * @returns {Promise<object>} Card or tooltip data
 */
async function descriptionPatch(wrapped, options = {}) {
  const data = await wrapped(options);
  if ( isHiddenFromUser(this.parent) ) data.description = await enrichLockedDescription(this.parent);
  return data;
}

/* -------------------------------------------- */

/**
 * Embed the locked description instead of the real one.
 * @param {Function} wrapped
 * @param {object} config
 * @param {object} [options]
 * @returns {Promise<HTMLCollection|null>} Embedded content
 */
async function toEmbedPatch(wrapped, config, options = {}) {
  if ( !isHiddenFromUser(this.parent) ) return wrapped(config, options);
  const container = document.createElement("div");
  container.innerHTML = await enrichLockedDescription(this.parent, options);
  return container.children;
}

/* -------------------------------------------- */

/**
 * Swap in the locked description when an item's summary is expanded in an inventory.
 * @param {Function} wrapped
 * @param {object} [htmlOptions]
 * @returns {Promise<object>} Chat data
 */
async function getChatDataPatch(wrapped, htmlOptions = {}) {
  const data = await wrapped(htmlOptions);
  if ( isHiddenFromUser(this) ) data.description = await enrichLockedDescription(this, htmlOptions);
  return data;
}

/* -------------------------------------------- */
/*  UI                                          */
/* -------------------------------------------- */

/**
 * Add a Lock or Unlock Container option to the item context menu for GMs.
 * @param {Item} item
 * @param {object[]} menuItems
 */
function onGetItemContextOptions(item, menuItems) {
  if ( !game.user.isGM || (item.type !== "container") ) return;
  const locked = isContainerLocked(item);
  menuItems.push({
    name: locked ? "CUSTOM_DND5E.dropItems.context.unlock" : "CUSTOM_DND5E.dropItems.context.lock",
    icon: `<i class="fas ${locked ? "fa-lock-open" : "fa-lock"}"></i>`,
    callback: () => toggleContainerLock(item)
  });
}

/* -------------------------------------------- */

/**
 * Add a Lock or Unlock Container control to the container sheet header for GMs.
 * @param {ApplicationV2} app
 * @param {object[]} controls
 */
function onGetHeaderControls(app, controls) {
  const item = app.item;
  if ( !game.user.isGM || !item?.isOwner ) return;
  const locked = isContainerLocked(item);
  controls.push({
    action: "customDnd5eToggleLock",
    icon: `fas ${locked ? "fa-lock-open" : "fa-lock"}`,
    label: locked ? "CUSTOM_DND5E.dropItems.hud.unlockContainer" : "CUSTOM_DND5E.dropItems.hud.lockContainer",
    onClick: () => toggleContainerLock(item)
  });
}

/* -------------------------------------------- */

/**
 * Show a lock icon on locked containers in inventory lists, the container strip and the container sheet image.
 * @param {ApplicationV2} app
 * @param {HTMLElement} html
 */
function addLockIcons(app, html) {
  const label = game.i18n.localize("CUSTOM_DND5E.dropItems.locked");
  const createIcon = () => {
    const icon = document.createElement("i");
    icon.className = "custom-dnd5e-locked fa-solid fa-lock";
    icon.dataset.tooltip = "";
    icon.ariaLabel = label;
    return icon;
  };

  const headerImage = app.item && html.querySelector(".sheet-header > .left");
  if ( headerImage && isLocked(app.item) && !headerImage.querySelector(".custom-dnd5e-locked") ) {
    headerImage.append(createIcon());
  }

  html.querySelectorAll("li.item[data-uuid], li.container[data-uuid]").forEach(li => {
    const item = fromUuidSync(li.dataset.uuid);
    if ( !isContainerLocked(item) ) return;

    if ( li.classList.contains("container") ) {
      const link = li.querySelector(".item-action");
      if ( !link || link.querySelector(".custom-dnd5e-locked") ) return;
      link.append(createIcon());
      return;
    }

    const tags = li.querySelector(".item-name .tags");
    if ( !tags || tags.querySelector(".custom-dnd5e-locked") ) return;
    const tag = document.createElement("span");
    tag.className = "custom-dnd5e-locked";
    tag.dataset.tooltip = "";
    tag.ariaLabel = label;
    tag.innerHTML = '<i class="fa-solid fa-lock"></i>';
    tags.append(tag);
  });
}

/* -------------------------------------------- */

/**
 * Add a Locked Description card to the container sheet's description tab.
 * @param {ApplicationV2} app
 * @param {HTMLElement} html
 */
async function addLockedDescription(app, html) {
  const item = app.item;
  const descriptions = html.querySelector(".tab.description .item-descriptions");
  if ( !item || !descriptions || descriptions.querySelector(`[data-target="${DESCRIPTION_PATH}"]`) ) return;

  const hidden = isHiddenFromUser(item);
  if ( !game.user.isGM && !hidden ) return;

  const enriched = await enrichLockedDescription(item);
  const canEdit = game.user.isGM && !!html.querySelector('.item-descriptions [data-action="editDescription"]');
  const collapsible = game.user.isGM;
  const label = game.i18n.localize(hidden ? "DND5E.Description" : "CUSTOM_DND5E.dropItems.lockedDescription");

  const card = document.createElement("div");
  card.classList.add("card", "description");
  if ( collapsible ) card.classList.add("collapsible");
  if ( collapsible && !app.expandedSections?.get(DESCRIPTION_PATH) ) card.classList.add("collapsed");
  if ( !enriched ) card.classList.add("empty");
  card.dataset.target = DESCRIPTION_PATH;
  if ( collapsible ) {
    card.dataset.action = "toggleCollapsed";
    card.dataset.expandId = DESCRIPTION_PATH;
  }
  card.innerHTML = `
    <div class="header">
      <span>${label}</span>
      ${canEdit ? `<button type="button" class="unbutton control-button always-interactive"
        data-action="editDescription" data-target="${DESCRIPTION_PATH}"
        aria-label="${game.i18n.format("DND5E.DescriptionEdit", { description: label })}">
        <i class="fas fa-feather" inert></i>
      </button>` : ""}
    </div>
    <div class="details collapsible-content">
      <div class="editor editor-content wrapper">${enriched}</div>
    </div>`;

  if ( hidden ) {
    if ( enriched ) descriptions.replaceChildren(card);
    else descriptions.replaceChildren();
    return;
  }
  const main = descriptions.querySelector('[data-target="system.description.value"]');
  if ( main ) main.after(card);
  else descriptions.prepend(card);
}
