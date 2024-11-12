import { MODULE } from '../constants.js'

export function patchD20Roll () {
    libWrapper.register(MODULE.ID, 'CONFIG.Dice.D20Roll.fromConfig', fromConfigPatch, 'OVERRIDE')
}

function fromConfigPatch (config, process) {
    const baseDie = config.options?.customDie || new CONFIG.Dice.D20Die().formula
    const formula = [baseDie].concat(config.parts ?? []).join(' + ')
    config.options.target ??= process.target
    return new this(formula, config.data, config.options)
}
