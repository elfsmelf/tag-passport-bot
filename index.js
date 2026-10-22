require('dotenv').config();
const {
  Client, Events, GatewayIntentBits, MessageFlags, REST, Routes, SlashCommandBuilder,
} = require('discord.js');
const TAGS = require('./tags');
const store = require('./store');
const ui = require('./ui');

const { DISCORD_TOKEN, GUILD_ID } = process.env;
if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const TAG_IDS = new Set(TAGS.map((tag) => tag.id));

const commands = [
  new SlashCommandBuilder()
    .setName('passport')
    .setDescription('Open your Tag Passport and tick off the tags you have sung')
    .addUserOption((option) =>
      option.setName('member').setDescription("Look at someone else's passport instead")),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('See who has sung the most passport tags'),
].map((command) => command.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Server nickname if they have one, otherwise their Discord name.
function nameOf(member, user) {
  return member?.displayName ?? member?.nick ?? user.globalName ?? user.username;
}

client.once(Events.ClientReady, async (ready) => {
  const rest = new REST().setToken(DISCORD_TOKEN);
  if (GUILD_ID) {
    // Server commands show up straight away.
    await rest.put(Routes.applicationGuildCommands(ready.user.id, GUILD_ID), { body: commands });
    console.log(`Logged in as ${ready.user.tag}. Commands registered on server ${GUILD_ID}.`);
  } else {
    // Global commands work in every server but can take up to an hour to appear.
    await rest.put(Routes.applicationCommands(ready.user.id), { body: commands });
    console.log(`Logged in as ${ready.user.tag}. Commands registered globally.`);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.inGuild()) {
      if (interaction.isRepliable()) {
        await interaction.reply({ content: 'Use me inside the server.', flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // /passport
    if (interaction.isChatInputCommand() && interaction.commandName === 'passport') {
      const target = interaction.options.getUser('member') ?? interaction.user;
      const isMine = target.id === interaction.user.id;
      const member = isMine ? interaction.member : interaction.options.getMember('member');
      const ticks = store.getTicks(interaction.guildId, target.id);

      await interaction.reply({
        embeds: [ui.passportEmbed(nameOf(member, target), ticks)],
        // Only your own passport gets buttons, so nobody can tick tags for someone else.
        components: isMine ? ui.passportButtons(ticks) : [],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // /leaderboard (posted publicly so everyone sees it)
    if (interaction.isChatInputCommand() && interaction.commandName === 'leaderboard') {
      const rows = store.leaderboard(interaction.guildId, TAG_IDS);
      await interaction.reply({ embeds: [ui.leaderboardEmbed(rows)], allowedMentions: { parse: [] } });
      return;
    }

    // A tag button on someone's passport
    if (interaction.isButton() && interaction.customId.startsWith('tag:')) {
      const tagId = interaction.customId.slice('tag:'.length);
      if (!TAG_IDS.has(tagId)) {
        await interaction.reply({ content: 'That tag is no longer in the passport.', flags: MessageFlags.Ephemeral });
        return;
      }

      const nowTicked = store.toggle(interaction.guildId, interaction.user.id, tagId);
      const ticks = store.getTicks(interaction.guildId, interaction.user.id);

      await interaction.update({
        embeds: [ui.passportEmbed(nameOf(interaction.member, interaction.user), ticks)],
        components: ui.passportButtons(ticks),
      });

      // Shout about it in the channel when someone fills the whole passport.
      if (nowTicked && ui.countDone(ticks) === TAGS.length) {
        await interaction.followUp({
          content: `🏆 <@${interaction.user.id}> has stamped every tag in the Tag Passport!`,
        });
      }
    }
  } catch (err) {
    console.error(err);
    const reply = { content: 'Something went wrong. Try again in a moment.', flags: MessageFlags.Ephemeral };
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
