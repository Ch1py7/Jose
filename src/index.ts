import { Client, Events, GatewayIntentBits } from 'discord.js'
import { scheduleRemoval, updateGayOfTheDayRole } from './commands/updateGayOfTheDayRole'
import { config } from './config'
import { deployCommands } from './deployCommands'
import { supabase } from './supabase/client'
import { getUsersWithRole } from './utility/getUsersWithRole'

const usersId: string[] = []
let moreThan3users = true

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMembers,
	],
})

client.once(Events.ClientReady, async (client) => {
	console.log(`Discord bot is ready, ${client.user.tag}`)
	const { data: assignments, error } = await supabase.from('gay_role_assignments').select('*')

	if (assignments) {
		for (const { user_id, guild_id, assigned_at } of assignments) {
			await scheduleRemoval(client, user_id, guild_id, new Date(assigned_at).getTime())
		}
	} else {
		console.error('Error loading assignments:', error)
	}

	await getUsersWithRole(client, 'GAY OF THE DAY')
})

client.on(Events.GuildCreate, async (guild) => {
	await deployCommands({ guildId: guild.id })
	await guild.roles.create({
		color: 'Red',
		name: 'GAY OF THE DAY',
		permissions: ['ViewChannel', 'SendMessages'],
		mentionable: true,
		reason: 'You were the last person to leave the voice channel.',
	})
})

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
	const user = newState.member?.user
	if (!user) return

	if (!oldState.channel && newState.channel) {
		if (!usersId.some((id) => id === user.id)) {
			usersId.push(user.id)
		}
		if (usersId.length >= 3) moreThan3users = true
	} else if (oldState.channel && !newState.channel) {
		const indexToDelete = usersId.findIndex((v) => v === user.id)
		if (usersId.length > 1) {
			if (indexToDelete !== -1) usersId.splice(indexToDelete, 1)
		} else {
			if (moreThan3users && usersId.length === 1) {
				updateGayOfTheDayRole(newState.guild, usersId[0])
				// moreThan3users = false
			}
			if (indexToDelete !== -1) usersId.splice(indexToDelete, 1)
		}
	}
})

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return

	if (interaction.commandName === 'ping') {
		await interaction.reply('🏓 Pong!')
	}
})

client.login(config.DISCORD_TOKEN)
