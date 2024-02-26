// commandRegistry.ts
import { AutocompleteInteraction, CommandInteraction } from "discord.js";
import { BankUtils } from "./BankUtils.js";
import { CensusUtils } from "./CensusUtils.js";

interface Command {
  name: string;
  description: string;
  options: {
    name: string;
    type: number;
    description: string;
    required: boolean;
    autocomplete: boolean;
    handleAutocomplete?: (
      interaction: AutocompleteInteraction
    ) => Promise<void>;
  }[];
  // autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

const commands: Command[] = [];

commands.push(...BankUtils.commands);
commands.push(...CensusUtils.commands);

const commandMetadatas = commands.map(
  ({ execute, options, ...metadata }) => ({
    ...metadata,
    options: options.map(({ handleAutocomplete, ...option }) => option),
  })
);

export { commandMetadatas, commands };

