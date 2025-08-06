import { type CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("gay")
  .setDescription("See the actual gay.");

export async function execute(interaction: CommandInteraction, userId: string) {
  return interaction.reply(`<@${userId}> is the gay of today.`);
}
