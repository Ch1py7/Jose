import { MIN_USERS } from "@/utils/constants";
import { type CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("See a list of people eligible to be gay");

export async function execute(
  interaction: CommandInteraction,
  users: string[]
) {
  if (users.length <= 0) {
    return interaction.reply("There are currently no users in the game.");
  }

  if (users.length < MIN_USERS) {
    return interaction.reply("There are not enough users to play.");
  }

  return interaction.reply(
    `Currently the users playing are: ${users
      .map((userId) => `<@${userId}>`)
      .join(", ")}.`
  );
}
