import { DESCRIPTION_PATH, LOCKED_PATH, isHiddenFromUser } from "./container-lock.js";

/**
 * Register Tidy 5e Sheets integration for locked containers.
 */
export function registerContainerLockTidy5e() {
  if ( !game.modules.get("tidy5e-sheet")?.active ) return;

  Hooks.once("tidy5e-sheet.ready", api => {
    api.config?.item?.registerToggle?.({
      id: "custom-dnd5e-locked",
      label: "CUSTOM_DND5E.dropItems.locked",
      icon: "fa-solid fa-lock fa-fw",
      itemTypes: ["container"],
      field: LOCKED_PATH,
      editable: () => game.user.isGM,
      visible: () => game.user.isGM
    });

    api.config?.item?.registerDescription?.({
      id: "custom-dnd5e-locked-description",
      label: "CUSTOM_DND5E.dropItems.lockedDescription",
      itemTypes: ["container"],
      field: DESCRIPTION_PATH,
      editable: () => game.user.isGM,
      visible: () => game.user.isGM
    });
  });

  Hooks.on("tidy5e-sheet.contentsConcealedConfig", onContentsConcealedConfig);
}

/* -------------------------------------------- */

/**
 * Show the locked notice and description to players viewing a locked container.
 * @param {Item} container
 * @param {object} data
 */
function onContentsConcealedConfig(container, data) {
  if ( !isHiddenFromUser(container) || (container.system.identified === false) ) return;
  data.notice = "CUSTOM_DND5E.dropItems.lockedNotice";
  data.description = foundry.utils.getProperty(container, DESCRIPTION_PATH) ?? "";
  data.path = DESCRIPTION_PATH;
  data.editable = false;
}
