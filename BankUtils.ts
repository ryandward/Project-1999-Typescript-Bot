import axios from "axios";
import {
  AttachmentBuilder,
  AutocompleteInteraction,
  CommandInteraction,
  CommandInteractionOptionResolver,
  EmbedBuilder,
} from "discord.js";
import Table from "easy-table";
import { DatabaseUtils, db } from "./DatabaseUtils.js";
import { logger } from "./Logger.js";

interface Suggestion {
  name: string;
  value: string;
}

// 3. Bank Utilities
interface Item {
  banker: string;
  quantity: number;
  location: string;
}

export const BankUtils = {
  dbUtils: Object.create(DatabaseUtils).init(db),

  // Internal helper functions
  async search(itemName: string) {
    return await this.dbUtils.getRows("bank", "name", itemName);
  },

  async suggest(partialName: string) {
    return await this.dbUtils.getSuggestionsAndCount(
      "bank",
      "name",
      partialName
    );
  },

  // Command definitions
  commands: [
    {
      name: "find",
      description: "Searches for an item in the bank.",
      options: [
        {
          name: "item",
          type: 3, // Assuming this is the correct type for a string
          description: "The item to search for",
          required: true,
          autocomplete: true,
        },
      ],

      autocomplete: async (interaction: AutocompleteInteraction) => {
        const partialName = interaction.options.getFocused(true).value;
        const suggestions = await BankUtils.suggest(partialName);
        await interaction.respond(
          suggestions.map((suggestion: Suggestion) => ({
            name: suggestion.name,
            value: suggestion.value,
          }))
        );
      },

      // Command handlers
      execute: async (interaction: CommandInteraction) => {
        const itemName = (
          interaction.options as CommandInteractionOptionResolver
        ).getString("item");

        if (!itemName) {
          await interaction.reply({
            content: `No items found matching "${itemName}".`,
            ephemeral: true,
          });
          return;
        }

        const items = await BankUtils.search(itemName);

        if (items.length === 0) {
          await interaction.reply({
            content: `No items found matching "${itemName}".`,
            ephemeral: true,
          });
          return;
        }

        const allQuantitiesAreOne = items.every(
          (item: Item) => item.quantity == 1
        );

        let table = new Table();

        if (allQuantitiesAreOne) {
          items.forEach((item: Item) => {
            table.cell("Banker", item.banker);
            table.cell("Location", item.location);
            table.newRow();
          });
        } else {
          items.forEach((item: Item) => {
            table.cell("Banker", item.banker);
            table.cell("Quantity", item.quantity);
            table.cell("Location", item.location);
            table.newRow();
          });
        }

        const embed = new EmbedBuilder()
        .setColor(0x0099FF) // Set a color for the embed
        .setTitle(itemName) // Use the item name as the title
        .setDescription(`\`\`\`\n${table.toString()}\n\`\`\``)
        .setThumbnail('attachment://thumbnail.png'); // Set the thumbnail to the attached image
    
        const imageUrl = await getImageUrl(itemName);

        if (!imageUrl) {
          await interaction.reply({
            content: ':white_check_mark: Item found.',
            embeds: [embed], // Pass the embed in the embeds array
          })
          return;
        }

        const imageAttachment = new AttachmentBuilder(imageUrl).setName('thumbnail.png');

        // Respond to the interaction with the embed and attached image
        await interaction.reply({
            content: ':white_check_mark: Item found.',
            embeds: [embed], // Pass the embed in the embeds array
            files: [imageAttachment] // Attach the image file
        });
      },
    }, // find
    // Additional commands can be added in a similar manner
  ],
};

// Define a type for the cache
interface ImageUrlCache {
  [key: string]: string | undefined;
}

// Initialize the cache with the specific type
const imageUrlCache: ImageUrlCache = {};

// Helper function to type-check API responses
interface MediaWikiResponse {
  query: {
    pages: {
      [key: string]: {
        revisions?: [{ '*': string }];
        imageinfo?: [{ url: string }];
      };
    };
  };
}

async function getImageUrl(itemName: string): Promise<string | null> {
  // Standardize the item name to ensure cache consistency
  const standardizedItemName = itemName.replace("Song: ", "").replace("Spell: ", "");

  // Check if the image URL is already cached
  if (imageUrlCache[standardizedItemName]) {
    logger.info(`Cache hit for ${standardizedItemName}`);
    return imageUrlCache[standardizedItemName] || null;
  }

  // If not in cache, proceed to fetch the image URL
  const baseUrl = "http://localhost/mediawiki/api.php";
  const searchParams = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: standardizedItemName,
    rvprop: "content",
    format: "json",
  });

  try {
    const searchResponse = await axios.get<MediaWikiResponse>(baseUrl, { params: searchParams });
    const pageId = Object.keys(searchResponse.data.query.pages)[0];
    const pageData = searchResponse.data.query.pages[pageId];

    if (!pageData.revisions) {
      logger.info(searchResponse.data);
      return null;
    }

    const content = pageData.revisions[0]["*"];
    const lucyImgIdMatch = content.match(/lucy_img_ID\s*=\s*(\d+)/);
    const spelliconMatch = content.match(/spellicon\s*=\s*(\w+)/);

    let filename;
    if (lucyImgIdMatch) {
      const imageId = lucyImgIdMatch[1];
      filename = `item_${imageId}.png`;
    } else if (spelliconMatch) {
      const imageId = spelliconMatch[1];
      filename = `Spellicon_${imageId}.png`;
    } else {
      return null;
    }

    const imageInfoParams = new URLSearchParams({
      action: "query",
      prop: "imageinfo",
      titles: `File:${filename}`,
      iiprop: "url",
      format: "json",
    });

    const imageInfoResponse = await axios.get<MediaWikiResponse>(baseUrl, { params: imageInfoParams });
    const imagePageId = Object.keys(imageInfoResponse.data.query.pages)[0];
    const imagePageData = imageInfoResponse.data.query.pages[imagePageId];

    if (imagePageData.imageinfo) {
      let imageUrl = imagePageData.imageinfo[0].url;
      imageUrl = imageUrl.replace("http://localhost:80/mediawiki/images", "/var/lib/mediawiki");

      // Cache the image URL for future use
      imageUrlCache[standardizedItemName] = imageUrl;

      return imageUrl;
    }
  } catch (error) {
    logger.error("Error fetching image URL:", error);
    return null;
  }

  return null;
}