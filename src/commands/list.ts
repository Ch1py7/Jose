import { type CommandInteraction, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('See a list of people eligible to be gay')

export async function execute(
	interaction: CommandInteraction,
	users: string[],
	isGayMode: boolean
): Promise<void> {
	if (users.length <= 0) {
		await interaction.reply('There are currently no users in the game.')
		return
	}

	if (!isGayMode) {
		await interaction.reply('There are not enough users to play.')
		return
	}

	await interaction.reply(
		`Currently the users playing are: ${users.map((userId) => `<@${userId}>`).join(', ')}.`
	)
}
