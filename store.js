// Saves everyone's ticks to a JSON file so they survive a restart.
// Shape: { [serverId]: { [userId]: { [tagId]: timeTickedInMs } } }
const fs = require('node:fs');
const path = require('node:path');

const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

let data = {};
try {
  data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err; // no file yet is fine, anything else is a real problem
}

function save() {
  // Write to a temp file first, then swap it in, so a crash mid-write can't corrupt the data.
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

function getTicks(guildId, userId) {
  return data[guildId]?.[userId] ?? {};
}

// Flips a tag on or off for one person. Returns true if it's now ticked.
function toggle(guildId, userId, tagId) {
  data[guildId] ??= {};
  const ticks = (data[guildId][userId] ??= {});
  if (ticks[tagId]) {
    delete ticks[tagId];
  } else {
    ticks[tagId] = Date.now();
  }
  save();
  return Boolean(ticks[tagId]);
}

// Everyone with at least one tick, most tags first.
// Ties go to whoever reached that number first.
function leaderboard(guildId, validTagIds) {
  const users = data[guildId] ?? {};
  return Object.entries(users)
    .map(([userId, ticks]) => {
      const times = Object.entries(ticks)
        .filter(([tagId]) => validTagIds.has(tagId))
        .map(([, time]) => time);
      return { userId, count: times.length, reachedAt: times.length ? Math.max(...times) : 0 };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.reachedAt - b.reachedAt);
}

module.exports = { getTicks, toggle, leaderboard };
