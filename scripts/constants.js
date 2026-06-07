export const MODULE = {
  ID: "custom-dnd5e",
  NAME: "Custom D&D 5e"
};

export const CONSTANTS = {
  CONFIG: {
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/config-form.hbs",
      EDIT_IN_LIST: "modules/custom-dnd5e/templates/config-edit-in-list.hbs",
      LIST: "modules/custom-dnd5e/templates/config-list.hbs"
    }
  },
  ACTIVITIES: {
    ID: "activities",
    MENU: {
      KEY: "activities-menu",
      HINT: "CUSTOM_DND5E.menu.activities.hint",
      ICON: "fas fa-cogs",
      LABEL: "CUSTOM_DND5E.menu.activities.label",
      NAME: "CUSTOM_DND5E.menu.activities.name"
    },
    SETTING: {
      CONFIG: {
        KEY: "activities"
      }
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/activities-form.hbs",
      MACRO_EFFECT: "modules/custom-dnd5e/templates/activity/macro-effect.hbs",
      MOVE_EFFECT: "modules/custom-dnd5e/templates/activity/move-effect.hbs",
      SWAP_ACTIVATION: "modules/custom-dnd5e/templates/activity/swap-activation.hbs",
      SWAP_TARGETING: "modules/custom-dnd5e/templates/activity/swap-targeting.hbs",
      SWAP_EFFECT: "modules/custom-dnd5e/templates/activity/swap-effect.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.xK7mNpV3tZwQ4rY2",
    PAGE_UUID: {
      MACRO: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.xK7mNpV3tZwQ4rY2.JournalEntryPage.bS3oZvYxU5aEqL0d",
      MOVE: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.xK7mNpV3tZwQ4rY2.JournalEntryPage.cT4pAvZyV6bFrM1e",
      SWAP: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.xK7mNpV3tZwQ4rY2.JournalEntryPage.dU5qBwAzW7cGsN2f",
      TARGETING: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.xK7mNpV3tZwQ4rY2.JournalEntryPage.eV6rCxBaX8dHtO3g"
    }
  },
  ACTOR_SHEET: {
    ID: "actor-sheet",
    MENU: {
      KEY: "actor-sheet-menu",
      HINT: "CUSTOM_DND5E.menu.actorSheet.hint",
      ICON: "fas fa-scroll",
      LABEL: "CUSTOM_DND5E.menu.actorSheet.label",
      NAME: "CUSTOM_DND5E.menu.actorSheet.name"
    },
    SETTING: {
      AUTO_DETACH_GEOMETRY: { KEY: "auto-detach-geometry" },
      AUTO_DETACH_ACTOR_SHEET: { KEY: "auto-detach-actor-sheet" },
      AUTO_FADE_SHEET: { KEY: "auto-fade-sheet" },
      AUTO_MINIMISE_SHEET: { KEY: "auto-minimise-sheet" },
      BANNER_IMAGE: { KEY: "banner-image" },
      OPEN_DETACH_ACTOR_TYPES: { KEY: "open-detach-actor-types", DEFAULT: ["character", "npc"] },
      OPEN_DETACH_SHOW_CONTROLS: { KEY: "open-detach-show-controls" },
      OPEN_ACTOR_SHEET_ON_SELECT: { KEY: "open-actor-sheet-on-select" },
      OPEN_SINGLE_ACTOR_SHEET: { KEY: "open-single-actor-sheet" },
      SHEET_SCALE: { KEY: "sheet-scale" },
      SHOW_DEATH_SAVES: { KEY: "show-death-saves" },
      SHOW_ENCUMBRANCE: { KEY: "show-encumbrance" },
      SHOW_EXHAUSTION: { KEY: "show-exhaustion" },
      SHOW_INSPIRATION: { KEY: "show-inspiration" },
      SHOW_JUMP_DISTANCE: { KEY: "show-jump-distance" },
      SHOW_LEGENDARY_ACTIONS: { KEY: "show-legendary-actions" },
      SHOW_LEGENDARY_RESISTANCE: { KEY: "show-legendary-resistance" },
      SHOW_MANAGE_CURRENCY: { KEY: "show-manage-currency" },
      SHOW_TOKEN_DISPOSITION: { KEY: "show-token-disposition" },
      SHOW_USE_LAIR_ACTION: { KEY: "show-use-lair-action" }
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/actor-sheet-form.hbs",
      CHARACTER_SHEET_2: "modules/custom-dnd5e/templates/sheet/character-sheet-2.hbs",
      CHARACTER_DETAILS: "modules/custom-dnd5e/templates/sheet/character-details.hbs",
      TOKEN_DISPOSITION: "modules/custom-dnd5e/templates/token-disposition.hbs",
      TOKEN_DISPOSITION_TIDY5E: "/modules/custom-dnd5e/templates/token-disposition-tidy5e.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.JEUbYgjIv28ICsFg"
  },
  AVERAGE_DAMAGE: {
    SETTING: {
      USE: {
        KEY: "use-average-damage"
      }
    }
  },
  CHAT_COMMANDS: {
    SETTING: {
      KEY: "chat-commands",
      NAME: "CUSTOM_DND5E.setting.chatCommands.name",
      HINT: "CUSTOM_DND5E.setting.chatCommands.hint"
    }
  },
  COUNTERS: {
    ID: "counters",
    MENU: {
      KEY: "counters-menu",
      HINT: "CUSTOM_DND5E.menu.counters.hint",
      ICON: "fas fa-tally",
      LABEL: "CUSTOM_DND5E.menu.counters.label",
      NAME: "CUSTOM_DND5E.menu.counters.name"
    },
    SETTING: {
      COUNTERS: {
        KEY: "counters",
        HINT: "CUSTOM_DND5E.setting.counters.hint",
        NAME: "CUSTOM_DND5E.setting.counters.name"
      },
      ACTOR_COUNTERS: {
        KEY: "actor-counters"
      },
      ITEM_COUNTERS: {
        KEY: "item-counters"
      }
    },
    SYSTEM_PROPERTY: {
      "death-saves": "@attributes.death.success",
      exhaustion: "@attributes.exhaustion",
      inspiration: "@attributes.inspiration",
      legact: "@resources.legact.value",
      legres: "@resources.legres.value",
      lair: "@resources.lair.value"
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/counters/counters-form.hbs",
      FORM_ENTITY: "modules/custom-dnd5e/templates/counters/counters-form-entity.hbs",
      LIST: "modules/custom-dnd5e/templates/counters/counters-list.hbs",
      EDIT: "modules/custom-dnd5e/templates/counters/counters-edit.hbs",
      WORKFLOWS_LIST: "modules/custom-dnd5e/templates/counters/counters-workflows-list.hbs",
      DND5E_ACTOR: "modules/custom-dnd5e/templates/counters/dnd5e/counters-actor.hbs",
      DND5E_ITEM_GROUP: "modules/custom-dnd5e/templates/counters/dnd5e/counters-item-group.hbs",
      DND5E_ITEM_GROUP_LEGACY: "modules/custom-dnd5e/templates/counters/dnd5e/counters-item-group-legacy.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.dR7kYmNpV3tZxW4q"
  },
  DEAD: {
    SETTING: {
      APPLY_DEAD: {
        KEY: "apply-dead"
      },
      APPLY_INSTANT_DEATH: {
        KEY: "apply-instant-death"
      },
      DEAD_ROTATION: {
        KEY: "dead-rotation"
      },
      DEAD_TINT: {
        KEY: "dead-tint"
      }
    }
  },
  DEATH_SAVES: {
    SETTING: {
      DEATH_SAVES_ROLL_MODE: {
        KEY: "death-saves-roll-mode"
      },
      REMOVE_DEATH_SAVES: {
        KEY: "remove-death-saves"
      },
      DEATH_SAVES_TARGET_VALUE: {
        KEY: "death-saves-target-value"
      }
    }
  },
  DEBUG: {
    MENU: {
      KEY: "debug-menu",
      HINT: "CUSTOM_DND5E.menu.debug.hint",
      ICON: "fas fa-bug",
      LABEL: "CUSTOM_DND5E.menu.debug.label",
      NAME: "CUSTOM_DND5E.menu.debug.name"
    },
    FORM: {
      TITLE: "CUSTOM_DND5E.form.debug.title"
    },
    SETTING: {
      KEY: "debug"
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/debug-form.hbs",
      IMPORT_DIALOG: "modules/custom-dnd5e/templates/import-dialog.hbs"
    }
  },
  EXHAUSTION: {
    SETTING: {
      APPLY_EXHAUSTION_ON_ZERO_HP: {
        KEY: "apply-exhaustion-on-zero-hp"
      },
      APPLY_EXHAUSTION_ON_COMBAT_END: {
        KEY: "apply-exhaustion-on-combat-end"
      },
      EXHAUSTION_REQUEST_SAVING_THROW: {
        KEY: "exhaustion-request-saving-throw"
      },
      EXHAUSTION_SAVING_THROW_DC: {
        KEY: "exhaustion-saving-throw-dc"
      },
      EXHAUSTION_SAVING_THROW_DC_SCALING: {
        KEY: "exhaustion-saving-throw-dc-scaling"
      },
      EXHAUSTION_ANIMATION: {
        KEY: "exhaustion-animation"
      }
    }
  },
  HIT_POINTS: {
    SETTING: {
      APPLY_MASSIVE_DAMAGE: {
        KEY: "apply-massive-damage"
      },
      MASSIVE_DAMAGE_ANIMATION: {
        KEY: "massive-damage-animation"
      },
      MASSIVE_DAMAGE_TABLE: {
        KEY: "massive-damage-table"
      },
      APPLY_NEGATIVE_HP: {
        KEY: "apply-negative-hp"
      },
      APPLY_NEGATIVE_HP_NPC: {
        KEY: "apply-negative-hp-npc"
      },
      NEGATIVE_HP_HEAL_FROM_ZERO: {
        KEY: "negative-hp-heal-from-zero"
      }
    }
  },
  GIVE_ITEMS: {
    SETTING: {
      ENABLE: {
        KEY: "enable-give-items",
        HINT: "CUSTOM_DND5E.setting.giveItems.enable.hint",
        NAME: "CUSTOM_DND5E.setting.giveItems.enable.name"
      },
      RANGE: {
        KEY: "give-items-range",
        HINT: "CUSTOM_DND5E.setting.giveItems.range.hint",
        NAME: "CUSTOM_DND5E.setting.giveItems.range.name"
      },
      REQUIRE_ACCEPTANCE: {
        KEY: "give-items-require-acceptance",
        HINT: "CUSTOM_DND5E.setting.giveItems.requireAcceptance.hint",
        NAME: "CUSTOM_DND5E.setting.giveItems.requireAcceptance.name"
      }
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/item-interactions/give-item-form.hbs"
    }
  },
  DROP_ITEMS: {
    SETTING: {
      ENABLE: {
        KEY: "enable-drop-items",
        HINT: "CUSTOM_DND5E.setting.dropItems.enable.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.enable.name"
      },
      RANGE: {
        KEY: "drop-items-take-range",
        HINT: "CUSTOM_DND5E.setting.dropItems.takeRange.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.takeRange.name"
      },
      DROPPABLE_TYPES: {
        CHOICES: ["weapon", "equipment", "consumable", "tool", "loot", "container"],
        KEY: "drop-items-droppable-types",
        HINT: "CUSTOM_DND5E.setting.dropItems.droppableTypes.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.droppableTypes.name"
      },
      ALLOW_PLAYER_DROPS: {
        KEY: "drop-items-allow-player-drops",
        HINT: "CUSTOM_DND5E.setting.dropItems.allowPlayerDrops.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.allowPlayerDrops.name"
      },
      CHAT_NOTIFICATIONS: {
        KEY: "drop-items-chat-notifications",
        HINT: "CUSTOM_DND5E.setting.dropItems.chatNotifications.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.chatNotifications.name"
      },
      DROP_RANGE: {
        KEY: "drop-items-drop-range",
        HINT: "CUSTOM_DND5E.setting.dropItems.dropRange.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.dropRange.name"
      },
      TOKEN_SCALE: {
        KEY: "drop-items-token-scale",
        HINT: "CUSTOM_DND5E.setting.dropItems.tokenScale.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.tokenScale.name"
      },
      IMAGE_SHAPE: {
        CHOICES: { none: "CUSTOM_DND5E.none", square: "CUSTOM_DND5E.square", circle: "CUSTOM_DND5E.circle" },
        KEY: "drop-items-image-shape",
        HINT: "CUSTOM_DND5E.setting.dropItems.imageShape.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.imageShape.name"
      },
      IMAGE_BORDER_COLOR: {
        KEY: "drop-items-image-border-color",
        HINT: "CUSTOM_DND5E.setting.dropItems.imageBorderColor.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.imageBorderColor.name"
      },
      IMAGE_BORDER_THICKNESS: {
        KEY: "drop-items-image-border-thickness",
        HINT: "CUSTOM_DND5E.setting.dropItems.imageBorderThickness.hint",
        NAME: "CUSTOM_DND5E.setting.dropItems.imageBorderThickness.name"
      },
      FOLDER_ID: {
        KEY: "drop-items-folder-id"
      }
    },
    TEMPLATE: {
      SHEET: "modules/custom-dnd5e/templates/item-interactions/item-actor-sheet.hbs",
      HUD: "modules/custom-dnd5e/templates/item-interactions/item-token-hud.hbs"
    },
    FOLDER_NAME: "CUSTOM_DND5E.dropItems.folderName",
    ACTOR_TYPE: "custom-dnd5e.item",
    DEFAULT_ICON: "modules/custom-dnd5e/media/icons/chest.svg"
  },
  GAMEPLAY: {
    MENU: {
      KEY: "gameplay-menu",
      HINT: "CUSTOM_DND5E.menu.gameplay.hint",
      ICON: "fas fa-joystick",
      LABEL: "CUSTOM_DND5E.menu.gameplay.label",
      NAME: "CUSTOM_DND5E.menu.gameplay.name"
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/gameplay-form.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.ngr8w6WBycK59brj"
  },
  INITIATIVE: {
    SETTING: {
      REROLL_INITIATIVE_EACH_ROUND: {
        KEY: "reroll-initiative-each-round"
      }
    }
  },
  INTERFACE: {
    MENU: {
      KEY: "interface-menu",
      HINT: "CUSTOM_DND5E.menu.interface.hint",
      ICON: "fas fa-display",
      LABEL: "CUSTOM_DND5E.menu.interface.label",
      NAME: "CUSTOM_DND5E.menu.interface.name"
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/interface-form.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.iFcVxKpMyZrNqW8t"
  },
  ITEM_INTERACTIONS: {
    MENU: {
      KEY: "item-interactions-menu",
      HINT: "CUSTOM_DND5E.menu.itemInteractions.hint",
      ICON: "fas fa-handshake",
      LABEL: "CUSTOM_DND5E.menu.itemInteractions.label",
      NAME: "CUSTOM_DND5E.menu.itemInteractions.name"
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/item-interactions/item-interactions-form.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.iIqL5xV2bRsNyW8m"
  },
  INSPIRATION: {
    SETTING: {
      AWARD_INSPIRATION_DICE_VALUE: {
        KEY: "award-inspiration-d20-value"
      },
      AWARD_INSPIRATION_ROLL_TYPES: {
        KEY: "award-inspiration-roll-types"
      },
      INSPIRATION_ANIMATION: {
        KEY: "inspiration-animation"
      }
    }
  },
  ITEM_SHEET: {
    ID: "item-sheet",
    MENU: {
      KEY: "item-sheet-menu",
      HINT: "CUSTOM_DND5E.menu.itemSheet.hint",
      ICON: "fas fa-scroll",
      LABEL: "CUSTOM_DND5E.menu.itemSheet.label",
      NAME: "CUSTOM_DND5E.menu.itemSheet.name"
    },
    SETTING: {
      TOGGLE_IDENTIFIED_ROLE: { KEY: "toggle-identified-role" }
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/item-sheet-form.hbs"
    }
  },
  LEVEL_UP: {
    HIT_POINTS: {
      REROLL: {
        DIALOG: {
          NOTE: "CUSTOM_DND5E.dialog.levelUpHitPointsRerollMinimumValue.note"
        },
        MINIMUM_VALUE: {
          SETTING: {
            KEY: "level-up-hit-points-reroll-minimum-value"
          }
        },
        ONCE: {
          SETTING: {
            KEY: "level-up-hit-points-reroll-once"
          }
        }
      },
      SHOW_TAKE_AVERAGE: {
        SETTING: {
          KEY: "level-up-hit-points-show-take-average"
        }
      }
    }
  },
  MAX_ABILITY_SCORE: {
    SETTING: {
      KEY: "max-ability-score",
      NAME: "CUSTOM_DND5E.setting.maxAbilityScore.name"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.decV7ZeYLc045SuZ"
  },
  MAX_LEVEL: {
    SETTING: {
      KEY: "max-level",
      NAME: "CUSTOM_DND5E.setting.maxLevel.name"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.4h10hYx01hjbUQL6"
  },
  MESSAGE: {
    TEMPLATE: {
      ROLL_REQUEST_CARD: "modules/custom-dnd5e/templates/roll-request-card.hbs"
    }
  },
  MIGRATION: {
    VERSION: {
      SETTING: {
        KEY: "migration-version"
      }
    }
  },
  MOB_DAMAGE: {
    SETTING: {
      ENABLE: {
        KEY: "enable-mob-damage"
      },
      USE_AVERAGE_DAMAGE: {
        KEY: "use-average-mob-damage"
      }
    }
  },
  PROBABILISTIC_DAMAGE: {
    SETTING: {
      ENABLE: {
        KEY: "enable-probabilistic-damage"
      },
      USE_AVERAGE_DAMAGE: {
        KEY: "use-average-probabilistic-damage"
      }
    },
    TEMPLATE: {
      PROBABILISTIC_DAMAGE: "modules/custom-dnd5e/templates/probabilistic-damage.hbs"
    }
  },
  PRONE: {
    SETTING: {
      PRONE_ROTATION: {
        KEY: "prone-rotation"
      }
    }
  },
  RADIAL_STATUS_EFFECTS: {
    SETTING: {
      KEY: "radial-status-effects",
      CLICK_TO_TOGGLE: {
        KEY: "radial-status-effects-click-to-toggle",
        HINT: "CUSTOM_DND5E.setting.radialStatusEffectsClickToToggle.hint",
        NAME: "CUSTOM_DND5E.setting.radialStatusEffectsClickToToggle.name"
      }
    }
  },
  RESTING: {
    SETTING: {
      USE_CAMP_SUPPLIES: {
        KEY: "use-camp-supplies"
      }
    },
    TEMPLATE: {
      LONG_REST: "modules/custom-dnd5e/templates/long-rest.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.ngr8w6WBycK59brj.JournalEntryPage.lR4mGZPNE02Lbe6t"
  },
  ROLLS: {
    ID: "rolls",
    MENU: {
      KEY: "rolls-menu",
      HINT: "CUSTOM_DND5E.menu.rolls.hint",
      ICON: "fas fa-dice-d20",
      LABEL: "CUSTOM_DND5E.menu.rolls.label",
      NAME: "CUSTOM_DND5E.menu.rolls.name"
    },
    SETTING: {
      ROLLS: {
        KEY: "rolls"
      }
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/rolls-form.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.eIWacCPaiwpIZCBL"
  },
  RULER_TRAVEL_TIME: {
    SETTING: {
      KEY: "ruler-travel-time",
      NAME: "CUSTOM_DND5E.setting.rulerTravelTime.name",
      HINT: "CUSTOM_DND5E.setting.rulerTravelTime.hint"
    }
  },
  SHEET: {
    ID: "sheet",
    MENU: {
      KEY: "sheet-menu",
      HINT: "CUSTOM_DND5E.menu.sheet.hint",
      ICON: "fas fa-pen-to-square",
      LABEL: "CUSTOM_DND5E.menu.sheet.label",
      NAME: "CUSTOM_DND5E.menu.sheet.name"
    },
    SETTING: {
      AUTO_FADE_SHEET: { KEY: "auto-fade-sheet" },
      AUTO_MINIMISE_SHEET: { KEY: "auto-minimise-sheet" },
      BANNER_IMAGE: { KEY: "banner-image" },
      SHEET_SCALE: { KEY: "sheet-scale" },
      SHOW_DEATH_SAVES: { KEY: "show-death-saves" },
      SHOW_ENCUMBRANCE: { KEY: "show-encumbrance" },
      SHOW_EXHAUSTION: { KEY: "show-exhaustion" },
      SHOW_INSPIRATION: { KEY: "show-inspiration" },
      SHOW_LEGENDARY_ACTIONS: { KEY: "show-legendary-actions" },
      SHOW_LEGENDARY_RESISTANCE: { KEY: "show-legendary-resistance" },
      SHOW_MANAGE_CURRENCY: { KEY: "show-manage-currency" },
      SHOW_USE_LAIR_ACTION: { KEY: "show-use-lair-action" }
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/sheet-form.hbs",
      CHARACTER_SHEET_2: "modules/custom-dnd5e/templates/sheet/character-sheet-2.hbs",
      CHARACTER_DETAILS: "modules/custom-dnd5e/templates/sheet/character-details.hbs"
    }
  },
  SHOW_PRESSED_KEYS: {
    SETTING: {
      KEY: "show-pressed-keys",
      NAME: "CUSTOM_DND5E.setting.showPressedKeys.name",
      HINT: "CUSTOM_DND5E.setting.showPressedKeys.hint"
    }
  },
  TOKEN: {
    SETTING: {
      APPLY_ELEVATION_TO_SELECTED_TOKENS: {
        KEY: "apply-elevation-to-selected-tokens",
        HINT: "CUSTOM_DND5E.setting.applyElevationToSelectedTokens.hint",
        NAME: "CUSTOM_DND5E.setting.applyElevationToSelectedTokens.name"
      },
      TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS: {
        KEY: "toggle-status-effect-on-selected-tokens",
        HINT: "CUSTOM_DND5E.setting.toggleStatusEffectOnSelectedTokens.hint",
        NAME: "CUSTOM_DND5E.setting.toggleStatusEffectOnSelectedTokens.name"
      },
      BORDER_ENABLE: {
        KEY: "token-border-enable",
        HINT: "CUSTOM_DND5E.setting.tokenBorderEnable.hint",
        NAME: "CUSTOM_DND5E.setting.tokenBorderEnable.name"
      },
      BORDER_SHAPE: {
        KEY: "token-border-shape",
        HINT: "CUSTOM_DND5E.setting.tokenBorderShape.hint",
        NAME: "CUSTOM_DND5E.setting.tokenBorderShape.name"
      },
      BORDER_SCALE: {
        KEY: "token-border-scale",
        HINT: "CUSTOM_DND5E.setting.tokenBorderScale.hint",
        NAME: "CUSTOM_DND5E.setting.tokenBorderScale.name"
      },
      BORDER_SCALE_WITH_TOKEN: {
        KEY: "token-border-scale-with-token",
        HINT: "CUSTOM_DND5E.setting.tokenBorderScaleWithToken.hint",
        NAME: "CUSTOM_DND5E.setting.tokenBorderScaleWithToken.name"
      },
      BORDER_THICKNESS: {
        KEY: "token-border-thickness",
        HINT: "CUSTOM_DND5E.setting.tokenBorderThickness.hint",
        NAME: "CUSTOM_DND5E.setting.tokenBorderThickness.name"
      },
      HUD_IMPROVEMENTS: {
        KEY: "token-hud-improvements"
      },
      HUD_SCALE: {
        KEY: "token-hud-scale",
        HINT: "CUSTOM_DND5E.setting.tokenHudScale.hint",
        NAME: "CUSTOM_DND5E.setting.tokenHudScale.name"
      }
    }
  },
  TOKEN_DISTANCE: {
    SETTING: {
      ENABLE: {
        KEY: "enable-token-distance",
        HINT: "CUSTOM_DND5E.setting.enableTokenDistance.hint",
        NAME: "CUSTOM_DND5E.setting.enableTokenDistance.name"
      },
      VIEW_ROLE: {
        KEY: "token-distance-view-role",
        HINT: "CUSTOM_DND5E.setting.tokenDistanceViewRole.hint",
        NAME: "CUSTOM_DND5E.setting.tokenDistanceViewRole.name"
      }
    }
  },
  WORKFLOWS: {
    ID: "workflows",
    MENU: {
      KEY: "workflows-menu",
      HINT: "CUSTOM_DND5E.menu.workflows.hint",
      ICON: "fas fa-bolt-lightning",
      LABEL: "CUSTOM_DND5E.menu.workflows.label",
      NAME: "CUSTOM_DND5E.menu.workflows.name"
    },
    SETTING: {
      ENABLE: {
        KEY: "workflows-enable"
      },
      ACTOR_WORKFLOWS: {
        KEY: "actor-workflows"
      },
      ITEM_WORKFLOWS: {
        KEY: "item-workflows"
      }
    },
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/workflows/workflows-form.hbs",
      LIST: "modules/custom-dnd5e/templates/workflows/workflows-list.hbs",
      EDIT: "modules/custom-dnd5e/templates/workflows/workflows-edit.hbs",
      FORM_ENTITY: "modules/custom-dnd5e/templates/workflows/workflows-form-entity.hbs",
      TRIGGER_ROW: "modules/custom-dnd5e/templates/workflows/workflows-trigger-row.hbs",
      ACTION_ROW: "modules/custom-dnd5e/templates/workflows/workflows-action-row.hbs",
      REQUEST_ROLL_RESULT: "modules/custom-dnd5e/templates/workflows/request-roll-result-form.hbs",
      TRIGGER_CONDITIONS: "modules/custom-dnd5e/templates/workflows/trigger-conditions-form.hbs"
    },
    UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.fR3kYmNpV4tZwQ5r"
  },
  UNCONSCIOUS: {
    SETTING: {
      APPLY_UNCONSCIOUS: {
        KEY: "apply-unconscious"
      }
    }
  },
  UUID: {
    TEMPLATE: {
      FORM: "modules/custom-dnd5e/templates/config-form.hbs",
      LIST: "modules/custom-dnd5e/templates/config-edit-in-list.hbs"
    }
  },
};

export const JOURNAL_HELP_BUTTON = {
  icon: "fa-regular fa-circle-info",
  tooltip: "CUSTOM_DND5E.openGuide",
  action: "help",
  uuid: null
};

export const SETTING_BY_ENTITY_TYPE = {
  COUNTERS: {
    actor: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY,
    character: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY,
    group: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY,
    item: CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY,
    npc: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY
  }
};

export const SHEET_TYPE = {
  ActorSheet5eCharacter2: {
    countersSetting: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY,
    character: true,
    custom: false,
    group: false,
    item: false,
    legacy: false,
    npc: false,
    template: CONSTANTS.COUNTERS.TEMPLATE.DND5E_ACTOR,
    insert: {
      class: ".tab.details > .right .top",
      position: "beforeend"
    }
  },
  CharacterActorSheet: {
    countersSetting: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY,
    character: true,
    custom: false,
    group: false,
    item: false,
    legacy: false,
    npc: false,
    template: CONSTANTS.COUNTERS.TEMPLATE.DND5E_ACTOR,
    insert: {
      class: ".tab[data-application-part='details'] > .right .top",
      position: "beforeend"
    }
  },
  NPCActorSheet: {
    countersSetting: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY,
    character: false,
    custom: false,
    group: false,
    item: false,
    legacy: false,
    npc: true,
    template: CONSTANTS.COUNTERS.TEMPLATE.DND5E_ACTOR,
    insert: {
      class: ".sidebar",
      position: "afterbegin"
    }
  },
  CustomDnd5eCharacterActorSheet: {
    countersSetting: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY,
    character: true,
    custom: true,
    group: false,
    item: false,
    legacy: false,
    npc: false,
    template: CONSTANTS.COUNTERS.TEMPLATE.DND5E_ACTOR,
    insert: {
      class: ".tab[data-application-part='details'] > .col-2 > .right .top",
      position: "beforeend"
    }
  },
  ActorSheet5eNPC2: {
    countersSetting: CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY,
    character: false,
    custom: false,
    group: false,
    item: false,
    legacy: false,
    npc: true,
    template: CONSTANTS.COUNTERS.TEMPLATE.DND5E_ACTOR,
    insert: {
      class: ".sidebar",
      position: "afterbegin"
    }
  },
  ItemSheet5e: {
    countersSetting: CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY,
    character: false,
    custom: false,
    group: false,
    item: true,
    legacy: false,
    npc: false,
    template: CONSTANTS.COUNTERS.TEMPLATE.DND5E_ITEM_GROUP,
    insert: {
      class: "section.window-content",
      position: "beforeend"
    }
  },
  ItemSheet5e2: {
    countersSetting: CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY,
    character: false,
    custom: false,
    group: false,
    item: true,
    legacy: false,
    npc: false,
    template: CONSTANTS.COUNTERS.TEMPLATE.DND5E_ITEM_GROUP_LEGACY,
    insert: {
      class: "section.sheet-body",
      position: "beforeend"
    }
  }
};
