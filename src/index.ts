import { Client, Events, GatewayIntentBits } from 'discord.js'
import { scheduleRemoval } from './commands/updateGayOfTheDayRole'
import { config } from './config'
import { deployCommands } from './deployCommands'
import { Guilds } from './guilds'
import { supabase } from './supabase/client'
import { DAY } from './utils/constants'
import { getRemainingTime } from './utils/getRemainingTime'
import { getUsersWithRole } from './utils/getUsersWithRole'

const guilds = new Guilds()

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
	],
})

client.once(Events.ClientReady, async (client) => {
	console.log(`Discord bot is ready, ${client.user.tag}`)

	for (const guild of client.guilds.cache.values()) {
		await deployCommands({ guildId: guild.id })

		guilds.addGuild(guild.id)

		const voiceChannels = guild.channels.cache.filter(
			(channel) => channel.isVoiceBased() && channel.members.size > 0
		)

		for (const [_, channel] of voiceChannels) {
			guilds.addChannelToGuild(guild.id, channel).addUsersToChannel(guild.id, channel)
		}
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
	guilds.addGuild(guild.id)
})

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
	const user = newState.member?.user
	const guild = oldState.guild

	if (!user) return

	guilds.addGuild(guild.id)

	if (!oldState.channelId && newState.channelId) {
		guilds
			.addChannelToGuild(guild.id, newState.channel!)
			.addUsersToChannel(guild.id, newState.channel!)
	} else if (oldState.channelId && !newState.channelId) {
		await guilds.removeUserFromChannel(guild, oldState.channelId, user)
	} else if (oldState.channelId && newState.channelId) {
		guilds
			.addChannelToGuild(guild.id, newState.channel!)
			.addUsersToChannel(guild.id, newState.channel!)
		await guilds.removeUserFromChannel(guild, oldState.channelId, user)
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
