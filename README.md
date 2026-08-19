# Veel Tips Bot

A Discord bot that generates UGC creator tips using Gemini's free API.

- `/tip` — an on-demand creator tip (only in the creator-tips channel)
- `/ask <query> <role>` — a tailored answer, tuned for a creator or a brand
- `/trivia` — a multiple-choice creator trivia round with buttons (quick-games channel)
- Posts a fresh tip every **Monday at 10:00 AM** (Asia/Kathmandu) to your tips channel

It runs on AWS Lambda with no always-on server, which keeps it inside the perpetual free tier.

---

## How it works

Discord delivers slash commands two ways: over a persistent gateway WebSocket, or as plain
HTTPS requests to an endpoint you own. This bot uses the second, so there is no process to
keep running.

```
Discord  ──POST──>  API Gateway  ──>  InteractionFunction
                                          │  verifies signature
                                          │  enforces channel rules
                                          │  acknowledges in <3s
                                          └──async──>  WorkerFunction
                                                          │  calls Gemini
                                                          └──>  edits the reply

EventBridge Scheduler  ──Mondays 10:00──>  WeeklyFunction  ──>  posts to channel
```

The split exists because Discord drops any interaction not answered within **3 seconds**, and
Gemini needs longer. `InteractionFunction` replies immediately with a "thinking..." placeholder,
then `WorkerFunction` fills in the real answer using the interaction token.

Channel restrictions are enforced in `InteractionFunction`, before the hand-off, so a command
run in the wrong channel is refused instantly and never costs a Gemini call.

| File | Role |
|---|---|
| [src/interaction.js](src/interaction.js) | Signature check, channel rules, fast ack, hand-off |
| [src/worker.js](src/worker.js) | Gemini call, edits the deferred reply |
| [src/weekly.js](src/weekly.js) | Scheduled Monday post |
| [src/lib/discord.js](src/lib/discord.js) | Signature verification, embeds, REST calls |
| [src/lib/messages.js](src/lib/messages.js) | Friendly failure messages |
| [src/trivia.js](src/trivia.js) | Trivia question bank |
| [src/generateTip.js](src/generateTip.js) | Prompts and Gemini wiring |
| [template.yaml](template.yaml) | All AWS infrastructure |

---

## 1. Prerequisites

- [Node.js](https://nodejs.org) LTS — `node --version`
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) — `brew install aws-sam-cli`
- AWS credentials — `aws sts get-caller-identity --profile <name>` should show the account you intend

## 2. Collect your values

| Value | Where to get it |
|---|---|
| Bot token | Developer Portal → your app → **Bot** → Reset Token |
| Public key | Developer Portal → your app → **General Information** → Public Key |
| Application ID | Developer Portal → your app → **General Information** → Application ID |
| Tips channel ID | Right-click the channel the Monday post goes to → **Copy Channel ID** |
| Creator-tips channel ID | Right-click the channel where `/tip` and `/ask` are allowed → **Copy Channel ID** |
| Quick-games channel ID | Right-click the channel where `/trivia` is allowed → **Copy Channel ID** |
| Gemini API key | [Google AI Studio](https://aistudio.google.com) → Get API key |

Developer Mode must be on to copy channel IDs (Settings → Advanced).

## 3. Deploy

```
sam build
sam deploy --guided --profile <your-aws-profile>
```

Use `--guided` if you have not supplied `CreatorTipsChannelId` and `QuickGamesChannelId` before —
a plain `sam deploy` fails when a parameter has no saved value. Answer **yes** to saving your choices.

Two prompts worth reading:

- *"InteractionFunction has no authentication. Is this okay?"* → **yes**. The endpoint must be
  publicly reachable for Discord to call it. It is protected by Ed25519 signature verification,
  not by IAM.
- Region → `ap-south-1` (Mumbai) is closest to Nepal.

When it finishes it prints an **InteractionsEndpointUrl**. Copy it.

## 4. Point Discord at your endpoint

Developer Portal → **General Information** → **Interactions Endpoint URL**, paste and save.

Discord immediately sends a test request with a deliberately invalid signature and expects a
`401` back. If it saves without complaint, verification works. If it rejects the URL, the usual
cause is a wrong `DiscordPublicKey`.

## 5. Register the slash commands

```
cp env.example .env     # fill in DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm install
npm run deploy-commands
```

Expect `Successfully registered /tip and /ask commands.`

## 6. Test

Run `/tip` in your creator-tips channel — "thinking..." for a few seconds, then the tip. Run it
in any other channel and it should refuse immediately.

Test the weekly post without waiting for Monday:

```
aws lambda invoke --function-name veel-tips-bot-weekly /dev/stdout --profile <your-aws-profile>
```

---

## Cost

Effectively **$0/month**. At ~100 commands a day you use well under 1% of Lambda's perpetual free
tier (1M requests, 400,000 GB-seconds). Compute becomes billable north of ~300,000 commands a
month. API Gateway is the one component whose free tier expires after 12 months; past that it is
roughly $0.003/month at this volume.

Guardrails already in the template: API Gateway throttling at 10 req/s, and log groups that
expire after 14 days. Worth adding yourself: an **AWS Budget alert at $1**.

## Customizing

- **Schedule / timezone:** `WeeklySchedule` and `ScheduleTimezone` in [template.yaml](template.yaml).
  EventBridge cron is `cron(min hour day-of-month month day-of-week year)`, so
  `cron(0 18 ? * SUN *)` is Sundays at 6 PM. Redeploy to apply.
- **Which channels commands work in:** `CreatorTipsChannelId` parameter, consumed by
  `REQUIRED_CHANNEL` in [src/interaction.js](src/interaction.js).
- **Tip topics and tone:** `TIP_ANGLES` and the prompts in [src/generateTip.js](src/generateTip.js).
- **Failure messages:** [src/lib/messages.js](src/lib/messages.js).

## Logs

```
sam logs --stack-name <your-stack-name> --tail
```

| Symptom | Likely cause |
|---|---|
| Discord won't save the endpoint URL | Wrong `DiscordPublicKey` |
| "The application did not respond" | `InteractionFunction` erroring — check its logs |
| Spinner never resolves | `WorkerFunction` failing, often a bad `GeminiApiKey` |
| Command refused in the right channel | `CreatorTipsChannelId` does not match the real channel |
| Weekly post never arrives | Wrong `TipsChannelId`, or the bot lacks Send Messages there |

## Known gaps

**`/trivia` has no timer.** The always-on version edited the message after 60 seconds via
`setTimeout`. Lambda freezes the container once a handler returns, so that timer cannot survive.
The buttons instead stay live until someone answers, at which point the round is revealed and
disabled. Everything else about the game is stateless: the correct answer is encoded in each
button's `custom_id`, and the labels are read back off the message Discord sends with the button
press, so no database is involved.

**Root [index.js](index.js) still cannot load.** It imports `./trivia`, and the question bank
lives at [src/trivia.js](src/trivia.js) because only `src/` is packaged for Lambda. This does not
affect the deployed bot.

**`src/generateTip.js` is a copy of the root `generateTip.js`.** Only `src/` is packaged into the
Lambda bundle. Edits to one do not reach the other. Consolidate once you decide whether
[index.js](index.js) is being retired.

**[index.js](index.js) is the old always-on entrypoint.** Nothing in the deployed bot uses it.
