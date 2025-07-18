import { supabase } from '@/supabase/client'
import { DAY } from '@/utils/constants'
import type { Client, Guild } from 'discord.js'

export const updateGayOfTheDayRole = async (guild: Guild, newUserId: string) => {
	const role = guild.roles.cache.find((r) => r.name === 'GAY OF THE DAY')
	if (!role) return

	const members = await guild.members.fetch()
	const membersWithRole = members.filter((m) => m.roles.cache.has(role.id))

	for (const [_, member] of membersWithRole) {
		if (member.id !== newUserId) {
			await member.roles.remove(role)
		}
	}

	const member = await guild.members.fetch(newUserId)
	if (member && role) {
		try {
			await member.roles.add(role)
			console.log(`- ${member.user.tag} has the "${role.name}" role in "${guild.name}" server`)
			const { data, error } = await supabase
				.from('gay_role_assignments')
				.select('*')
				.eq('guild_id', guild.id)

			if (!error) {
				data.forEach(async ({ id }) => {
					await supabase.from('gay_role_assignments').delete().eq('id', id)
				})
			}

			await supabase.from('gay_role_assignments').insert([
				{
					user_id: newUserId,
					guild_id: guild.id,
					assigned_at: new Date().toISOString(),
				},
			])
			await scheduleRemoval(guild.client, newUserId, guild.id)
		} catch (err) {
			console.error('Failed to add role:', err)
		}
	}
}

export const scheduleRemoval = async (
	client: Client,
	userId: string,
	guildId: string,
	assignedAt?: number
) => {
	const delay = (assignedAt ?? Date.now()) + DAY - Date.now()
	if (delay <= 0) {
		const guild = await client.guilds.fetch(guildId)
		const role = guild.roles.cache.find((r) => r.name === 'GAY OF THE DAY')
		const member = await guild.members.fetch(userId)
		if (role) await member.roles.remove(role)
		console.log(`Removed 'GAY OF THE DAY' role from ${member.user.tag}`)

		await supabase
			.from('gay_role_assignments')
			.delete()
			.eq('user_id', userId)
			.eq('guild_id', guildId)
	} else {
		setTimeout(async () => {
			try {
				const guild = await client.guilds.fetch(guildId)
				const role = guild.roles.cache.find((r) => r.name === 'GAY OF THE DAY')
				const member = await guild.members.fetch(userId)
				if (role) await member.roles.remove(role)
				console.log(`Removed 'GAY OF THE DAY' role from ${member.user.tag}`)

				await supabase
					.from('gay_role_assignments')
					.delete()
					.eq('user_id', userId)
					.eq('guild_id', guildId)
			} catch (err) {
				console.error('Error removing role after 24h:', err)
			}
		}, delay)
	}
}
