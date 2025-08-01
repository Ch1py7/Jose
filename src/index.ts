import { AuditLogEvent, Client, Events, GatewayIntentBits } from 'discord.js'
import { commands } from './commands'
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
		.single()

	if (interaction.commandName === 'ping') {
		await commands.ping.execute(interaction)
	} else if (interaction.commandName === 'time') {
		if (assignments) {
			const removingAt = new Date(assignments.assigned_at).getTime() + DAY
			const remainingTime = getRemainingTime(removingAt)
			await commands.time.execute(interaction, remainingTime)
		} else {
			await interaction.reply('No gay role assigned yet!')
		}
	} else if (interaction.commandName === 'gay') {
		if (guildId === '1171702986980982816') {
			await commands.actualGay.execute(interaction, '318847124093534208')
		} else {
			if (assignments) {
				await commands.actualGay.execute(interaction, assignments.user_id)
			} else {
				await interaction.reply('No gay role assigned yet!')
			}
		}
	}
})

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
	const clientId = client.user?.id
	if (!clientId) return
	const guild = newMember.guild
	const gayRole = guild.roles.cache.find((role) => role.name === 'GAY OF THE DAY')
	if (!gayRole) return

	const hadRole = oldMember.roles.cache.has(gayRole.id)
	const hasRole = newMember.roles.cache.has(gayRole.id)

	if (hadRole === hasRole) return

	const auditLogs = await guild.fetchAuditLogs({
		limit: 1,
		type: AuditLogEvent.MemberRoleUpdate,
	})

	const entry = auditLogs.entries.first()
	if (entry && entry.executor?.id === clientId) return

	const { data: assignment, error } = await supabase
		.from('gay_role_assignments')
		.select('user_id')
		.eq('guild_id', guild.id)
		.single()

	if (!assignment || error) return

	const realUserId = assignment.user_id
	const realMember = await guild.members.fetch(realUserId)
	if (!realMember) return

	for (const member of guild.members.cache.values()) {
		if (member.roles.cache.has(gayRole.id) && member.id !== realUserId) {
			await member.roles.remove(gayRole)
		}
	}
	if (!realMember.roles.cache.has(gayRole.id)) {
		await realMember.roles.add(gayRole)
	}
})

client.login(config.DISCORD_TOKEN)
