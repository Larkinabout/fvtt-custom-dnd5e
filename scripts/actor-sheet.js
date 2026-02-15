import { CONSTANTS, SHEET_TYPE } from "./constants.js";
import { c5eLoadTemplates, getFlag, getSetting, registerMenu, registerSetting } from "./utils.js";
import { ActorSheetForm } from "./forms/actor-sheet-form.js";

const constants = CONSTANTS.ACTOR_SHEET;

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  registerHooks();

  const templates = [constants.TEMPLATE.FORM, constants.TEMPLATE.TOKEN_DISPOSITION];
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: ActorSheetForm,
      restricted: false,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.BANNER_IMAGE.KEY,
    {
      scope: "world",
      config: false,
      type: String
    }
  );

  registerSetting(
    constants.SETTING.SHOW_DEATH_SAVES.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    constants.SETTING.SHOW_ENCUMBRANCE.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    constants.SETTING.SHOW_EXHAUSTION.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    constants.SETTING.SHOW_INSPIRATION.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    constants.SETTING.SHOW_USE_LAIR_ACTION.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    constants.SETTING.SHOW_LEGENDARY_ACTIONS.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    constants.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    constants.SETTING.SHOW_MANAGE_CURRENCY.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    constants.SETTING.SHOW_TOKEN_DISPOSITION.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("renderActorSheetV2", (app, data) => {
    const sheetType = SHEET_TYPE[app.constructor.name];

    if ( !sheetType ) return;

    setSheetScale(sheetType, app);
  });

  Hooks.on("renderActorSheetV2", (app, html, data) => {
    const sheetType = SHEET_TYPE[app.constructor.name];

    if ( !sheetType ) return;

    if ( html.classList.contains("application") ) {
      if ( getFlag(game.user, constants.SETTING.AUTO_FADE_SHEET.KEY) ) { enableAutoFade(html); }
      if ( getFlag(game.user, constants.SETTING.AUTO_MINIMISE_SHEET.KEY) ) { enableAutoMinimise(app, html); }
    }

    setBannerImage(sheetType, html);
    if ( !getSetting(constants.SETTING.SHOW_DEATH_SAVES.KEY) ) {
      removeDeathSaves(sheetType, html);
    }
    if ( !getSetting(constants.SETTING.SHOW_ENCUMBRANCE.KEY) ) {
      removeEncumbrance(sheetType, html);
    }
    if ( !getSetting(constants.SETTING.SHOW_EXHAUSTION.KEY) ) {
      removeExhaustion(sheetType, html);
    }
    if ( !getSetting(constants.SETTING.SHOW_INSPIRATION.KEY) ) {
      removeInspiration(sheetType, html);
    }
    if ( !getSetting(constants.SETTING.SHOW_LEGENDARY_ACTIONS.KEY) ) {
      removeLegendaryActions(sheetType, html);
    }
    if ( !getSetting(constants.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY) ) {
      removeLegendaryResistance(sheetType, html);
    }
    if ( !getSetting(constants.SETTING.SHOW_MANAGE_CURRENCY.KEY) ) {
      removeManageCurrency(sheetType, html);
    }
    if ( !getSetting(constants.SETTING.SHOW_USE_LAIR_ACTION.KEY) ) {
      removeUseLairAction(sheetType, html);
    }
    if ( sheetType.npc && getSetting(constants.SETTING.SHOW_TOKEN_DISPOSITION.KEY) ) {
      insertTokenDisposition(app, html);
    }
  });
}

/* -------------------------------------------- */

/**
 * Enable auto-fade.
 * @param {object} html The HTML
 */
function enableAutoFade(html) {
  html.addEventListener("mouseleave", event => { reduceOpacity(event, html); });
  html.addEventListener("mouseenter", event => { increaseOpacity(event, html); });
}

/* -------------------------------------------- */

/**
 * Reduce opacity.
 * @param {object} event The event
 * @param {object} html The HTML
 */
function reduceOpacity(event, html) {
  if ( event.ctrlKey ) return;
  html.style.transition = "opacity 0.2s ease 0s";
  html.style.opacity = "0.2";
}

/* -------------------------------------------- */

/**
 * Increase opacity.
 * @param {object} event The event
 * @param {object} html The HTML
 */
function increaseOpacity(event, html) {
  const id = html.id;
  if ( !id || event.ctrlKey ) return;
  if ( event?.target?.closest(`#${id}`) ) {
    html.style.opacity = "";
  }
}

/* -------------------------------------------- */

/**
 * Enable auto-minimise.
 * @param {object} app The app
 * @param {object} html The HTML
 */
function enableAutoMinimise(app, html) {
  html.addEventListener("mouseleave", event => { minimise(event, app); });
  html.addEventListener("mouseenter", event => { maximise(event, app); });
}

/* -------------------------------------------- */

/**
 * Minimise sheet.
 * @param {object} event The event
 * @param {object} app The app
 */
function minimise(event, app) {
  if ( event.ctrlKey ) return;
  app.minimize(event);
}

/* -------------------------------------------- */

/**
 * Maximise sheet.
 * @param {object} event The event
 * @param {object} app The app
 */
function maximise(event, app) {
  if ( event.ctrlKey ) return;
  app.maximize(event);
  app.bringToFront();
}

/* -------------------------------------------- */

