import { CONSTANTS, MODULE } from "../constants.js";
import {
  c5eLoadTemplates,
  getSetting,
  Logger,
  registerMenu,
  registerSetting,
  registerTokenAppearance
} from "../utils.js";
import { HazardsForm } from "../forms/hazards-form.js";
import { HazardConfig } from "./hazard-config.js";
import {
  getActivityOptions,
  getDefaultActivity,
  HazardRegionBehaviorType,
  isHazardActor
} from "./hazard-region-behavior.js";

const constants = CONSTANTS.HAZARDS;
const SETTING = constants.SETTING;
const TYPE = constants.BEHAVIOR_TYPE;
const FLAG = "hazard";
const MID_TONES = { min: 0.25, max: 0.8 };

/**
 * Id of the last region dropped onto.
 */
let droppedOnRegionId = null;

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register the menu, settings, the Hazard region behavior, its config sheet and hooks.
 */
export function register() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: HazardsForm,
      restricted: true,
      scope: "world"
    }
  );
  registerSettings();

  CONFIG.RegionBehavior.dataModels[TYPE] = HazardRegionBehaviorType;
  CONFIG.RegionBehavior.typeIcons[TYPE] = constants.ICON;
  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(foundry.documents.RegionBehavior, MODULE.ID, HazardConfig, {
    types: [TYPE],
    makeDefault: true,
    label: "CUSTOM_DND5E.hazards.sheet"
  });
  c5eLoadTemplates([constants.TEMPLATE.CONFIG, constants.TEMPLATE.FORM]);

  libWrapper.register(MODULE.ID, "CONFIG.Region.documentClass.prototype._handleEvent", handleHiddenRegionEvent, "WRAPPER");
  libWrapper.register(MODULE.ID, "CONFIG.Region.objectClass.prototype.isVisible", isHiddenRegionVisible, "WRAPPER");

  Hooks.on("dropCanvasData", onDropCanvasData);
  Hooks.on("preCreateToken", onPreCreateToken);
  Hooks.on("createToken", onCreateToken);
  registerTokenAppearance(token => !!token.document.getFlag(MODULE.ID, FLAG), SETTING);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  const settings = [
    [SETTING.ENABLE.KEY, Boolean, false],
    [SETTING.TOKEN_SCALE.KEY, Number, 1],
    [SETTING.TOKEN_HIDDEN.KEY, Boolean, false],
    [SETTING.IMAGE_SHAPE.KEY, String, "none"],
    [SETTING.IMAGE_BORDER_COLOR.KEY, String, "#9f9275"],
    [SETTING.IMAGE_BORDER_THICKNESS.KEY, Number, 0],
    [SETTING.REGION_DISTANCE.KEY, Number, 5],
    [SETTING.PROMPT_DISTANCE.KEY, Boolean, true],
    [SETTING.REGION_VISIBILITY.KEY, Number, CONST.REGION_VISIBILITY.LAYER_UNLOCKED],
    [SETTING.REGION_RESTRICTED.KEY, Boolean, false],
    [SETTING.REGION_RESTRICTION_TYPE.KEY, String, "move"],
    [SETTING.REGION_RESTRICTION_PRIORITY.KEY, Number, 0],
    [SETTING.REGION_COLOR_FROM_IMAGE.KEY, Boolean, true],
    [SETTING.AFFECTS.KEY, String, "all"]
  ];
  for ( const [key, type, defaultValue] of settings ) {
    registerSetting(key, { scope: "world", config: false, type, default: defaultValue });
  }
}

/* -------------------------------------------- */
/*  HIDDEN HAZARDS                              */
/* -------------------------------------------- */

/**
 * Get the enabled Hazard behaviors of a region that is only hidden because the token it is
 * attached to is hidden.
 * @param {RegionDocument} region
 * @returns {RegionBehavior[]}
 */
function getHiddenHazards(region) {
  if ( !region.hidden || !region.attachment.token?.hidden ) return [];
  return region.behaviors.filter(behavior => (behavior.type === TYPE) && !behavior.disabled);
}

/* -------------------------------------------- */

/**
 * Keep hazards working while their token is hidden, otherwise Foundry ignores events for hidden
 * regions.
 * @param {Function} wrapped
 * @param {RegionEvent} event
 * @returns {Promise<void>}
 */
