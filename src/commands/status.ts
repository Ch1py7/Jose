import { MIN_USERS } from "@/utils/constants";
import { type CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription(
    "Check if someone is eligible to be chosen as the gay of the day"
  );

export async function execute(
  interaction: CommandInteraction,
  channelWithEnoughMembers: boolean
) {
  const voiceChannels = interaction.guild?.channels.cache.filter((channel) =>
    channel.isVoiceBased()
  );
  if (!voiceChannels || voiceChannels.size === 0) {
    return interaction.reply("There are no voice channels in this server.");
  }

  if (channelWithEnoughMembers) {
    return interaction.reply(
      `🟢 *It's time to crown someone!* There are at least **${MIN_USERS} people** in a voice channel.`
    );
  }
  return interaction.reply(
    `🔴 *Not enough people in any voice channel yet.* You need at least **${MIN_USERS}** to choose the gay of the day.`
  );
}
