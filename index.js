require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const { generateTip, askCreator } = require('./generateTip');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const COOLDOWN_MS = 60 * 1000;
const lastUsed = new Map();

function buildTipEmbed(tipText) {
  return new EmbedBuilder()
    .setColor(0x6c5ce7)
    .setTitle('🪄 Veel Creator Tip')
    .setDescription(tipText)
    .setFooter({ text: 'Veel Creators Community' });
}

function buildAskEmbed(query, answer) {
  return new EmbedBuilder()
    .setColor(0x00b894)
    .setTitle('💡 Veel Creator Answer')
    .addFields(
      { name: 'Your Question', value: query },
      { name: 'Answer', value: answer }
    )
    .setFooter({ text: 'Veel Creators Community' });
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  cron.schedule('0 10 * * 1', async () => {
    try {
      const channel = await client.channels.fetch(process.env.TIPS_CHANNEL_ID);
      const tipText = await generateTip();
      await channel.send({ embeds: [buildTipEmbed(tipText)] });
      console.log('Posted weekly Monday tip.');
    } catch (err) {
      console.error('Failed to post weekly tip:', err);
    }
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // ---- /tip ----
  if (interaction.commandName === 'tip') {
    const now = Date.now();
    const userLastUsed = lastUsed.get(interaction.user.id);
    if (userLastUsed && now - userLastUsed < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - (now - userLastUsed)) / 1000);
      await interaction.reply({
        content: `Hold up! You can grab another tip in ${secondsLeft}s.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const tipText = await generateTip();
      lastUsed.set(interaction.user.id, now);
      await interaction.editReply({ embeds: [buildTipEmbed(tipText)] });
    } catch (err) {
      console.error('Failed to generate tip:', err);
      await interaction.editReply('Sorry, something went wrong generating a tip. Try again in a bit!');
    }
    return;
  }

  // ---- /ask ----
  if (interaction.commandName === 'ask') {
    const now = Date.now();
    const userLastUsed = lastUsed.get(interaction.user.id);
    if (userLastUsed && now - userLastUsed < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - (now - userLastUsed)) / 1000);
      await interaction.reply({
        content: `Hold up! You can ask again in ${secondsLeft}s.`,
        ephemeral: true,
      });
      return;
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      const answer = await askCreator(query);
      lastUsed.set(interaction.user.id, now);
      await interaction.editReply({ embeds: [buildAskEmbed(query, answer)] });
    } catch (err) {
      console.error('Failed to generate answer:', err);
      await interaction.editReply('Sorry, something went wrong. Try again in a bit!');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
