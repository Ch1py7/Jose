import { supabase } from '@/supabase/client'
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
	.setName('count')
	.setDescription('Check how many times someone has held the GAY OF THE DAY title.')
	.addUserOption((option) =>
		option.setName('user').setDescription('The user you want to check.').setRequired(true)
	)

export async function execute(interaction: CommandInteraction, guildId: string): Promise<void> {
	if (!interaction.isChatInputCommand()) return

	const user = interaction.options.getUser('user')
	if (!user) {
		await interaction.reply("Couldn't find that user. 🫠")
		return
	}

	const { data, error } = await supabase
		.from('gay_role_assignments')
		.select('count')
		.eq('guild_id', guildId)
		.eq('user_id', user.id)
		.single()

	if (error || !data) {
		await interaction.reply(`<@${user.id}> has never held the GAY OF THE DAY title. 🙀`)
		return
	}

	const times = data.count
	const timeWord = times === 1 ? 'time' : 'times'

	await interaction.reply(`<@${user.id}> has been 🌈 GAY OF THE DAY 🌈 ${times} ${timeWord}.`)
}
