// botInit.ts
import { Client, GatewayIntentBits, REST } from "discord.js";
import { logger } from "./Logger.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Define a type for the environment variables to perform type-guarding
type Env = {
    DISCORD_TOKEN: string;
    BOT_SELF: string;
    GUILD_ID: string;
};

// Function to check environment variables
function checkEnvVariables(env: typeof process.env): env is Env {
    return Boolean(env.DISCORD_TOKEN && env.BOT_SELF && env.GUILD_ID);
}

async function initBot() {
    logger.info("Started bot initialization");

    if (!checkEnvVariables(process.env)) {
        logger.error("Required environment variables are not set");
        throw new Error("Required environment variables are not set");
    }

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    client.login(process.env.DISCORD_TOKEN)
        .then(() => logger.info("Finished bot initialization"))
        .catch((error) => {
            logger.error("Failed to login", error);
            throw error; // Rethrow or handle as appropriate
        });
}

export { client, initBot };
