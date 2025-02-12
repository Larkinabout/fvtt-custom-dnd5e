import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";

// eslint-disable-next-line
const argv = yargs(hideBin(process.argv))
  .command(packageCommand())
  .help().alias("help", "h")
  .argv;


// eslint-disable-next-line
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

export async function compilePacks(pack) {
    await compilePack('packs/_source/custom-dnd5e-items', 'packs/custom-dnd5e-items')
    await compilePack('packs/_source/custom-dnd5e-journals', 'packs/custom-dnd5e-journals')
}

export async function extractPacks(pack) {
    try {
        console.log("Extracting:", pack);
        await extractPack("packs/custom-dnd5e-items", "packs/_source/custom-dnd5e-items", { log: true });
        await extractPack("packs/custom-dnd5e-journals", "packs/_source/custom-dnd5e-journals", { log: true });
      } catch (error) {
        console.error("Error extracting packs:", error);
      }
}

