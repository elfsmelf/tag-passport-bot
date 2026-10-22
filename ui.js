// Builds the messages the bot sends: the passport card, its buttons, and the leaderboard.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const TAGS = require('./tags');

const COLOUR = 0x1f3a68; // passport navy
const BUTTONS_PER_ROW = 4; // Discord allows up to 5 per row and 5 rows

function countDone(ticks) {
  return TAGS.filter((tag) => ticks[tag.id]).length;
}

function passportEmbed(name, ticks) {
  const lines = TAGS.map((tag) => {
    const box = ticks[tag.id] ? '✅' : '⬜';
    const number = tag.goodTags ? ` · Good Tags #${tag.goodTags}` : '';
    const note = tag.note ? `\n　*${tag.note}*` : '';
    return `${box} **${tag.name}**${number}${note}`;
  });

  return new EmbedBuilder()
    .setColor(COLOUR)
    .setTitle(`🛂 ${name}'s Tag Passport`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `${countDone(ticks)} of ${TAGS.length} stamped · tap a tag to tick or untick it` });
}

function passportButtons(ticks) {
  const rows = [];
  for (let i = 0; i < TAGS.length; i += BUTTONS_PER_ROW) {
    const row = new ActionRowBuilder();
    for (const tag of TAGS.slice(i, i + BUTTONS_PER_ROW)) {
      const done = Boolean(ticks[tag.id]);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`tag:${tag.id}`)
          .setLabel(tag.name)
          .setEmoji(done ? '✅' : '🎵')
          .setStyle(done ? ButtonStyle.Success : ButtonStyle.Secondary),
      );
    }
    rows.push(row);
  }
  return rows;
}

function leaderboardEmbed(rows) {
  const medals = ['🥇', '🥈', '🥉'];
  const top = rows.slice(0, 25);

  const description = top.length
    ? top
        .map((row, i) => {
          const place = medals[i] ?? `**${i + 1}.**`;
          const trophy = row.count === TAGS.length ? ' 🏆' : '';
          return `${place} <@${row.userId}> · ${row.count}/${TAGS.length}${trophy}`;
        })
        .join('\n')
    : 'Nobody has stamped a tag yet. Run `/passport` to get started.';

  return new EmbedBuilder()
    .setColor(COLOUR)
    .setTitle('🎶 Tag Passport leaderboard')
    .setDescription(description)
    .setFooter({ text: rows.length > 25 ? `Showing top 25 of ${rows.length} singers` : `${rows.length} singer(s) on the board` });
}

module.exports = { passportEmbed, passportButtons, leaderboardEmbed, countDone };
