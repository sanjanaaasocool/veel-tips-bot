# Veel Tips Bot

A Discord bot that generates UGC creator tips using Gemini's free API.
- `/tip` — anyone can run this for an on-demand tip (1-minute cooldown per user)
- Automatically posts a fresh tip every **Monday at 10:00 AM** to your chosen channel

---

## 1. Install Node.js

If you don't already have it: download from [nodejs.org](https://nodejs.org) (LTS version), install it, then confirm it worked by running this in a terminal:

```
node --version
```

## 2. Install the project dependencies

Open a terminal, navigate into this folder, and run:

```
npm install
```

This downloads discord.js, the Gemini SDK, dotenv, and node-cron.

## 3. Fill in your secrets

1. Rename `.env.example` to `.env`
2. Open it and fill in each value:

| Variable | Where to get it |
|---|---|
| `DISCORD_TOKEN` | Discord Developer Portal → Your App → **Bot** → Reset Token |
| `CLIENT_ID` | Discord Developer Portal → Your App → **General Information** → Application ID |
| `GUILD_ID` | In Discord: enable Developer Mode (Settings → Advanced), then right-click your server icon → **Copy Server ID** |
| `TIPS_CHANNEL_ID` | Right-click your `#-creator-tips` channel → **Copy Channel ID** |
| `GEMINI_API_KEY` | Google AI Studio → Get API key |

**Never share your `.env` file or upload it anywhere public.**

## 4. Register the /tip command

Run this once (and again anytime you change the command itself):

```
npm run deploy-commands
```

You should see "Successfully registered /tip command."

## 5. Start the bot

```
npm start
```

If everything's set up right, you'll see `Logged in as Veel Tips Bot#XXXX` in the terminal, and the bot will show as **online** in your server. Try typing `/tip` in any channel it has access to.

Leave this terminal window open — the bot only runs while this process is running. Closing the terminal stops the bot.

## 6. Keep it running 24/7 (so the Monday post actually fires)

Running it on your own laptop only works while your laptop is on and the terminal is open. For it to run continuously, deploy it to a free/cheap host:

- **Railway** (railway.app) — easiest, has a free tier, just connect your GitHub repo
- **Render** (render.com) — similar, free tier for background workers

When deploying, add the same 5 variables from your `.env` file into the host's "Environment Variables" settings — don't upload the `.env` file itself.

## Customizing

- **Change the Monday post time:** edit the cron line in `index.js` — `'0 10 * * 1'` (minute, hour, day-of-month, month, day-of-week). E.g. `'0 18 * * 0'` = Sundays at 6 PM.
- **Change the cooldown:** edit `COOLDOWN_MS` in `index.js`.
- **Change tip topics/tone:** edit `TIP_ANGLES` and the `prompt` text in `generateTip.js`.
- **Change embed color:** edit the hex value in `buildTipEmbed()` in `index.js` (currently Veel purple `#6C5CE7`).
