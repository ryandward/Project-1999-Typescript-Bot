import {
  AutocompleteInteraction,
  CommandInteraction,
  CommandInteractionOptionResolver
} from "discord.js";

import Table from "easy-table";
import _ from "lodash";
import { ILike, createConnection, getRepository } from "typeorm";
import { logger } from "./Logger.js";
import { ActiveToons } from "./entities/ActiveToons.js";
import { Census } from "./entities/Census.js";
import { ClassDefinitions } from "./entities/ClassDefinitions.js";
import { Status } from "./entities/Status.js";

createConnection()
  .then(() => {
    console.log("Database connection established");
  })
  .catch(console.error);

async function findActiveToonByName(toonName: string) {
  return await getRepository(ActiveToons).findOne({ Name: toonName });
}

async function findAnyToonByName(toonName: string) {
  return await getRepository(Census).findOne({ Name: toonName });
}

async function findActiveToonsByDiscordId(discord_id: string) {
  return await getRepository(ActiveToons).find({ DiscordId: discord_id });
}

async function suggestActiveToons(partialName: string) {
  return await getRepository(ActiveToons).find({
    where: { Name: ILike(`%${partialName}%`) },
    take: 10,
  });
}

async function suggestAllToons(partialName: string) {
  return await getRepository(Census).find({
    where: { Name: ILike(`%${partialName}%`) },
    take: 10,
  });
}

async function suggestClass(partialName: string) {
  return await getRepository(ClassDefinitions).find({
    where: { ClassName: ILike(`%${partialName}%`) },
    take: 5,
  });
}

async function suggestStatus(partialName: string) {
  return await getRepository(Status).find({
    where: { Status: ILike(`%${partialName}%`) },
    take: 10,
  });
}


export const CensusUtils = {
  commands: [
    {
      name: "toons",
      description: "Discovers toons related to a name.",
      options: [
        {
          name: "toon",
          type: 3, // Assuming this is the correct type for a string
          description: "The toon to search for",
          required: true,
          autocomplete: true,
          handleAutocomplete: async (interaction: AutocompleteInteraction) => {
            interaction.respond(
              (
                await suggestActiveToons(
                  interaction.options.getFocused(true).value
                )
              ).map((suggestion: ActiveToons) => ({
                name: suggestion.Name,
                value: suggestion.Name,
              }))
            );
          },
        },
      ],

      execute: async (interaction: CommandInteraction) => {
        const options = interaction.options;

        const toonName = (
          interaction.options as CommandInteractionOptionResolver
        ).getString("toon");

        if (!toonName) {
          interaction.reply({
            content: `No toons found matching "${toonName}".`,
            ephemeral: true,
          });
          return;
        }

        let toons = await findActiveToonByName(toonName)
          .then((toon) => (toon ? toon.DiscordId : null))
          .then((discordId) =>
            discordId ? findActiveToonsByDiscordId(discordId) : null
          )
          .catch(console.error);

        if (!toons) {
          await interaction.reply({
            content: `No toons found matching "${toonName}".`,
            ephemeral: true,
          });
          return;
        }

        const user_id = toons[0].DiscordId; // Get the DiscordId from the first toon

        const statusOrder = ["Main", "Alt", "Bot", "Dropped"];

        toons = _.sortBy(toons, [
          (toon) => statusOrder.indexOf(toon.Status),
          "Level",
        ]);

        let table = new Table();

        toons.forEach((toon) => {
          table.cell("Toon", toon.Name);
          table.cell("Status", toon.Status);
          table.cell("Level", toon.Level);
          table.cell("Class", toon.CharacterClass);
          table.newRow();
        });

        await interaction.reply({
          content: `:white_check_mark: <@${user_id}>'s toons.`,
          embeds: [
            {
              // title: `Census Results for ${toonName}`,
              description: `\`\`\`\n${table.toString()}\n\`\`\``,
            },
          ],
        });
      },
    }, // toons
    {
      name: "assign",
      description: "Assign a new character or update an existing character",
      options: [
        {
          name: "discordid",
          type: 6,
          description: "The Discord ID of the user",
          required: true,
          autocomplete: true,
        },
        {
          name: "toon",
          type: 3,
          description: "The name of the toon",
          required: true,
          autocomplete: true,
          handleAutocomplete: async (interaction: AutocompleteInteraction) => {
            interaction.respond(
              (
                await suggestAllToons(
                  interaction.options.getFocused(true).value
                )
              ).map((suggestion: Census) => ({
                name: suggestion.Name,
                value: suggestion.Name,
              }))
            );
          },
        },
        {
          name: "status",
          type: 3,
          description: "The status of the toon (Main/Alt/Bot/Drop)",
          required: true,
          autocomplete: true,
          handleAutocomplete: async (interaction: AutocompleteInteraction) => {
            interaction.respond(
              (
                await suggestStatus(interaction.options.getFocused(true).value)
              ).map((suggestion: Status) => ({
                name: suggestion.Status,
                value: suggestion.Status,
              }))
            );
          },
        },
        {
          name: "level",
          type: 4,
          description: "The level of the toon (1-60)",
          required: true,
          autocomplete: false,
        },
        {
          name: "class",
          type: 3,
          description: "The class of the toon",
          required: true,
          autocomplete: true,
          handleAutocomplete: async (interaction: AutocompleteInteraction) => {
            interaction.respond(
              (
                await suggestClass(interaction.options.getFocused(true).value)
              ).map((suggestion: ClassDefinitions) => ({
                name: suggestion.ClassName,
                value: suggestion.CharacterClass,
              }))
            );
          },
        },
      ],

      execute: async (interaction: CommandInteraction) => {
        const { options } = interaction;

        const discordID = options.get("discordid")?.value as string;
        const level = options.get("level")?.value as number;

        let toonName = options.get("toon")?.value as string;
        toonName = _.capitalize(toonName);

        let status = options.get("status")?.value as string;
        status = _.capitalize(status);

        let characterClass = options.get("class")?.value as string;
        characterClass = _.capitalize(characterClass);

        let toon = await getRepository(Census).findOne({ Name: toonName });

        if (!toon) {
          toon = new Census();
          toon.DiscordId = discordID;
        }

        toon.Name = toonName;
        toon.Level = level;
        toon.CharacterClass = characterClass;
        toon.Status = status;

        const confirmationMessage = `:white_check_mark: ${toonName} has been assigned to <@${discordID}> as a ${status} ${characterClass} at level ${level}.`;

        await getRepository(Census)
          .save(toon)
          .then(async () => {
            interaction.reply({
              content: confirmationMessage,
            });
            return true;
          })
          .catch(async (error) => {
            interaction.reply({
              content: `:x: Error saving toon: ${error}`,
            });
            logger.error(`Error saving toon: ${error}`);
            return false;
          });
      },
    }, //assign
    // Additional commands can be added in a similar manner
  ],
};
