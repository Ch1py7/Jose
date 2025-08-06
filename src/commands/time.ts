import { type CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("time")
  .setDescription("See the remaining gay time of the day.");

export async function execute(
  interaction: CommandInteraction,
  remainingTime: string
) {
  return interaction.reply(`The remaining gay time is: ${remainingTime}.`);
}
