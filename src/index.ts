import { Client, Events, GatewayIntentBits } from 'discord.js'
import { scheduleRemoval, updateGayOfTheDayRole } from './commands/updateGayOfTheDayRole'
import { config } from './config'
import { deployCommands } from './deployCommands'
import { supabase } from './supabase/client'
import { DAY } from './utils/constants'
import { getRemainingTime } from './utils/getRemainingTime'
import { getUsersWithRole } from './utils/getUsersWithRole'

const guilds = new Map<string, { usersId: string[]; moreThan3: boolean }>()

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

	for (const guild of client.guilds.cache.values()) {
		await deployCommands({ guildId: guild.id })
	}

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
	guilds.set(guild.id, { usersId: [], moreThan3: false })
})

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
	const user = newState.member?.user
	const guildId = oldState.guild.id

	if (!user) return

	if (!guilds.has(guildId)) {
		guilds.set(guildId, { usersId: [], moreThan3: false })
	}

	const guildState = guilds.get(guildId)!
	const usersId = [...guildState.usersId]
	let moreThan3 = guildState.moreThan3

	if (!oldState.channel && newState.channel) {
		if (!usersId.includes(user.id)) {
			usersId.push(user.id)
		}
		if (usersId.length >= 3) {
			moreThan3 = true
		}
		guilds.set(guildId, { usersId, moreThan3 })
	} else if (oldState.channel && !newState.channel) {
		const index = usersId.indexOf(user.id)
		if (usersId.length > 1 && index !== -1) {
			usersId.splice(index, 1)
		} else {
			if (moreThan3 && usersId.length === 1) {
				await updateGayOfTheDayRole(newState.guild, usersId[0])
				moreThan3 = false
			}
			if (index !== -1) usersId.splice(index, 1)
			guilds.set(guildId, { usersId, moreThan3 })
		}
	}
})

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return
	if (!interaction.guild) {
		return await interaction.reply({
			content: 'This command must be used in a server.',
		})
	}
	const guildId = interaction.guild.id

	const { data: assignments } = await supabase
		.from('gay_role_assignments')
		.select('*')
		.eq('guild_id', guildId)

	if (interaction.commandName === 'ping') {
		await interaction.reply('🏓 Pong!')
	} else if (interaction.commandName === 'time') {
		if (assignments && assignments.length > 0) {
			const removingAt = new Date(assignments[0].assigned_at).getTime() + DAY
			const remainingTime = getRemainingTime(removingAt)
			await interaction.reply(`The remaining gay time is: ${remainingTime}`)
		} else {
			await interaction.reply('No gay role assigned yet!')
		}
	}
})

client.login(config.DISCORD_TOKEN)
