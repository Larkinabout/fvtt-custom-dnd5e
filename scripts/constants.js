export const MODULE = {
    ID: 'custom-dnd5e',
    NAME: 'Custom D&D 5e'
}

export const CONSTANTS = {
    CONFIG: {
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/config-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/config-list.hbs'
        }
    },
    ABILITIES: {
        ID: 'abilities',
        MENU: {
            KEY: 'abilities-menu',
            HINT: 'CUSTOM_DND5E.menu.abilities.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.abilities.label',
            NAME: 'CUSTOM_DND5E.menu.abilities.name'
        },
        SETTING: {
            KEY: 'abilities'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/abilities-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/abilities-list.hbs'
        }
    },
    ACTOR_SIZES: {
        ID: 'actor-sizes',
        MENU: {
            KEY: 'actor-sizes-menu',
            HINT: 'CUSTOM_DND5E.menu.actorSizes.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.actorSizes.label',
            NAME: 'CUSTOM_DND5E.menu.actorSizes.name'
        },
        SETTING: {
            KEY: 'actor-sizes'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/actor-sizes-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/actor-sizes-list.hbs'
        }
    },
    ARMOR_CALCULATIONS: {
        ID: 'armor-calculations',
        MENU: {
            KEY: 'armor-calculations-menu',
            HINT: 'CUSTOM_DND5E.menu.armorCalculations.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.armorCalculations.label',
            NAME: 'CUSTOM_DND5E.menu.armorCalculations.name'
        },
        SETTING: {
            KEY: 'armor-calculations'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/armor-calculations-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/armor-calculations-list.hbs'
        }
    },
    ARMOR_IDS: {
        MENU: {
            KEY: 'armor-ids-menu',
            HINT: 'CUSTOM_DND5E.menu.armorIds.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.armorIds.label',
            NAME: 'CUSTOM_DND5E.menu.armorIds.name'
        },
        SETTING: {
            KEY: 'armor-ids'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/uuid-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/uuid-list.hbs'
        }
    },
    ARMOR_PROFICIENCIES: {
        MENU: {
            KEY: 'armor-proficiencies-menu',
            HINT: 'CUSTOM_DND5E.menu.armorProficiencies.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.armorProficiencies.label',
            NAME: 'CUSTOM_DND5E.menu.armorProficiencies.name'
        },
        SETTING: {
            KEY: 'armor-proficiencies'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/config-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/config-list.hbs'
        }
    },
    BLOODIED: {
        SETTING: {
            APPLY_BLOODIED: {
                KEY: 'apply-bloodied'
            },
            BLOODIED_ICON: {
                KEY: 'bloodied-icon'
            },
            BLOODIED_TINT: {
                KEY: 'bloodied-tint'
            }
        },
        ICON: 'modules/custom-dnd5e/media/icons/bloodied.svg'
    },
    CONDITION_TYPES: {
        SETTING: {
            KEY: 'condition-types'
        }
    },
    CONDITIONS: {
        MENU: {
            KEY: 'conditions-menu',
            HINT: 'CUSTOM_DND5E.menu.conditions.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.conditions.label',
            NAME: 'CUSTOM_DND5E.menu.conditions.name'
        },
        SETTING: {
            KEY: 'conditions'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/conditions-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/conditions-list.hbs',
            EDIT: 'modules/custom-dnd5e/templates/conditions-edit.hbs'
        }
    },
    COUNTERS: {
        ID: 'counters',
        MENU: {
            KEY: 'counters-menu',
            HINT: 'CUSTOM_DND5E.menu.counters.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.counters.label',
            NAME: 'CUSTOM_DND5E.menu.counters.name'
        },
        SETTING: {
            CHARACTER_COUNTERS: {
                KEY: 'character-counters'
            },
            GROUP_COUNTERS: {
                KEY: 'group-counters'
            },
            ITEM_COUNTERS: {
                KEY: 'item-counters'
            },
            NPC_COUNTERS: {
                KEY: 'npc-counters'
            }
        },
        SYSTEM_PROPERTY: {
            'death-saves': '@attributes.death.success',
            exhaustion: '@attributes.exhaustion',
            inspiration: '@attributes.inspiration',
            legact: '@resources.legact.value',
            legres: '@resources.legres.value',
            lair: '@resources.lair.value'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/counters-form.hbs',
            FORM_INDIVIDUAL: 'modules/custom-dnd5e/templates/counters-form-individual.hbs',
            LIST: 'modules/custom-dnd5e/templates/counters-list.hbs',
            ADVANCED_OPTIONS_FORM: 'modules/custom-dnd5e/templates/counters-advanced-options-form.hbs',
            ADVANCED_OPTIONS_LIST: 'modules/custom-dnd5e/templates/counters-triggers-list.hbs'
        }
    },
    CURRENCY: {
        ID: 'currency',
        MENU: {
            KEY: 'currency-menu',
            HINT: 'CUSTOM_DND5E.menu.currency.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.currency.label',
            NAME: 'CUSTOM_DND5E.menu.currency.name'
        },
        SETTING: {
            KEY: 'currency'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/currency-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/currency-list.hbs'
        }
    },
    DAMAGE_TYPES: {
        ID: 'damage-types',
        MENU: {
            KEY: 'damage-types-menu',
            HINT: 'CUSTOM_DND5E.menu.damageTypes.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.damageTypes.label',
            NAME: 'CUSTOM_DND5E.menu.damageTypes.name'
        },
        SETTING: {
            KEY: 'damage-types'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/damage-types-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/damage-types-list.hbs'
        }
    },
    DEAD: {
        SETTING: {
            APPLY_DEAD: {
                KEY: 'apply-dead'
            },
            APPLY_INSTANT_DEATH: {
                KEY: 'apply-instant-death'
            },
            DEAD_ROTATION: {
                KEY: 'dead-rotation'
            },
            DEAD_TINT: {
                KEY: 'dead-tint'
            }
        }
    },
    DEATH_SAVES: {
        SETTING: {
            DEATH_SAVES_ROLL_MODE: {
                KEY: 'death-saves-roll-mode'
            },
            REMOVE_DEATH_SAVES: {
                KEY: 'remove-death-saves'
            },
            DEATH_SAVES_TARGET_VALUE: {
                KEY: 'death-saves-target-value'
            }
        }
    },
    DEBUG: {
        MENU: {
            KEY: 'debug-menu',
            HINT: 'CUSTOM_DND5E.menu.debug.hint',
            ICON: 'fas fa-bug',
            LABEL: 'CUSTOM_DND5E.menu.debug.label',
            NAME: 'CUSTOM_DND5E.menu.debug.name'
        },
        FORM: {
            TITLE: 'CUSTOM_DND5E.form.debug.title'
        },
        SETTING: {
            KEY: 'debug'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/debug-form.hbs',
            IMPORT_DIALOG: 'modules/custom-dnd5e/templates/import-dialog.hbs'
        }
    },
    ENCUMBRANCE: {
        EQUIPPED_ITEM_WEIGHT_MODIFIER: {
            SETTING: {
                KEY: 'equipped-item-weight-modifier'
            }
        },
        PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER: {
            SETTING: { KEY: 'proficient-equipped-item-weight-modifier'}
        },
        UNEQUIPPED_ITEM_WEIGHT_MODIFIER: {
            SETTING: {
                KEY: 'unequipped-item-weight-modifier'
            }
        },
        ID: 'encumbrance',
        MENU: {
            KEY: 'encumbrance-menu',
            HINT: 'CUSTOM_DND5E.menu.encumbrance.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.encumbrance.label',
            NAME: 'CUSTOM_DND5E.menu.encumbrance.name'
        },
        SETTING: {
            KEY: 'encumbrance'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/encumbrance-form.hbs'
        }
    },
    HIT_POINTS: {
        SETTING: {
            APPLY_MASSIVE_DAMAGE: {
                KEY: 'apply-massive-damage'
            },
            APPLY_NEGATIVE_HP: {
                KEY: 'apply-negative-hp'
            },
            NEGATIVE_HP_HEAL_FROM_ZERO: {
                KEY: 'negative-hp-heal-from-zero'
            },
            ROLL_NPC_HP: {
                KEY: 'roll-npc-hp'
            }
        }
    },
    HOUSE_RULES: {
        MENU: {
            KEY: 'house-rules-menu',
            HINT: 'CUSTOM_DND5E.menu.houseRules.hint',
            ICON: 'fas fa-house-chimney',
            LABEL: 'CUSTOM_DND5E.menu.houseRules.label',
            NAME: 'CUSTOM_DND5E.menu.houseRules.name'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/house-rules-form.hbs'
        }
    },
    INSPIRATION: {
        SETTING: {
            AWARD_INSPIRATION_D20_VALUE: {
                KEY: 'award-inspiration-d20-value'
            },
            AWARD_INSPIRATION_ROLL_TYPES: {
                KEY: 'award-inspiration-roll-types'
            }
        }
    },
    ITEM_ACTION_TYPES: {
        ID: 'item-action-types',
        MENU: {
            KEY: 'item-action-types-menu',
            HINT: 'CUSTOM_DND5E.menu.itemActionTypes.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.itemActionTypes.label',
            NAME: 'CUSTOM_DND5E.menu.itemActionTypes.name'
        },
        SETTING: {
            KEY: 'item-action-types'
        }
    },
    ITEM_ACTIVATION_COST_TYPES: {
        ID: 'item-activation-cost-types',
        MENU: {
            KEY: 'item-activation-cost-types-menu',
            HINT: 'CUSTOM_DND5E.menu.itemActivationCostTypes.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.itemActivationCostTypes.label',
            NAME: 'CUSTOM_DND5E.menu.itemActivationCostTypes.name'
        },
        SETTING: {
            KEY: 'item-activation-cost-types'
        }
    },
    ITEM_PROPERTIES: {
        ID: 'item-properties',
        MENU: {
            KEY: 'item-properties-menu',
            HINT: 'CUSTOM_DND5E.menu.itemProperties.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.itemProperties.label',
            NAME: 'CUSTOM_DND5E.menu.itemProperties.name'
        },
        SETTING: {
            KEY: 'item-properties'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/item-properties-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/item-properties-list.hbs'
        }
    },
    ITEM_RARITY: {
        ID: 'itemRarity',
        MENU: {
            KEY: 'item-rarity-menu',
            HINT: 'CUSTOM_DND5E.menu.itemRarity.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.itemRarity.label',
            NAME: 'CUSTOM_DND5E.menu.itemRarity.name'
        },
        SETTING: {
            KEY: 'item-rarity'
        }
    },
    LANGUAGES: {
        ID: 'languages',
        MENU: {
            KEY: 'languages-menu',
            HINT: 'CUSTOM_DND5E.menu.languages.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.languages.label',
            NAME: 'CUSTOM_DND5E.menu.languages.name'
        },
        SETTING: {
            KEY: 'languages'
        }
    },
    LEVEL_UP: {
        HIT_POINTS: {
            REROLL: {
                DIALOG: {
                    NOTE: 'CUSTOM_DND5E.dialog.levelUpHitPointsRerollMinimumValue.note'
                },
                MINIMUM_VALUE: {
                    SETTING: {
                        KEY: 'level-up-hit-points-reroll-minimum-value'
                    }
                },
                ONCE: {
                    SETTING: {
                        KEY: 'level-up-hit-points-reroll-once'
                    }
                }
            },
            SHOW_TAKE_AVERAGE: {
                SETTING: {
                    KEY: 'level-up-hit-points-show-take-average'
                }
            }
        }
    },
    MAX_LEVEL: {
        SETTING: {
            KEY: 'max-level',
            NAME: 'CUSTOM_DND5E.setting.maxLevel.name'
        }
    },
    MESSAGE: {
        TEMPLATE: {
            ROLL_REQUEST_CARD: 'modules/custom-dnd5e/templates/roll-request-card.hbs'
        }
    },
    MIGRATION: {
        VERSION: {
            SETTING: {
                KEY: 'migration-version'
            }
        }
    },
    PRONE: {
        SETTING: {
            PRONE_ROTATION: {
                KEY: 'prone-rotation'
            }
        }
    },
    RADIAL_STATUS_EFFECTS: {
        SETTING: {
            KEY: 'radial-status-effects'
        }
    },
    SENSES: {
        ID: 'senses',
        MENU: {
            KEY: 'senses-menu',
            HINT: 'CUSTOM_DND5E.menu.senses.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.senses.label',
            NAME: 'CUSTOM_DND5E.menu.senses.name'
        },
        SETTING: {
            KEY: 'senses'
        }
    },
    SHEET: {
        ID: 'sheet',
        MENU: {
            KEY: 'sheet-menu',
            HINT: 'CUSTOM_DND5E.menu.sheet.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.sheet.label',
            NAME: 'CUSTOM_DND5E.menu.sheet.name'
        },
        SETTING: {
            AUTO_FADE_SHEET: { KEY: 'auto-fade-sheet' },
            AUTO_MINIMISE_SHEET: { KEY: 'auto-minimise-sheet' },
            BANNER_IMAGE: { KEY: 'banner-image' },
            SHEET_SCALE: { KEY: 'sheet-scale' },
            SHOW_DEATH_SAVES: { KEY: 'show-death-saves' },
            SHOW_ENCUMBRANCE: { KEY: 'show-encumbrance' },
            SHOW_EXHAUSTION: { KEY: 'show-exhaustion' },
            SHOW_INSPIRATION: { KEY: 'show-inspiration' },
            SHOW_LEGENDARY_ACTIONS: { KEY: 'show-legendary-actions' },
            SHOW_LEGENDARY_RESISTANCE: { KEY: 'show-legendary-resistance' },
            SHOW_MANAGE_CURRENCY: { KEY: 'show-manage-currency' },
            SHOW_USE_LAIR_ACTION: { KEY: 'show-use-lair-action' }
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/sheet-form.hbs',
            CHARACTER_SHEET_2: 'modules/custom-dnd5e/templates/sheet/character-sheet-2.hbs',
            CHARACTER_DETAILS: 'modules/custom-dnd5e/templates/sheet/character-details.hbs'
        }
    },
    SKILLS: {
        ID: 'skills',
        MENU: {
            KEY: 'skills-menu',
            HINT: 'CUSTOM_DND5E.menu.skills.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.skills.label',
            NAME: 'CUSTOM_DND5E.menu.skills.name'
        },
        SETTING: {
            KEY: 'skills'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/skills-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/skills-list.hbs'
        }
    },
    SPELL_SCHOOLS: {
        ID: 'spell-schools',
        MENU: {
            KEY: 'spell-schools-menu',
            HINT: 'CUSTOM_DND5E.menu.spellSchools.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.spellSchools.label',
            NAME: 'CUSTOM_DND5E.menu.spellSchools.name'
        },
        SETTING: {
            KEY: 'spell-schools'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/spell-schools-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/spell-schools-list.hbs'
        }
    },
    TOKEN: {
        SETTING: {
            APPLY_ELEVATION_TO_SELECTED_TOKENS: {
                KEY: 'apply-elevation-to-selected-tokens',
                HINT: 'CUSTOM_DND5E.setting.applyElevationToSelectedTokens.hint',
                NAME: 'CUSTOM_DND5E.setting.applyElevationToSelectedTokens.name'
            },
            TOGGLE_STATUS_EFFECT_ON_SELECTED_TOKENS: {
                KEY: 'toggle-status-effect-on-selected-tokens',
                HINT: 'CUSTOM_DND5E.setting.toggleStatusEffectOnSelectedTokens.hint',
                NAME: 'CUSTOM_DND5E.setting.toggleStatusEffectOnSelectedTokens.name'
            },
            BORDER_SHAPE: {
                KEY: 'token-border-shape',
                HINT: 'CUSTOM_DND5E.setting.tokenBorderShape.hint',
                NAME: 'CUSTOM_DND5E.setting.tokenBorderShape.name'
            }
        }
    },
    TOOL_IDS: {
        MENU: {
            KEY: 'tool-ids-menu',
            HINT: 'CUSTOM_DND5E.menu.toolIds.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.toolIds.label',
            NAME: 'CUSTOM_DND5E.menu.toolIds.name'
        },
        SETTING: {
            KEY: 'tool-ids'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/uuid-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/uuid-list.hbs'
        }
    },
    UNCONSCIOUS: {
        SETTING: {
            APPLY_UNCONSCIOUS: {
                KEY: 'apply-unconscious'
            }
        }
    },
    UUID: {
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/uuid-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/uuid-list.hbs'
        }
    },
    WEAPON_IDS: {
        MENU: {
            KEY: 'weapon-ids-menu',
            HINT: 'CUSTOM_DND5E.menu.weaponIds.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.weaponIds.label',
            NAME: 'CUSTOM_DND5E.menu.weaponIds.name'
        },
        SETTING: {
            KEY: 'weapon-ids'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/uuid-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/uuid-list.hbs'
        }
    },
    WEAPON_PROFICIENCIES: {
        MENU: {
            KEY: 'weapon-proficiencies-menu',
            HINT: 'CUSTOM_DND5E.menu.weaponProficiencies.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.weaponProficiencies.label',
            NAME: 'CUSTOM_DND5E.menu.weaponProficiencies.name'
        },
        SETTING: {
            KEY: 'weapon-proficiencies'
        },
        TEMPLATE: {
            FORM: 'modules/custom-dnd5e/templates/config-form.hbs',
            LIST: 'modules/custom-dnd5e/templates/config-list.hbs'
        }
    }
}

