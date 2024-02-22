import {
  AutocompleteInteraction,
  CommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";
import Table from "easy-table";

import { DatabaseUtils, db } from "./DatabaseUtils.js";

interface Suggestion {
  name: string;
  value: string;
}

interface Toon {
  name: string;
  discord_id: string;
  guild: string;
  level: number;
  character_class: string;
  status: string;
}

const statusOrder = ["Main", "Alt", "Bot", "Dropped"];

export const CensusUtils = {
  dbUtils: Object.create(DatabaseUtils).init(db),

  // Internal helper functions
  async searchbyToon(toonName: string) {
    return await this.dbUtils.getRow("active_toons", "name", toonName);
  },

  async searchbyDiscordID(discord_id: string) {
    return await this.dbUtils.getRows("active_toons", "discord_id", discord_id);
  },

  async suggest(partialName: string) {
    return await this.dbUtils.getSuggestions("active_toons", "name", partialName);
  },

  // Command definitions
  commands: [
    {
      name: "toons",
      description: "Discovers toons related to a name.",
      options: [
        {
          name: "toon",
          type: 3, // Assuming this is the correct type for a string
          description: "The toon to searchbyToon for",
          required: true,
          autocomplete: true,
        },
      ],

      autocomplete: async (interaction: AutocompleteInteraction) => {
        const partialName = interaction.options.getFocused(true).value;
        const suggestions = await CensusUtils.suggest(partialName);
        await interaction.respond(
          suggestions.map((suggestion: Suggestion) => ({
            name: suggestion.name,
            value: suggestion.value,
          }))
        );
      },

      // Command handlers
      execute: async (interaction: CommandInteraction) => {
        const toonName = (
          interaction.options as CommandInteractionOptionResolver
        ).getString("toon");

        if (!toonName) {
          await interaction.reply({
            content: `No toons found matching "${toonName}".`,
            ephemeral: true,
          });
          return;
        }

        const toon_hit = await CensusUtils.searchbyToon(toonName);
        if (toon_hit.length === 0) {
          await interaction.reply({
            content: `No toons found matching "${toonName}".`,
            ephemeral: true,
          });
          return;
        }

        const discord_id = toon_hit.discord_id;

        const toons = await CensusUtils.searchbyDiscordID(discord_id);

        toons.sort((a: Toon, b: Toon) => {
          const statusDiff =
            statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          return statusDiff !== 0 ? statusDiff : b.level - a.level;
        });

        let table = new Table();

        toons.forEach((toon: Toon) => {
          table.cell("Toon", toon.name);
          table.cell("Status", toon.status);
          table.cell("Level", toon.level);
          table.cell("Class", toon.character_class);
          table.newRow();
        });

        await interaction.reply({
          content: `:white_check_mark: <@${discord_id}>'s toons.`,
          embeds: [
            {
              // title: `Census Results for ${toonName}`,
              description:
                `\`\`\`\n${table.toString()}\n\`\`\``,
            },
          ],
        });
      },
    }, // toons
    // Additional commands can be added in a similar manner
  ],
};