/**
 * Scale the character sheet.
 * @param {object} sheetType The sheet type
 * @param {object} app The app
 */
function setSheetScale(sheetType, app) {
  if ( !sheetType.character || sheetType.legacy ) return;

  const flag = getFlag(game.user, constants.SETTING.SHEET_SCALE.KEY);

  if ( flag ) {
    app.position.scale = flag;
  }
}

/* -------------------------------------------- */

/**
 * Set banner image on the character sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function setBannerImage(sheetType, html) {
  if ( !sheetType.character ) return;

  const bannerImage = getSetting(constants.SETTING.BANNER_IMAGE.KEY);

  if ( !bannerImage ) return;

  const style = document.createElement("style");

  style.innerHTML = `
    .dnd5e2.sheet.actor.character.theme-dark .window-content::before {
        background: url("${bannerImage}") no-repeat top center / cover;
    }
    .dnd5e2.sheet.actor.character.theme-light .sheet-header {
        background: url("${bannerImage}") no-repeat center / cover;
    
    `;
  document.head.append(style);
}

/* -------------------------------------------- */

/**
 * Remove Death Saves from the character sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function removeDeathSaves(sheetType, html) {
  if ( sheetType.character ) {
    const deathSaves = (sheetType.legacy) ? html.querySelector(".death-saves") : html.querySelector(".death-tray");
    if ( deathSaves ) {
      deathSaves.style.display = "none";
    }
  }
}

/* -------------------------------------------- */

/**
 * Remove encumbrance from the character sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function removeEncumbrance(sheetType, html) {
  if ( sheetType.character ) {
    const encumbrance = (sheetType.legacy) ? html.querySelector(".encumbrance") : html.querySelector(".encumbrance.card");
    encumbrance?.remove();
  }
}

/* -------------------------------------------- */

/**
 * Remove exhaustion from the character sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function removeExhaustion(sheetType, html) {
  if ( sheetType.character ) {
    if ( sheetType.legacy ) {
      const exhaustion = html.querySelector(".exhaustion");
      exhaustion?.remove();
    } else {
      const exhaustion = html.querySelectorAll('[data-prop="system.attributes.exhaustion"]');
      exhaustion.forEach(e => e.remove());
      const ac = html.querySelector(".ac");
      if ( ac ) {
        ac.style.marginTop = "-41px";
        ac.style.width = "100%";
      }
      const lozenges = html.querySelector(".lozenges");
      if ( lozenges ) {
        lozenges.style.marginTop = "-15px";
      }
    }
  }
}

/* -------------------------------------------- */

/**
 * Remove inspiration from the character sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function removeInspiration(sheetType, html) {
  if ( sheetType.character ) {
    const inspiration = (sheetType.legacy) ? html.querySelector(".inspiration") : html.querySelector("button.inspiration");
    inspiration?.remove();
  }
}

/* -------------------------------------------- */

/**
 * Remove Legendary Actions from the NPC sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function removeLegendaryActions(sheetType, html) {
  if ( !sheetType.npc ) return;

  const legendaryActions = (sheetType.legacy)
    ? html.querySelector('input[name="system.resources.legact.value"]')?.closest("div.legendary")
    : html.querySelector(".legact");

  legendaryActions?.remove();
}

/* -------------------------------------------- */

/**
 * Remove Legendary Resistance from the NPC sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function removeLegendaryResistance(sheetType, html) {
  if ( !sheetType.npc ) return;

  const legendaryResistance = (sheetType.legacy)
    ? html.querySelector('input[name="system.resources.legres.value"]')?.closest("div.legendary")
    : html.querySelector(".legres");

  legendaryResistance?.remove();
}

/* -------------------------------------------- */

/**
 * Remove Manage Currency from the character sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function removeManageCurrency(sheetType, html) {
  if ( sheetType.character && !sheetType.legacy ) {
    const button = html.querySelector("button[data-action='currency']");
    button?.remove();
  }
}

/* -------------------------------------------- */

/**
 * Remove Use Lair Action from the NPC sheet.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function removeUseLairAction(sheetType, html) {
  if ( !sheetType.npc ) return;

  const useLairAction = html.querySelector(".lair");

  useLairAction?.remove();
}

/* -------------------------------------------- */

/**
 * Insert token disposition buttons into the NPC sheet sidebar.
 * @param {object} app The app
 * @param {object} html The HTML
 */
async function insertTokenDisposition(app, html) {
  const sidebar = html.querySelector(".sidebar");
  if ( !sidebar ) return;

  const isToken = app.document.isToken;
  const disposition = isToken
    ? app.document.token.disposition
    : app.document.prototypeToken.disposition;

  const existing = sidebar.querySelector(".custom-dnd5e-token-disposition");
  if ( existing ) existing.remove();

  const template = await foundry.applications.handlebars.renderTemplate(
    constants.TEMPLATE.TOKEN_DISPOSITION,
    { disposition }
  );
  sidebar.insertAdjacentHTML("afterbegin", template);

  const buttons = sidebar.querySelectorAll(".custom-dnd5e-disposition-button");
  buttons.forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const value = Number(button.dataset.disposition);
      if ( isToken ) {
        await app.document.token.update({ disposition: value });
      } else {
        await app.document.update({ "prototypeToken.disposition": value });
      }
      buttons.forEach(b => b.classList.toggle("active", Number(b.dataset.disposition) === value));
    });
  });
}
