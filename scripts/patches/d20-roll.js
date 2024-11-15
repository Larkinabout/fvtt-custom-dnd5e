import { MODULE } from '../constants.js'
import { isCustomRoll } from '../rolls.js'

export function patchD20Roll () {
    if (!isCustomRoll()) return

    libWrapper.register(MODULE.ID, 'CONFIG.Dice.D20Roll.fromConfig', fromConfigPatch, 'OVERRIDE')
    libWrapper.register(MODULE.ID, 'CONFIG.Dice.D20Roll.prototype.configureModifiers', configureModifiersPatch, 'WRAPPER')
    libWrapper.register(MODULE.ID, 'CONFIG.Dice.D20Roll.prototype.validD20Roll', validD20RollPatch, 'OVERRIDE')
}

function fromConfigPatch (config, process) {
    const baseDie = config.options?.customDie || new CONFIG.Dice.D20Die().formula
    const formula = [baseDie].concat(config.parts ?? []).join(' + ')
    config.options.target ??= process.target
    return new this(formula, config.data, config.options)
}

function configureModifiersPatch (wrapped) {
    if (this.options.customDie) this.d20.options.customDie = this.options.customDie

    wrapped()
}

function validD20RollPatch () {
    return !!this.options.customDie || ((this.d20 instanceof CONFIG.Dice.D20Die) && this.d20.isValid)
}
