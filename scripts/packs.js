import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";

const packs = [
  "custom-dnd5e-items",
  "custom-dnd5e-journals"
];

// eslint-disable-next-line
const argv = yargs(hideBin(process.argv))
  .command(packageCommand())
  .help().alias("help", "h")
  .argv;

/**
 * Package command.
 * @returns {object} The command
 */
function packageCommand() {
  return {
    command: "package [action] [pack]",
    describe: "Manage packages",
    builder: yargs => {
      yargs.positional("action", {
        describe: "The action to perform.",
        type: "string",
        choices: ["unpack", "pack"]
      });
      yargs.positional("pack", {
        describe: "Name of the pack upon which to work.",
        type: "string"
      });
    },
    handler: async argv => {
      const { action, pack } = argv;
      switch ( action ) {
        case "pack":
          return await compilePacks(pack);
        case "unpack":
          return await extractPacks(pack);
      }
    }
  };
}

/**
 * Compile packs.
 * @param {string} pack The name of the pack to compile
 */
export async function compilePacks(pack) {
  try {
    if ( pack ) {
      console.log("Compiling:", pack);
      await compilePack(`packs/_source/${pack}`, `packs/${pack}`);
    } else {
      for ( const pack of packs ) {
        console.log("Compiling:", pack);
        await compilePack(`packs/_source/${pack}`, `packs/${pack}`);
      }
    }
  } catch(error) {
    console.error("Error compiling packs:", error);
  }
}

/**
 * Extract packs.
 * @param {string} pack The name of the pack to extract
 */
export async function extractPacks(pack) {
  try {
    if ( pack ) {
      console.log("Extracting:", pack);
      await extractPack(`packs/${pack}`, `packs/_source/${pack}`, { log: true });
    } else {
      for ( const pack of packs ) {
        console.log("Extracting:", pack);
        await extractPack(`packs/${pack}`, `packs/_source/${pack}`, { log: true });
      }
    }
  } catch(error) {
    console.error("Error extracting packs:", error);
  }
}