async function handleHiddenRegionEvent(wrapped, event) {
  const hazards = getHiddenHazards(this);
  if ( hazards.length ) {
    const results = await Promise.allSettled(hazards.map(behavior => behavior._handleRegionEvent(event)));
    for ( const result of results ) {
      if ( result.status === "rejected" ) Logger.error(result.reason);
    }
  }
  return wrapped(event);
}

/* -------------------------------------------- */

/**
 * Show a hazard's region to players while its token is hidden.
 * @param {Function} wrapped
 * @returns {boolean}
 */
function isHiddenRegionVisible(wrapped) {
  const visible = wrapped();
  if ( visible || game.user.isGM || this.hasPreview || this.isFilteredOut ) return visible;
  if ( !getHiddenHazards(this.document).length ) return visible;

  const { OBSERVER, ALWAYS } = CONST.REGION_VISIBILITY;
  if ( this.document.visibility === ALWAYS ) return true;
  if ( this.document.visibility === OBSERVER ) return this.document.testUserPermission(game.user, "OBSERVER");
  return false;
}

/* -------------------------------------------- */
/*  DROP HANDLERS                               */
/* -------------------------------------------- */

/**
 * Store which region an actor was dropped onto.
 * @param {Canvas} _canvas
 * @param {object} data
 */
function onDropCanvasData(_canvas, data) {
  if ( data?.type !== "Actor" ) return;
  droppedOnRegionId = null;
  if ( !game.user.isGM || !getSetting(SETTING.ENABLE.KEY) ) return;
  const regions = canvas.regions.placeables.filter(region => region.document.polygonTree.testPoint(data));
  droppedOnRegionId = (regions.find(region => region.controlled) ?? regions.at(-1))?.id ?? null;
}

/* -------------------------------------------- */

/**
 * Apply the default token settings to a hazard token.
 * @param {TokenDocument} token
 */
function onPreCreateToken(token) {
  if ( !game.user.isGM || !getSetting(SETTING.ENABLE.KEY) ) return;
  if ( !isHazardActor(token.actor) ) return;

  const update = { [`flags.${MODULE.ID}.${FLAG}`]: true };
  if ( getSetting(SETTING.TOKEN_HIDDEN.KEY) ) update.hidden = true;
  const scale = Number(getSetting(SETTING.TOKEN_SCALE.KEY)) || 1;
  if ( scale !== 1 ) {
    update["texture.scaleX"] = scale;
    update["texture.scaleY"] = scale;
  }
  token.updateSource(update);
}

/* -------------------------------------------- */

/**
 * Create an emanation region and attach to the token or, with confirmation, attach the token to an existing region.
 * @param {TokenDocument} token
 * @param {object} _options
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function onCreateToken(token, _options, userId) {
  if ( userId !== game.user.id ) return;
  const regionId = droppedOnRegionId;
  droppedOnRegionId = null;
  if ( !game.user.isGM || !getSetting(SETTING.ENABLE.KEY) ) return;
  if ( !token.getFlag(MODULE.ID, FLAG) ) return;

  const actor = token.actor;
  if ( !actor || !getActivityOptions(actor).length ) return;
  const activity = getDefaultActivity(actor);
  const behavior = {
    type: TYPE,
    name: token.name,
    system: {
      triggers: { enter: activity, turnStart: activity },
      affects: { type: getSetting(SETTING.AFFECTS.KEY) || "all" }
    }
  };

  const region = regionId ? token.parent.regions.get(regionId) : null;
  if ( region && !region.attachment.token && await confirmAttach(token, region) ) {
    await region.update({ attachment: { token: token.id }, levels: [token._source.level], hidden: token.hidden });
    await region.createEmbeddedDocuments("RegionBehavior", [behavior]);
    return;
  }

  const distance = await getDistance(token);
  if ( distance === null ) return;
  await foundry.documents.RegionDocument.createTokenEmanation(
    token,
    distance,
    { ...(await getRegionDefaults(token)), name: token.name, hidden: token.hidden, behaviors: [behavior] },
    { gridBased: true }
  );
}

/* -------------------------------------------- */

/**
 * Ask whether to attach a hazard token to the region it was dropped onto.
 * @param {TokenDocument} token
 * @param {RegionDocument} region
 * @returns {Promise<boolean>} Whether the GM chose to attach a hazard token to the region
 */
