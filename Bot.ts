import { Interaction } from "discord.js";
import { commands } from "./CommandRegistry.js";
import { logger } from "./Logger.js";
import { client, initBot } from "./initBot.js";

client.on("ready", () => {
  logger.info(`Logged in as ${client.user?.tag}!`);
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

  const command = commands.find(cmd => cmd.name === interaction.commandName);
  if (!command) {
    logger.warn(`No handler found for: ${interaction.commandName}`);
    return;
  }

  try {
    if (interaction.isCommand() && command.execute) {
      await command.execute(interaction);
    } else if (interaction.isAutocomplete() && command.autocomplete) {
      await command.autocomplete(interaction);
    } else {
      // This else branch might be redundant if the checks above are comprehensive.
      logger.warn(`Handler found for ${interaction.commandName}, but no matching method to execute.`);
    }
  } catch (error) {
    logger.error(`Error executing command: ${interaction.commandName}: ${(error as Error).message}`, (error as Error).stack);
  }
});
// await unregisterSlashCommands();
// await registerGuildCommands();

initBot();
