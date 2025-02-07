import { CONSTANTS } from './constants.js'
import { getSetting, registerSetting } from './utils.js'

const constants = CONSTANTS.CHAT_COMMANDS
const slugify = value => value?.slugify().replaceAll('-', '').replaceAll('(', '').replaceAll(')', '')

/**
 * Register
 */
export function register () {
    registerSettings()
    registerHooks()
}

/**
 * Register settings
 */
export function registerSettings () {
    registerSetting(
        constants.SETTING.KEY,
        {
            name: game.i18n.localize(constants.SETTING.NAME),
            hint: game.i18n.localize(constants.SETTING.HINT),
            scope: 'world',
            config: true,
            requiresReload: true,
            type: Boolean,
            default: false
        }
    )
}

/**
 * Register hooks
 */
export function registerHooks () {
    if (!getSetting(CONSTANTS.CHAT_COMMANDS.SETTING.KEY)) return

    Hooks.on('chatMessage', (chatLog, message, options) => {
        if (message.match(`^/(attack|a|concentration|con|check|c|damage|d|heal|h|healing|item|save|s|skill|k|tool|t)`)) {
            handleChatCommand(message)
            return false
        }
    })
}

/**
 * Handle the chat command
 * @param {string} message The message posted to chat 
 */
function handleChatCommand(message) {
    let config = parseChatCommand(message)

    switch (config.type) {
        case 'attack':
        case 'damage':
        case 'heal':
        case 'healing':
            parseAttackDamage(config)
            config.type === 'attack' ? rollAttack(config) : rollDamage(config)
            break 
        case 'concentration':
        case 'check':    
        case 'save':
        case 'skill':
        case 'tool':
            config = parseRollRequest(config)
            createRollRequest(config)
            break
    }
}

/**
 * Parse the chat command
 * @param {string} message The message posted to chat 
 * @returns {object}       The parse command
 */
function parseChatCommand(message) {
    const shorthands = { a: 'attack', c: 'check', con: 'concentration', d: 'damage', h: 'heal', k: 'skill', s: 'save', t: 'tool' }
    const regex = /^\/(?<type>\w+)\s*(?<config>.*)/i
    const match = message.match(regex)
    if (!match) return

    const type = shorthands[match.groups.type] || match.groups.type
    const config = parseConfig(match.groups.config)

    
    
    return { type, ...config }
}

/**
 * Parse a roll string into a configuration object.
 * @param {string} match  Matched configuration string.
 * @param {object} [options={}]
 * @param {boolean} [options.multiple=false]  Support splitting configuration by '&' into multiple sub-configurations.
 *                                            If set to `true` then an array of configs will be returned.
 * @returns {object|object[]}
 */
