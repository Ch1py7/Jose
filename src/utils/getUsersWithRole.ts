import type { Client } from 'discord.js'
import { ROLE_NAME } from './constants'

export const getUsersWithRole = async (client: Client, roleName = ROLE_NAME): Promise<void> => {
	for (const [guildId, guild] of client.guilds.cache) {
		try {
			const fullGuild = await client.guilds.fetch(guildId)
			const members = await fullGuild.members.fetch()
			const role = fullGuild.roles.cache.find((r) => r.name === roleName)
			if (!role) continue

			const membersWithRole = members.filter((member) => member.roles.cache.has(role.id))

			membersWithRole.forEach((member) =>
				console.log(`- ${member.user.tag} has the "${roleName}" role in "${fullGuild.name}" server`)
			)
		} catch (err) {
			console.error(`Error fetching members for guild ${guildId}:`, err)
		}
	}
}
