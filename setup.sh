#!/usr/bin/env bash
# One-step setup for the Tag Passport bot on an Ubuntu or Debian server.
#
#   curl -fsSL https://raw.githubusercontent.com/elfsmelf/tag-passport-bot/main/setup.sh | bash
#
# Safe to run again. A second run pulls the latest code and restarts the bot,
# and keeps your existing .env (token and server ID).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/tag-passport-bot}"
REPO="https://github.com/elfsmelf/tag-passport-bot.git"
NAME="tag-passport"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
as_root() { if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo -E "$@"; fi; }

# 1. Node.js 18 or newer, plus git
need_node=1
if command -v node >/dev/null 2>&1; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 18 ] && need_node=0
fi
if [ "$need_node" -eq 1 ]; then
  say "Installing Node.js 22"
  as_root apt-get update -y
  as_root apt-get install -y curl ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_22.x | as_root bash -
  as_root apt-get install -y nodejs
fi
if ! command -v git >/dev/null 2>&1; then
  say "Installing git"
  as_root apt-get install -y git
fi

# 2. Get the code, or update it if it's already here
if [ -d "$APP_DIR/.git" ]; then
  say "Updating the code"
  git -C "$APP_DIR" pull --ff-only
else
  say "Downloading the code"
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
npm install --omit=dev --no-audit --no-fund

# 3. Bot token and server ID (only asked for the first time)
if [ ! -f .env ] || grep -q 'paste-your-token-here' .env; then
  say "Bot details"
  TOKEN="${DISCORD_TOKEN:-}"
  GUILD="${GUILD_ID:-}"
  if [ -z "$TOKEN" ]; then
    printf 'Paste your bot token. It stays hidden while you paste, that is normal: '
    read -rs TOKEN < /dev/tty
    echo
  fi
  if [ -z "$GUILD" ]; then
    printf 'Paste your server ID: '
    read -r GUILD < /dev/tty
  fi
  TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')
  GUILD=$(printf '%s' "$GUILD" | tr -d '[:space:]')
  if [ -z "$TOKEN" ]; then echo "No token entered. Run the script again."; exit 1; fi
  echo "Got a token ${#TOKEN} characters long and server ID ${GUILD:-<none>}."
  printf 'DISCORD_TOKEN=%s\nGUILD_ID=%s\n' "$TOKEN" "$GUILD" > .env
  chmod 600 .env
else
  say "Keeping your existing .env"
fi

# 4. Run it with pm2, which restarts it after a crash or a reboot
if ! command -v pm2 >/dev/null 2>&1; then
  say "Installing pm2"
  as_root npm install -g pm2 --no-audit --no-fund
fi
say "Starting the bot"
pm2 delete "$NAME" >/dev/null 2>&1 || true
pm2 start index.js --name "$NAME"
pm2 save
if [ "$(id -u)" -eq 0 ]; then
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || echo "Couldn't set up start-on-boot. The bot is running now, but won't come back after a reboot."
else
  sudo env PATH="$PATH" "$(command -v pm2)" startup systemd -u "$USER" --hp "$HOME" >/dev/null 2>&1 || echo "Couldn't set up start-on-boot. The bot is running now, but won't come back after a reboot."
fi

say "Recent log lines"
sleep 5
pm2 logs "$NAME" --lines 15 --nostream || true
echo
echo "If you see 'Logged in as' above, you're done. Type /passport in your Discord server."
echo "To see the logs later: pm2 logs $NAME"
