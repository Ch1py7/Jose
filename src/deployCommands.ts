import { REST, Routes } from 'discord.js'
import { commands } from './commands'
import { config } from './config'

const commandsData = Object.values(commands).map((command) => command.data)

const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN)

type DeployCommandsProps = {
	guildId: string
}

export async function deployCommands({ guildId }: DeployCommandsProps) {
	try {
		await rest.put(Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId), {
			body: commandsData,
		})
	} catch (error) {
		console.error(error)
	}
}