export const SETTING_BY_ENTITY_TYPE = {
    COUNTERS: {
        character: CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY,
        group: CONSTANTS.COUNTERS.SETTING.GROUP_COUNTERS.KEY,
        item: CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY,
        npc: CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY
    }
}

export const SHEET_TYPE = {
    ActorSheet5eCharacter: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY,
        character: true,
        custom: false,
        group: false,
        legacy: true,
        npc: true
    },
    ActorSheet5eCharacter2: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY,
        character: true,
        custom: false,
        group: false,
        item: false,
        legacy: false,
        npc: true
    },
    ActorSheet5eNPC: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY,
        character: false,
        custom: false,
        group: false,
        item: false,
        legacy: true,
        npc: true
    },
    ActorSheet5eNPC2: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY,
        character: false,
        custom: false,
        group: false,
        item: false,
        legacy: false,
        npc: true
    },
    GroupActorSheet: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.GROUP_COUNTERS.KEY,
        character: false,
        custom: false,
        group: true,
        item: false,
        legacy: false,
        npc: false
    },
    CustomDnd5eSheetCharacter2: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY,
        character: true,
        custom: true,
        group: false,
        item: false,
        legacy: false,
        npc: false
    },
    ItemSheet5e: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY,
        character: false,
        custom: false,
        group: false,
        item: true,
        legacy: false,
        npc: false
    }
}
