import {
  AuditLogEvent,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
} from "discord.js";
import { commands } from "./commands";
import {
  scheduleRemoval,
  updateGayOfTheDayRole,
} from "./commands/updateGayOfTheDayRole";
import { config } from "./config";
import { deployCommands } from "./deployCommands";
import { supabase } from "./supabase/client";
import { DAY, MIN_USERS } from "./utils/constants";
import { getRemainingTime } from "./utils/getRemainingTime";
import { getUsersWithRole } from "./utils/getUsersWithRole";

const gayModeActivated: Record<string, boolean> = {};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
});

client.once(Events.ClientReady, async (client) => {
  console.log(`Discord bot is ready, ${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.type === ChannelType.GuildVoice) {
        if (channel.members.size >= MIN_USERS) {
          console.log(
            `Already active in "${guild.name}" inside of "${channel.name}"`
          );
          gayModeActivated[guild.id] = true;
        } else {
          gayModeActivated[guild.id] = false;
        }
      }
    }
    await deployCommands({ guildId: guild.id });
  }

  const { data: assignments, error } = await supabase
    .from("gay_role_assignments")
    .select("*");

  if (assignments) {
    for (const { user_id, guild_id, assigned_at } of assignments) {
      await scheduleRemoval(
        client,
        user_id,
        guild_id,
        new Date(assigned_at).getTime()
      );
    }
  } else {
    console.error("Error loading assignments:", error);
  }

  await getUsersWithRole(client, "GAY OF THE DAY");
});

client.on(Events.GuildCreate, async (guild) => {
  await deployCommands({ guildId: guild.id });
  await guild.roles.create({
    color: "Red",
    name: "GAY OF THE DAY",
    permissions: ["ViewChannel", "SendMessages"],
    mentionable: true,
    reason: "You were the last person to leave the voice channel.",
  });
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const user = newState.member?.user || oldState.member?.user;
  if (!user || user.bot) return;

  const guild = oldState.guild;
  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  if (!oldChannel && newChannel) {
    const members = [...newChannel.members.values()].filter((m) => !m.user.bot);
    if (members.length >= MIN_USERS) {
      gayModeActivated[guild.id] = true;
    }
    console.log("new members:", members.length, gayModeActivated[guild.id]);
  } else if (!newChannel && oldChannel) {
    const members = [...oldChannel.members.values()].filter((m) => !m.user.bot);
    if (members.length >= MIN_USERS) {
      gayModeActivated[guild.id] = true;
    }
    console.log("exit members:", members.length, gayModeActivated[guild.id]);

    if (members.length === 1 && gayModeActivated[guild.id]) {
      await updateGayOfTheDayRole(guild, members[0].id);
      gayModeActivated[guild.id] = false;
    }
  } else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    const oldMembers = [...oldChannel.members.values()].filter(
      (m) => !m.user.bot
    );
    const newMembers = [...newChannel.members.values()].filter(
      (m) => !m.user.bot
    );
    if (oldMembers.length >= MIN_USERS || newMembers.length >= MIN_USERS) {
      gayModeActivated[guild.id] = true;
    }
    console.log(
      "old change members:",
      oldMembers.length,
      gayModeActivated[guild.id]
    );
    console.log(
      "new change members:",
      newMembers.length,
      gayModeActivated[guild.id]
    );
    if (oldMembers.length === 1 && gayModeActivated[guild.id]) {
      await updateGayOfTheDayRole(guild, oldMembers[0].id);
      gayModeActivated[guild.id] = false;
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) {
    return await interaction.reply({
      content: "This command must be used in a server.",
    });
  }

  const guildId = interaction.guild.id;

  const { data: assignments } = await supabase
    .from("gay_role_assignments")
    .select("*")
    .eq("guild_id", guildId)
    .eq("isGay", true)
    .single();

  switch (interaction.commandName) {
    case "ping":
      await commands.ping.execute(interaction);
      break;
    case "time":
      if (assignments) {
        const removingAt = new Date(assignments.assigned_at).getTime() + DAY;
        const remainingTime = getRemainingTime(removingAt);
        await commands.time.execute(interaction, remainingTime);
      } else {
        await interaction.reply("No gay role assigned yet!");
      }
      break;
    case "gay":
      if (guildId === "1171702986980982816") {
        await commands.actualGay.execute(interaction, "318847124093534208");
      } else if (assignments) {
        await commands.actualGay.execute(interaction, assignments.user_id);
      } else {
        await interaction.reply("No gay role assigned yet!");
      }
      break;
    case "status":
      await commands.status.execute(interaction, gayModeActivated[guildId]);
      break;
    case "list":
      const eligibleMembmers = [];
      for (const channel of interaction.guild.channels.cache.values()) {
        if (channel.type === ChannelType.GuildVoice) {
          if (channel.members.size >= 1) {
            for (const member of channel.members.values()) {
              eligibleMembmers.push(member.user.id);
            }
          }
        }
      }
      await commands.list.execute(interaction, eligibleMembmers);
      break;
    case "count":
      await commands.count.execute(interaction, guildId);
      break;
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const clientId = client.user?.id;
  if (!clientId) return;

  const guild = newMember.guild;
  const gayRole = guild.roles.cache.find(
    (role) => role.name === "GAY OF THE DAY"
  );
  if (!gayRole) return;

  const hadRole = oldMember.roles.cache.has(gayRole.id);
  const hasRole = newMember.roles.cache.has(gayRole.id);

  if (hadRole === hasRole) return;

  const auditLogs = await guild.fetchAuditLogs({
    limit: 1,
    type: AuditLogEvent.MemberRoleUpdate,
  });
  const entry = auditLogs.entries.first();
  if (entry && entry.executor?.id === clientId) return;

  const { data: assignment, error } = await supabase
    .from("gay_role_assignments")
    .select("user_id")
    .eq("guild_id", guild.id)
    .single();

  if (!assignment || error) return;

  const realUserId = assignment.user_id;
  const realMember = await guild.members.fetch(realUserId);
  if (!realMember) return;

  for (const member of guild.members.cache.values()) {
    if (member.roles.cache.has(gayRole.id) && member.id !== realUserId) {
      await member.roles.remove(gayRole);
    }
  }
  if (!realMember.roles.cache.has(gayRole.id)) {
    await realMember.roles.add(gayRole);
  }
});

client.login(config.DISCORD_TOKEN);
