import { type CommandInteraction, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder().setName('time').setDescription('See the remaining gay time of the day.')

export async function execute(interaction: CommandInteraction) {
	return interaction.reply('See the remaining gay time of the day.')
}