function parseConfig(match='', { multiple = false }={}) {
    if ( multiple ) return match.split('&').map(s => parseConfig(s))
    const config = { _config: match, values: [] }

    for ( const part of match.match(/(?:[^\s']+|'[^']*')+/g) ?? [] ) {
      if ( !part ) continue
      const [key, value] = part.split('=')
      const valueLower = value?.toLowerCase()
      if ( value === undefined ) config.values.push(key.replace(/(^'|'$)/g, ''))
      else if ( ['true', 'false'].includes(valueLower) ) config[key] = valueLower === 'true'
      else if ( Number.isNumeric(value) ) config[key] = Number(value)
      else config[key] = value.replace(/(^'|'$)/g, '')
    }

    return config
  }

/**
 * Create a roll request
 * @param {object} config The config
 * @returns 
 */
async function createRollRequest(config) {
    if (!config.ability && !config.skill & !config.tool) return

    const MessageClass = getDocumentClass('ChatMessage')

    let buttons
    if ( config.type === 'check' ) buttons = createCheckRequestButtons(config)
    else if ( config.type === 'save' ) buttons = createSaveRequestButtons(config)
    else buttons = [createRequestButton({ ...config, format: 'short' })]

    const chatData = {
      user: game.user.id,
      content: await renderTemplate('systems/dnd5e/templates/chat/request-card.hbs', { buttons }),
      flavor: game.i18n.localize('EDITOR.DND5E.Inline.RollRequest'),
      speaker: MessageClass.getSpeaker({user: game.user})
    }
    return MessageClass.create(chatData)
}

/**
 * Create the buttons for a check requested in chat.
 * @param {object} config
 * @returns {object[]}
 */
function createCheckRequestButtons(config) {
  return [createRequestButton(config)]
}

  /**
 * Create the buttons for a save requested in chat.
 * @param {object} config
 * @returns {object[]}
 */
function createSaveRequestButtons(config) {
    return [createRequestButton({ ...config, format: 'long' })]
}

/**
 * Create a button for a chat request.
 * @param {object} config
 * @returns {object}
 */
function createRequestButton(config) {
    return {
      buttonLabel: dnd5e.enrichers.createRollLabel({ ...config, icon: true }),
      hiddenLabel: dnd5e.enrichers.createRollLabel({ ...config, icon: true, hideDC: true }),
      dataset: { ...config, action: 'rollRequest', visibility: 'all' }
    }
}

function parseRollRequest(config) {
    for ( let value of config.values ) {
        const slug = foundry.utils.getType(value) === 'string' ? slugify(value) : value
        if (config.type === 'concentration') config._isConcentration = true
        if ( slug in CONFIG.DND5E.enrichmentLookup.abilities ) config.ability = CONFIG.DND5E.enrichmentLookup.abilities[slug]?.key || slug
        else if ( slug in CONFIG.DND5E.enrichmentLookup.skills ) config.skill = CONFIG.DND5E.enrichmentLookup.skills[slug]?.key || slug
        else if ( slug in CONFIG.DND5E.enrichmentLookup.tools ) config.tool = CONFIG.DND5E.enrichmentLookup.tools[slug]?.key || slug
        else if ( Number.isNumeric(value) ) config.dc = Number(value)
        else config[value] = true
    }

    if (!config.ability) {
      if (config.skill) config.ability = CONFIG.DND5E.skills[config.skill].ability
      else if (config.skill) config.ability = CONFIG.DND5E.tools[config.tool].ability
    }

    return config
}

function parseAttackDamage(config) {
    config.damageTypes = []
    config.formulas = []
    const formulaParts= []

    for ( const value of config.values ) {
        if ( value in CONFIG.DND5E.damageTypes ) config.damageTypes.push(value)
        else if ( value in CONFIG.DND5E.healingTypes ) config.damageTypes.type.push(value)
        else if ( value in CONFIG.DND5E.attackModes ) config.attackMode = value
        else if ( value === 'average' ) config.average = true
        else if ( value === 'extended' ) config.format = 'extended'
        else if ( value === 'temp' ) config.damageTypes.push('temphp')
        else if (value.match(/((\+|\-)*\d+d\d+(\+|\-)*\d*|^(\+|\-)*\d+)/g)) formulaParts.push(value)
    }
    const options = { rollData: {}, _embedDepth: 0 }
    config.formula = formulaParts.length ? Roll.defaultImplementation.replaceFormulaData(formulaParts.join(' '), options.rollData ?? {}) : '+0'
    if ( config._isHealing && !config.damageTypes.length ) damageTypes.push('healing')
    if ( config.formula ) {
      config.formulas.push(config.formula)
    }

    if ( config.format === 'extended' ) config.average ??= true

    return config
}

/* -------------------------------------------- */

/**
 * Perform an attack roll.
 * @param {object} config The config
 * @returns {Promise|void}
 */
async function rollAttack(config) {
    const { activityUuid, attackMode, formula } = config
  
    if ( activityUuid ) {
      const activity = await fromUuid(activityUuid)
      if ( activity ) return activity.rollAttack({ attackMode })
    }
  
    const targets = dnd5e.utils.getTargetDescriptors()
    const rollConfig = {
      attackMode,
      hookNames: ['attack', 'd20Test'],
      rolls: [{
        parts: [formula.replace(/^\s*\+\s*/, '')],
        options: {
          target: targets.length === 1 ? targets[0].ac : undefined
        }
      }]
    }
  
    const dialogConfig = {
      applicationClass: dnd5e.applications.dice.AttackRollConfigurationDialog
    }
  
    const messageConfig = {
      data: {
        flags: {
          dnd5e: {
            messageType: 'roll',
            roll: { type: 'attack' }
          }
        },
        flavor: game.i18n.localize('DND5E.AttackRoll'),
        speaker: ChatMessage.implementation.getSpeaker()
      }
    }
  
    const rolls = await CONFIG.Dice.D20Roll.build(rollConfig, dialogConfig, messageConfig)
    if ( rolls?.length ) {
      Hooks.callAll('dnd5e.rollAttackV2', rolls, { subject: null, ammoUpdate: null })
      Hooks.callAll('dnd5e.postRollAttack', rolls, { subject: null })
    }
  }
  
  /* -------------------------------------------- */
  
  /**
   * Perform a damage roll.
   * @param {object} config The config
   * @returns {Promise<void>}
   */
  async function rollDamage(config) {  
    let { activityUuid, attackMode, formulas, damageTypes, rollType } = config

    if ( activityUuid ) {
      const activity = await fromUuid(activityUuid)
      if ( activity ) return activity.rollDamage({ attackMode, event })
    }
  
    const rollConfig = {
      attackMode,
      hookNames: ['damage'],
      rolls: formulas.map((formula, idx) => {
        return {
          parts: [formula],
          options: { type: damageTypes[0], damageTypes }
        }
      })
    }
  
    const messageConfig = {
      create: true,
      data: {
        flags: {
          dnd5e: {
            messageType: 'roll',
            roll: { type: rollType },
            targets: dnd5e.utils.getTargetDescriptors()
          }
        },
        flavor: game.i18n.localize(`DND5E.${rollType === 'healing' ? 'Healing' : 'Damage'}Roll`),
        speaker: ChatMessage.implementation.getSpeaker()
      }
    } 
  
    const rolls = await CONFIG.Dice.DamageRoll.build(rollConfig, {}, messageConfig)
    if ( !rolls?.length ) return
    Hooks.callAll('dnd5e.rollDamageV2', rolls)
  }