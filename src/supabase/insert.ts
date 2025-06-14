import { supabase } from './client'

export const insert = async (userId: string, guildId: string) => {
	await supabase.from('gay_role_assignments').insert([
		{
			user_id: userId,
			guild_id: guildId,
			assigned_at: new Date().toISOString(),
		},
	])
}
