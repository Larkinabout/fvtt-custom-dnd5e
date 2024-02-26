![Downloads](https://img.shields.io/github/downloads/Larkinabout/fvtt-custom-dnd5e/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fcustom-dnd5e&colorB=448d34&style=for-the-badge)](https://forge-vtt.com/bazaar#package=custom-dnd5e)

# Custom D&D 5e

A Foundry VTT module to customise the D&D 5e system.

![Custom D&D 5e Settings](./.github/readme/custom-dnd5e-settings.png)
![Custom D&D 5e Custom Banner](./.github/readme/custom-dnd5e-custom-banner.png)

# Features
## Counters
**Counter Types:** Add four types of counter to the character sheets: checkbox, fraction, number and success/failure.

**Triggers:** Set triggers to automatically change a counter value when an actor hits 0 HP, half HP, or when combat ends if they hit 0 HP any time during combat. Set a trigger to automatically make an actor dead when a counter hits a defined value.

![Custom D&D 5e Counters](./.github/readme/custom-dnd5e-counters.gif)
![Custom D&D 5e Counter Triggers](./.github/readme/custom-dnd5e-counter-triggers.png)


## Configurations
- Configure abilities, actor sizes, armor calculations, currencies, damage types, encumbrance, item action types, item activation cost types, item properties, languages, senses, skills, spell schools and max level.

## Configure Encumbrance
![Custom D&D 5e Configure Encumbrance](./.github/readme/custom-dnd5e-configure-encumbrance.png)

## Configure Sheet
- Auto-fade or auto-minimise the sheet when it's not hovered over.
- Scale the new character sheet up or down.
- Change the banner at the top of the sheet.
- Hide death saves, encumbrance, exhaustion, inspiration, the Manage Currency button, Legendary Actions, Legendary Resistances and Use Lair Action.

## House Rules
- When rolling for Hit Points, automatically re-roll based on a minimum value.
- Hide the Take Average option when rolling for Hit Points.

![Custom D&D 5e Level Up Hit Points](./.github/readme/custom-dnd5e-level-up-hit-points.png)

## Compatibility
### Variant Encumbrance + Midi
Custom D&D 5e will defer to the [Variant Encumbrance + Midi](https://foundryvtt.com/packages/variant-encumbrance-dnd5e) module for encumbrance configuration when it is active.

# Wishlist
- Add common house rules.
- Add more versatile encumbrance options.
- Support all dnd5e configurations.

## Required Modules
### [libWrapper](https://foundryvtt.com/packages/lib-wrapper)
LibWrapper is used to wrap Foundry VTT's application render method to add data to the character sheets without editing the HTML. This should no longer be required with the release of Application V2.