async function confirmAttach(token, region) {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CUSTOM_DND5E.hazards.attach.title") },
    content: `<p>${game.i18n.format("CUSTOM_DND5E.hazards.attach.content", {
      name: foundry.utils.escapeHTML(token.name),
      region: foundry.utils.escapeHTML(region.name)
    })}</p>`,
    yes: { label: game.i18n.localize("CUSTOM_DND5E.yes") },
    no: { label: game.i18n.localize("CUSTOM_DND5E.no") },
    rejectClose: false
  });
  return !!confirmed;
}

/* -------------------------------------------- */

/**
 * Get the default settings for a new hazard region.
 * @param {TokenDocument} token
 * @returns {Promise<object>} Region data
 */
async function getRegionDefaults(token) {
  const data = {
    visibility: Number(getSetting(SETTING.REGION_VISIBILITY.KEY)),
    restriction: {
      enabled: !!getSetting(SETTING.REGION_RESTRICTED.KEY),
      type: getSetting(SETTING.REGION_RESTRICTION_TYPE.KEY) || "move",
      priority: Math.max(0, Math.round(Number(getSetting(SETTING.REGION_RESTRICTION_PRIORITY.KEY)) || 0))
    }
  };
  const color = getSetting(SETTING.REGION_COLOR_FROM_IMAGE.KEY) ? await getImageColor(token.texture.src) : null;
  if ( color ) data.color = color;
  return data;
}

/* -------------------------------------------- */

/**
 * Get the colour of an image from its mid tones.
 * @param {string} src Image path
 * @returns {Promise<string|null>} Hex colour, or null if the image could not be read
 */
async function getImageColor(src) {
  try {
    const texture = await foundry.canvas.loadTexture(src);
    const source = texture?.baseTexture?.resource?.source;
    if ( !source ) return null;

    const size = 32;
    const sample = document.createElement("canvas");
    sample.width = sample.height = size;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(source, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;

    const mid = [0, 0, 0, 0];
    const all = [0, 0, 0, 0];
    for ( let i = 0; i < pixels.length; i += 4 ) {
      const rgb = [pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255];
      const alpha = pixels[i + 3] / 255;
      const max = Math.max(...rgb);
      const min = Math.min(...rgb);
      const lightness = (max + min) / 2;
      addPixel(all, rgb, alpha);
      if ( (lightness >= MID_TONES.min) && (lightness <= MID_TONES.max) ) addPixel(mid, rgb, alpha * (max - min));
    }

    const [red, green, blue, total] = mid[3] ? mid : all;
    if ( !total ) return null;
    return Color.fromRGB([red / total, green / total, blue / total]).css;
  } catch {
    return null;
  }
}

/* -------------------------------------------- */

/**
 * Add a pixel to a running colour total.
 * @param {number[]} totals RGB and weight totals
 * @param {number[]} rgb RGB from 0 to 1
 * @param {number} weight How much the pixel counts
 */
function addPixel(totals, rgb, weight) {
  totals[0] += rgb[0] * weight;
  totals[1] += rgb[1] * weight;
  totals[2] += rgb[2] * weight;
  totals[3] += weight;
}

/* -------------------------------------------- */

/**
 * Get the distance for a new region emanation using either the default setting or the value provided via the dialog.
 * @param {TokenDocument} token
 * @returns {Promise<number|null>} Distance in scene units, or null if the dialog was closed
 */
async function getDistance(token) {
  const distance = Math.max(Number(getSetting(SETTING.REGION_DISTANCE.KEY)) || 0, 0);
  if ( !getSetting(SETTING.PROMPT_DISTANCE.KEY) ) return distance;

  const field = new foundry.data.fields.NumberField({
    label: game.i18n.format("CUSTOM_DND5E.hazards.dialog.distance.label", { units: token.parent.grid.units }),
    hint: game.i18n.localize("CUSTOM_DND5E.hazards.dialog.distance.hint"),
    min: 0
  });
  const result = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.format("CUSTOM_DND5E.hazards.dialog.title", { name: token.name }) },
    content: field.toFormGroup({}, { name: "distance", value: distance }).outerHTML,
    ok: { label: game.i18n.localize("CUSTOM_DND5E.hazards.dialog.ok") },
    rejectClose: false
  });
  if ( !result ) return null;
  return Math.max(Number(result.distance) || 0, 0);
}
