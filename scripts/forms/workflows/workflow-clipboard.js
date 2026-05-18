import { Logger } from "../../utils.js";
import { EVENT_TO_HOOK, ITEM_EVENT_TO_HOOK } from "../../workflows/workflows.js";
import { getActionChoices } from "./workflows-edit.js";

/**
 * Serialize a workflow (with its entityType) and write the JSON to the clipboard.
 * @param {object} workflow Workflow data
 * @param {string} entityType "actor" or "item"
 * @param {string} [fallbackName] Name to use if the workflow has none
 * @returns {Promise<boolean>} True if the copy succeeded
 */
export async function copyWorkflowToClipboard(workflow, entityType, fallbackName = "") {
  const payload = foundry.utils.deepClone({ ...workflow, entityType });
  const json = JSON.stringify(payload, null, 2);

  try {
    await navigator.clipboard.writeText(json);
    Logger.info(
      game.i18n.format("CUSTOM_DND5E.workflowExport.success", { name: workflow.name || fallbackName }),
      true
    );
    return true;
  } catch {
    Logger.error(game.i18n.localize("CUSTOM_DND5E.workflowExport.error.clipboard"), true);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Prefill the paste dialog with the current clipboard contents.
 * @param {(text: string) => Promise<void>} onSubmit Callback invoked with the trimmed pasted text
 */
export async function promptForWorkflowJson(onSubmit) {
  let initial = "";
  try {
    initial = await navigator.clipboard.readText();
  } catch {
    // Clipboard unavailable
  }

  const placeholder = game.i18n.localize("CUSTOM_DND5E.workflowImport.paste.placeholder");
  await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("CUSTOM_DND5E.workflowImport.paste.title") },
    content: `<textarea id="custom-dnd5e-workflow-paste" placeholder="${placeholder}" style="width:100%; min-height:18rem; font-family:monospace; resize:vertical;">${foundry.utils.escapeHTML(initial)}</textarea>`,
    modal: true,
    ok: {
      label: game.i18n.localize("CUSTOM_DND5E.import"),
      callback: async (event, button, dialog) => {
        const text = dialog.element.querySelector("#custom-dnd5e-workflow-paste")?.value?.trim();
        if ( !text ) return;
        await onSubmit(text);
      }
    }
  });
}

/* -------------------------------------------- */

/**
 * Validate a parsed workflow object against the expected schema.
 * @param {*} data Parsed object
 * @param {string} [defaultEntityType] "actor" or "item"
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateWorkflowSchema(data, defaultEntityType = "actor") {
  if ( !data || typeof data !== "object" || Array.isArray(data) ) {
    return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.notObject") };
  }

  if ( typeof data.name !== "string" || !data.name.trim() ) {
    return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.invalidName") };
  }

  if ( data.entityType !== undefined && data.entityType !== "actor" && data.entityType !== "item" ) {
    return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.invalidEntityType") };
  }

  const allowedKeys = new Set([
    "name", "enabled", "entityType", "actorTypes", "target", "triggers", "actions"
  ]);
  for ( const key of Object.keys(data) ) {
    if ( !allowedKeys.has(key) ) {
      return {
        valid: false,
        error: game.i18n.format("CUSTOM_DND5E.workflowImport.error.unknownProperty", { property: key })
      };
    }
  }

  const entityType = data.entityType ?? defaultEntityType;
  const isItem = entityType === "item";
  const validEvents = new Set(Object.keys(isItem ? ITEM_EVENT_TO_HOOK : EVENT_TO_HOOK));
  if ( data.triggers !== undefined ) {
    if ( typeof data.triggers !== "object" || data.triggers === null ) {
      return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.invalidTrigger") };
    }
    for ( const trigger of Object.values(data.triggers) ) {
      if ( !trigger || typeof trigger.event !== "string" || !validEvents.has(trigger.event) ) {
        return {
          valid: false,
          error: game.i18n.format("CUSTOM_DND5E.workflowImport.error.invalidTrigger", { event: trigger?.event ?? "" })
        };
      }
    }
  }

  const validActionTypes = new Set(getActionChoices(entityType).map(c => c.value));
  if ( data.actions !== undefined ) {
    if ( typeof data.actions !== "object" || data.actions === null ) {
      return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.invalidAction") };
    }
    for ( const action of Object.values(data.actions) ) {
      if ( !action || typeof action.type !== "string" || !validActionTypes.has(action.type) ) {
        return {
          valid: false,
          error: game.i18n.format("CUSTOM_DND5E.workflowImport.error.invalidAction", { type: action?.type ?? "" })
        };
      }
    }
  }

  return { valid: true, error: null };
}

/* -------------------------------------------- */

/**
 * Parse a JSON string into one or more validated workflows.
 * @param {string} text Raw JSON text
 * @param {string} [defaultEntityType] "actor" or "item"
 * @returns {object[]|null} Array of validated workflow objects, or null on failure
 */
export function parseAndValidateWorkflows(text, defaultEntityType = "actor") {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    Logger.error(game.i18n.format("CUSTOM_DND5E.journalImport.error.parseFailed", { error: err.message }), true);
    return null;
  }
  const candidates = Array.isArray(parsed) ? parsed : [parsed];
  const validated = [];
  for ( const entry of candidates ) {
    const result = validateWorkflowSchema(entry, defaultEntityType);
    if ( !result.valid ) {
      Logger.error(result.error, true);
      return null;
    }
    validated.push(entry);
  }
  return validated;
}
