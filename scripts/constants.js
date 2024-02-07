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
    CONDITION_TYPES: {
        SETTING: {
            DEFAULT: {
                blinded: {
                    label: 'DND5E.ConBlinded',
                    icon: 'systems/dnd5e/icons/svg/statuses/blinded.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.0b8N4FymGGfbZGpJ',
                    special: 'BLIND'
                },
                charmed: {
                    label: 'DND5E.ConCharmed',
                    icon: 'systems/dnd5e/icons/svg/statuses/charmed.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.zZaEBrKkr66OWJvD'
                },
                deafened: {
                    label: 'DND5E.ConDeafened',
                    icon: 'systems/dnd5e/icons/svg/statuses/deafened.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.6G8JSjhn701cBITY'
                },
                diseased: {
                    label: 'DND5E.ConDiseased',
                    icon: 'icons/svg/biohazard.svg'
                },
                exhaustion: {
                    label: 'DND5E.ConExhaustion',
                    icon: 'systems/dnd5e/icons/svg/statuses/exhaustion.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.cspWveykstnu3Zcv'
                },
                frightened: {
                    label: 'DND5E.ConFrightened',
                    icon: 'systems/dnd5e/icons/svg/statuses/frightened.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.oreoyaFKnvZCrgij'
                },
                grappled: {
                    label: 'DND5E.ConGrappled',
                    icon: 'systems/dnd5e/icons/svg/statuses/grappled.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.gYDAhd02ryUmtwZn'
                },
                incapacitated: {
                    label: 'DND5E.ConIncapacitated',
                    icon: 'systems/dnd5e/icons/svg/statuses/incapacitated.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.TpkZgLfxCmSndmpb'
                },
                invisible: {
                    label: 'DND5E.ConInvisible',
                    icon: 'systems/dnd5e/icons/svg/statuses/invisible.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.3UU5GCTVeRDbZy9u'
                },
                paralyzed: {
                    label: 'DND5E.ConParalyzed',
                    icon: 'systems/dnd5e/icons/svg/statuses/paralyzed.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.xnSV5hLJIMaTABXP',
                    statuses: ['incapacitated']
                },
                petrified: {
                    label: 'DND5E.ConPetrified',
                    icon: 'systems/dnd5e/icons/svg/statuses/petrified.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.xaNDaW6NwQTgHSmi',
                    statuses: ['incapacitated']
                },
                poisoned: {
                    label: 'DND5E.ConPoisoned',
                    icon: 'systems/dnd5e/icons/svg/statuses/poisoned.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.lq3TRI6ZlED8ABMx'
                },
                prone: {
                    label: 'DND5E.ConProne',
                    icon: 'systems/dnd5e/icons/svg/statuses/prone.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.y0TkcdyoZlOTmAFT'
                },
                restrained: {
                    label: 'DND5E.ConRestrained',
                    icon: 'systems/dnd5e/icons/svg/statuses/restrained.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.cSVcyZyNe2iG1fIc'
                },
                stunned: {
                    label: 'DND5E.ConStunned',
                    icon: 'systems/dnd5e/icons/svg/statuses/stunned.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.ZyZMUwA2rboh4ObS',
                    statuses: ['incapacitated']
                },
                unconscious: {
                    label: 'DND5E.ConUnconscious',
                    icon: 'systems/dnd5e/icons/svg/statuses/unconscious.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.UWw13ISmMxDzmwbd',
                    statuses: ['incapacitated', 'prone']
                }
            }
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
            KEY: 'damage-types',
            DEFAULT: {
                acid: {
                    label: 'DND5E.DamageAcid',
                    icon: 'systems/dnd5e/icons/svg/damage/acid.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.IQhbKRPe1vCPdh8v'
                },
                bludgeoning: {
                    label: 'DND5E.DamageBludgeoning',
                    icon: 'systems/dnd5e/icons/svg/damage/bludgeoning.svg',
                    isPhysical: true,
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.39LFrlef94JIYO8m'
                },
                cold: {
                    label: 'DND5E.DamageCold',
                    icon: 'systems/dnd5e/icons/svg/damage/cold.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4xsFUooHDEdfhw6g'
                },
                fire: {
                    label: 'DND5E.DamageFire',
                    icon: 'systems/dnd5e/icons/svg/damage/fire.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.f1S66aQJi4PmOng6'
                },
                force: {
                    label: 'DND5E.DamageForce',
                    icon: 'systems/dnd5e/icons/svg/damage/force.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.eFTWzngD8dKWQuUR'
                },
                lightning: {
                    label: 'DND5E.DamageLightning',
                    icon: 'systems/dnd5e/icons/svg/damage/lightning.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9SaxFJ9bM3SutaMC'
                },
                necrotic: {
                    label: 'DND5E.DamageNecrotic',
                    icon: 'systems/dnd5e/icons/svg/damage/acid.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.klOVUV5G1U7iaKoG'
                },
                piercing: {
                    label: 'DND5E.DamagePiercing',
                    icon: 'systems/dnd5e/icons/svg/damage/piercing.svg',
                    isPhysical: true,
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.95agSnEGTdAmKhyC'
                },
                poison: {
                    label: 'DND5E.DamagePoison',
                    icon: 'systems/dnd5e/icons/svg/statuses/poisoned.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.k5wOYXdWPzcWwds1'
                },
                psychic: {
                    label: 'DND5E.DamagePsychic',
                    icon: 'systems/dnd5e/icons/svg/damage/psychic.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.YIKbDv4zYqbE5teJ'
                },
                radiant: {
                    label: 'DND5E.DamageRadiant',
                    icon: 'systems/dnd5e/icons/svg/damage/radiant.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.5tcK9buXWDOw8yHH'
                },
                slashing: {
                    label: 'DND5E.DamageSlashing',
                    icon: 'systems/dnd5e/icons/svg/damage/slashing.svg',
                    isPhysical: true,
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.sz2XKQ5lgsdPEJOa'
                },
                thunder: {
                    label: 'DND5E.DamageThunder',
                    icon: 'systems/dnd5e/icons/svg/damage/thunder.svg',
                    reference: 'Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.iqsmMHk7FSpiNkQy'
                }
            }
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
            KEY: 'languages',
            DEFAULT: {
                standard: {
                    label: 'DND5E.LanguagesStandard',
                    children: {
                        common: {
                            label: 'DND5E.LanguagesCommon'
                        },
                        dwarvish: {
                            label: 'DND5E.LanguagesDwarvish'
                        },
                        elvish: {
                            label: 'DND5E.LanguagesElvish'
                        },
                        giant: {
                            label: 'DND5E.LanguagesGiant'
                        },
                        gnomish: {
                            label: 'DND5E.LanguagesGnomish'
                        },
                        goblin: {
                            label: 'DND5E.LanguagesGoblin'
                        },
                        halfling: {
                            label: 'DND5E.LanguagesHalfling'
                        },
                        orc: {
                            label: 'DND5E.LanguagesOrc'
                        }
                    }
                },
                exotic: {
                    label: 'DND5E.LanguagesExotic',
                    children: {
                        aarakocra: {
                            label: 'DND5E.LanguagesAarakocra'
                        },
                        abyssal: {
                            label: 'DND5E.LanguagesAbyssal'
                        },
                        celestial: {
                            label: 'DND5E.LanguagesCelestial'
                        },
                        deep: {
                            label: 'DND5E.LanguagesDeepSpeech'
                        },
                        draconic: {
                            label: 'DND5E.LanguagesDraconic'
                        },
                        gith: {
                            label: 'DND5E.LanguagesGith'
                        },
                        gnoll: {
                            label: 'DND5E.LanguagesGnoll'
                        },
                        infernal: {
                            label: 'DND5E.LanguagesInfernal'
                        },
                        primordial: {
                            label: 'DND5E.LanguagesPrimordial',
                            children: {
                                aquan: {
                                    label: 'DND5E.LanguagesAquan'
                                },
                                auran: {
                                    label: 'DND5E.LanguagesAuran'
                                },
                                ignan: {
                                    label: 'DND5E.LanguagesIgnan'
                                },
                                terran: {
                                    label: 'DND5E.LanguagesTerran'
                                }
                            }
                        },
                        sylvan: {
                            label: 'DND5E.LanguagesSylvan'
                        },
                        undercommon: {
                            label: 'DND5E.LanguagesUndercommon'
                        }
                    }
                },
                druidic: {
                    label: 'DND5E.LanguagesDruidic'
                },
                cant: {
                    label: 'DND5E.LanguagesThievesCant'
                }
            }
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
            KEY: 'senses',
            DEFAULT: {
                blindsight: {
                    label: 'DND5E.SenseBlindsight'
                },
                darkvision: {
                    label: 'DND5E.SenseDarkvision'
                },
                tremorsense: {
                    label: 'DND5E.SenseTremorsense'
                },
                truesight: {
                    label: 'DND5E.SenseTruesight'
                }
            }
        }
    }
}

export const SHEET = {
    ActorSheet5eCharacter: {
        character: true,
        legacy: true,
        npc: true
    },
    ActorSheet5eCharacter2: {
        character: true,
        legacy: false,
        npc: true
    },
    ActorSheet5eNPC: {
        character: false,
        legacy: true,
        npc: false
    }
}
