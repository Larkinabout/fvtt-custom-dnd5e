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
    }
}

export const SHEET = {
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
