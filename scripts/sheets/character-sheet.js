import { SHEET_TYPE } from '../constants.js'

Hooks.on('preRenderActorSheet', (app, data) => {
    if (!SHEET_TYPE[app.constructor.name].custom) return

    if (data.abilityRows?.top?.length) {
        data.abilityRows.bottom = [...data.abilityRows.bottom, ...data.abilityRows.top]
        data.abilityRows.top = []
    }
})

export function registerCharacterSheet () {
    DocumentSheetConfig.registerSheet(Actor, 'dnd5e', CustomDnd5eSheetCharacter2, {
        types: ['character'],
        makeDefault: false,
        label: 'CUSTOM_DND5E.sheet.characterSheet'
    })
}

export class CustomDnd5eSheetCharacter2 extends dnd5e.applications.actor.ActorSheet5eCharacter2 {
    constructor (object, options = {}) {
        super(object, options)
    }

    /** @inheritDoc */
    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['custom-dnd5e', 'dnd5e2', 'sheet', 'actor', 'character']
        })
    }

    get template () {
        if (!game.user.isGM && this.actor.limited) return 'systems/dnd5e/templates/actors/limited-sheet-2.hbs'
        return 'modules/custom-dnd5e/templates/sheet/character-sheet-2.hbs'
    }
}
