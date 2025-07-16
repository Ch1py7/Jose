import type { Collection, Guild, GuildBasedChannel, GuildMember, User } from 'discord.js'
import { updateGayOfTheDayRole } from './commands/updateGayOfTheDayRole'

const minUsers = 3

export class Guilds {
	private _guilds = new Map<
		string,
		Map<string, { usersId: string[]; moreThan3: boolean; name: string }>
	>()

	public get(guildId: string) {
		return this._guilds.get(guildId)
	}

	public addGuild(id: string) {
		if (!this._guilds.has(id)) {
			this._guilds.set(id, new Map())
		}
	}

	public addChannelToGuild(guildId: string, channel: GuildBasedChannel) {
		const channelMap = this._guilds.get(guildId) ?? new Map()
		if (!channelMap.has(channel.id)) {
			channelMap.set(channel.id, {
				usersId: [],
				moreThan3: false,
				name: channel.name,
			})
		}
		this._guilds.set(guildId, channelMap)

		return this
	}

	public addUsersToChannel(guildId: string, channel: GuildBasedChannel) {
		const channelMap = this._guilds.get(guildId)
		if (!channelMap) return this

		const usersId: string[] = []
		for (const [_, member] of channel.members as Collection<string, GuildMember>) {
			if (!member.user.bot) {
				usersId.push(member.id)
			}
		}

		channelMap.set(channel.id, {
			usersId,
			name: channel.name,
			moreThan3: usersId.length >= minUsers,
		})

		return this
	}

	public addUserToChannel(guildId: string, channelId: string, user: User) {
		const channelMap = this._guilds.get(guildId)
		if (!channelMap) return this

		const channel = channelMap.get(channelId)
		if (!channel) return this

		const usersId = [...channel.usersId]
		if (!usersId.includes(user.id) && !user.bot) {
			usersId.push(user.id)
		}

		channelMap.set(channelId, {
			usersId,
			name: channel.name,
			moreThan3: usersId.length >= minUsers,
		})

		return this
	}

	public async removeUserFromChannel(guild: Guild, channelId: string, user: User) {
		const channelMap = this._guilds.get(guild.id)
		if (!channelMap) return this

		const channel = channelMap.get(channelId)
		if (!channel) return this

		const usersId = [...channel.usersId]
		const index = usersId.indexOf(user.id)
		if (index === -1) return this

		usersId.splice(index, 1)

		const actualChannel = guild.channels.cache.get(channelId) as GuildBasedChannel
		if (actualChannel && 'members' in actualChannel) {
			const actualMembers = Array.from((actualChannel.members as Collection<string, GuildMember>).values()).filter(member => !member.user.bot)
			
			if (channel.moreThan3 && actualMembers.length === 1) {
				await updateGayOfTheDayRole(guild, actualMembers[0].id)
			}
		}

		channelMap.set(channelId, {
			usersId,
			name: channel.name,
			moreThan3: channel.moreThan3 && usersId.length === 1 ? false : true,
		})

		if (usersId.length === 0) {
			this._removeChannelFromGuild(guild, channelId)
		}

		return this
	}

	private _removeChannelFromGuild(guild: Guild, channelId: string) {
		const channelMap = this._guilds.get(guild.id)
		if (!channelMap) return this

		channelMap.delete(channelId)

		return this
	}
}
