// botInit.ts
import { Client, GatewayIntentBits, REST } from "discord.js";
import 'dotenv/config';
import { logger } from "./Logger.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Define a type for the environment variables to perform type-guarding
type Env = {
    DISCORD_TOKEN: string;
    BOT_SELF: string;
    GUILD_ID: string;
};

// Function to check environment variables
function checkEnvVariables(env: typeof process.env): Promise<Env> {
  return new Promise((resolve, reject) => {
    if (env.DISCORD_TOKEN && env.BOT_SELF && env.GUILD_ID) {
      resolve(env as Env);
    } else {
      reject(new Error("Required environment variables are not set"));
    }
  });
}

async function initBot() {
  logger.info("Started bot initialization");

  checkEnvVariables(process.env)
    .then((env) => {
      const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

      client.login(env.DISCORD_TOKEN)
        .then(() => logger.info("Finished bot initialization"))
        .catch((error) => {
          logger.error("Failed to login", error);
          throw error; 
        });
    })
    .catch((error) => {
      logger.error(error.message);
      throw error; 
    });
}
export { client, initBot };
