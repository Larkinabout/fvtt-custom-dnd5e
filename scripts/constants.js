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
    ARMOR_TYPES: {
        ID: 'armor-types',
        MENU: {
            KEY: 'armor-types-menu',
            HINT: 'CUSTOM_DND5E.menu.armorTypes.hint',
            ICON: 'fas fa-pen-to-square',
            LABEL: 'CUSTOM_DND5E.menu.armorTypes.label',
            NAME: 'CUSTOM_DND5E.menu.armorTypes.name'
        },
        SETTING: {
            KEY: 'armor-types'
        }
    },
    CONDITION_TYPES: {
        SETTING: {
            KEY: 'condition-types'
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
            LIST: 'modules/custom-dnd5e/templates/counters-list.hbs'
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
    DEBUG: {
        SETTING: {
            KEY: 'debug',
            NAME: 'CUSTOM_DND5E.setting.debug.name'
        }
    },
    ENCUMBRANCE: {
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
    MAX_LEVEL: {
        SETTING: {
            KEY: 'max-level',
            NAME: 'CUSTOM_DND5E.setting.maxLevel.name'
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
            FORM: 'modules/custom-dnd5e/templates/sheet-form.hbs'
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
    }
}

export const SHEET_TYPE = {
    ActorSheet5eCharacter: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY,
        character: true,
        legacy: true,
        npc: true
    },
    ActorSheet5eCharacter2: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY,
        character: true,
        legacy: false,
        npc: true
    },
    ActorSheet5eNPC: {
        countersSetting: CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY,
        character: false,
        legacy: true,
        npc: false
    }
}
