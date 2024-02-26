import { Interaction } from "discord.js";
import { commands } from "./CommandRegistry.js";
import { logger } from "./Logger.js";
import { registerGuildCommands } from "./Register.js";
import { client, initBot } from "./initBot.js";
client.on("ready", () => {
  logger.info(`Logged in as ${client.user?.tag}!`);
});

initBot();


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
    } else if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused(true);
      const option = command.options.find(opt => opt.name === focusedOption.name && opt.autocomplete);
      if (option && option.handleAutocomplete) {
        await option.handleAutocomplete(interaction);
      }
    } else {
      logger.warn(`Handler found for ${interaction.commandName}, but no matching method to execute.`);
    }
  } catch (error) {
    logger.error(`Error executing command: ${interaction.commandName}: ${(error as Error).message}`, (error as Error).stack);
  }
});

// await unregisterSlashCommands();
await registerGuildCommands();

