# Tag Passport bot

A Discord bot for ticking off the tags in the 2026 Tag Passport, with a server leaderboard.

## What it does

- `/passport` opens your passport. Only you can see it. Tap a tag button to tick it, tap again to untick. Ticked tags turn green.
- `/passport member:@someone` shows someone else's passport, read only.
- `/leaderboard` posts the top 25 singers in the channel. Ties go to whoever got there first.
- When someone ticks all 12, the bot posts a trophy message in the channel.

The tag list lives in `tags.js`. Edit it if you want to add or rename tags.

## Setup

You need Node.js 18 or newer.

1. Go to https://discord.com/developers/applications and click **New Application**. Name it something like "Tag Passport".
2. Open the **Bot** tab and click **Reset Token**. Copy the token and keep it secret.
3. Open **OAuth2 > URL Generator**. Tick `bot` and `applications.commands`. Under bot permissions tick `Send Messages` and `Embed Links`. Open the URL it gives you and add the bot to your server.
4. In Discord, turn on Developer Mode (User Settings > Advanced). Right-click your server icon and click **Copy Server ID**.
5. In this folder:

   ```
   npm install
   cp .env.example .env
   ```

   Open `.env` and paste in your token and server ID.

6. Start it:

   ```
   npm start
   ```

   You should see `Logged in as ...`. The slash commands appear in your server straight away.

## Running it on a Linux server (Ubuntu or Debian)

SSH in and paste:

```
curl -fsSL https://raw.githubusercontent.com/elfsmelf/tag-passport-bot/main/setup.sh | bash
```

It installs Node and pm2 if they're missing, downloads the code, asks for your bot token and server ID, and starts the bot so it survives crashes and reboots. Run the same line again any time to update to the latest code. Your token and server ID are kept.

## Keeping it running

The bot only works while `npm start` is running. Leaving it on your own computer is fine for a weekend festival. For something always on, use a small host like Railway, Fly.io or a cheap VPS.

Ticks save to `data.json`. Some hosts wipe files on every redeploy, so if you use one of those, attach a persistent volume and set `DATA_FILE` in `.env` to a path on it (for example `/data/data.json`).
