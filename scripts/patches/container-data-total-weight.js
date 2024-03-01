import { MODULE } from '../constants.js'

export function patchContainerDataTotalWeight () {
    libWrapper.register(MODULE.ID, 'CONFIG.Item.dataModels.container.prototype.totalWeight', totalWeightPatch, 'OVERRIDE')
}

async function totalWeightPatch () {
    if (this.properties.has('weightlessContents')) return this.weight
    const containedWeight = this.contentsWeight
    if (containedWeight instanceof Promise) return containedWeight.then(c => this.weight + c)
    return this.weight + containedWeight
}
