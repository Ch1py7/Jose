import { type CommandInteraction, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder().setName('log').setDescription('log')

export async function execute(interaction: CommandInteraction): Promise<void> {
	await interaction.reply('log')
}
