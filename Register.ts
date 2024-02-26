import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import dotenv from "dotenv";
import { commandMetadatas } from './CommandRegistry.js';
import { logger } from './Logger.js';

dotenv.config();

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not defined`);
  }
  return value;
}

const token = getEnvVar('DISCORD_TOKEN');
const botSelf = getEnvVar('BOT_SELF');
const guildId = getEnvVar('GUILD_ID');

let rest: REST;

switch (true) {
  case !token:
    throw new Error('DISCORD_TOKEN is not defined');
  case !botSelf:
    throw new Error('BOT_SELF is not defined');
  case !guildId:
    throw new Error('GUILD_ID is not defined');
  default:
    rest = new REST({ version: '10' }).setToken(token);
}

export async function unregisterSlashCommands() {
  // Unregister guild-specific commands
  let commands = await rest.get(
    Routes.applicationGuildCommands(botSelf, guildId)
  ) as any[];

  for (const command of commands) {
    logger.info(`Unregistering guild command: ${command.name}`);
    await rest.delete(
      Routes.applicationGuildCommand(
        botSelf,
        guildId,
        command.id
      )
    );
    logger.info(`Unregistered guild command: ${command.name}`);
  }

  commands = await rest.get(
    Routes.applicationCommands(botSelf)
  ) as any[];

  for (const command of commands) {
    logger.info(`Unregistering global command: ${command.name}`);
    await rest.delete(
      Routes.applicationCommand(
        botSelf,
        command.id
      )
    );
    logger.info(`Unregistered global command: ${command.name}`);
  }
}

export async function registerGuildCommands() {
  for (const command of commandMetadatas) {
    logger.info(`Registering guild command: ${command.name}`);
  }
  await rest.put(
    Routes.applicationGuildCommands(botSelf, guildId),
    { body: commandMetadatas }
  );
  logger.info(`Registered guild commands to ${guildId}`);
  logger.info(`commands: ${commandMetadatas}`);
}

export async function registerGlobalCommands() {
  for (const command of commandMetadatas) {
    logger.info(`Registering global command: ${command.name}`);
  }
  await rest.put(
    Routes.applicationCommands(botSelf),
    { body: commandMetadatas }
  );
  logger.info('Registered global commands');
}