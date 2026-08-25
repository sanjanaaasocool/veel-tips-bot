require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const cron = require('node-cron');
const { generateTip, askCreator } = require('./generateTip');
const { getRandomQuestion } = require('./trivia');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const TRIVIA_TIMEOUT_MS = 45 * 1000;
const activeTrivia = new Map(); // triviaId -> { question, correctLetter, channelId, answeredUsers }

const COOLDOWN_MS = 30 * 1000;
const lastUsed = new Map();

const API_HICCUP_MESSAGES = [
  '☕ Even bots need a coffee break sometimes. Retry in a moment!',
  '🙃 That tip got lost in the sauce. Try again! I promise I\'m usually smarter than this.',
  '🫠 Tips Bot has left the chat... involuntarily. Give it a sec!',
  '🛠️ Currently AWOL. Probably stuck in traffic between servers. Try again shortly!',
];

const BOT_DOWN_MESSAGES = [
  '🫠 Tips Bot has left the chat... involuntarily. Give it a sec!',
  '🛠️ Currently AWOL. Probably stuck in traffic between servers. Try again shortly!',
];

function pickMessage(messages, lastIndexRef) {
  let index = Math.floor(Math.random() * messages.length);
  while (index === lastIndexRef.value && messages.length > 1) {
    index = Math.floor(Math.random() * messages.length);
  }
  lastIndexRef.value = index;
  return messages[index];
}

const hiccupTracker = { value: -1 };
const downTracker = { value: -1 };

function getHiccupMessage() {
  return pickMessage(API_HICCUP_MESSAGES, hiccupTracker);
}

function getDownMessage() {
  return pickMessage(BOT_DOWN_MESSAGES, downTracker);
}

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


});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction);
    return;
  }

  if (interaction.isButton()) {
    await handleTriviaButton(interaction);
  }
});

async function handleCommand(interaction) {
  // ---- /tip ----
  if (interaction.commandName === 'tip') {
    if (interaction.channelId !== process.env.CREATOR_TIPS_CHANNEL_ID) {
      await interaction.reply({
        content: 'This command only works in <#' + process.env.CREATOR_TIPS_CHANNEL_ID + '>!',
        ephemeral: true,
      });
      return;
    }

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
      await interaction.editReply(getHiccupMessage());
    }
    return;
  }

  // ---- /ask ----
  if (interaction.commandName === 'ask') {
    if (interaction.channelId !== process.env.CREATOR_TIPS_CHANNEL_ID) {
      await interaction.reply({
        content: 'This command only works in <#' + process.env.CREATOR_TIPS_CHANNEL_ID + '>!',
        ephemeral: true,
      });
      return;
    }

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
      await interaction.editReply(getHiccupMessage());
    }
    return;
  }

  // ---- /trivia ----
  if (interaction.commandName === 'trivia') {
    if (interaction.channelId !== process.env.QUICK_GAMES_CHANNEL_ID) {
      await interaction.reply({
        content: 'This command only works in <#' + process.env.QUICK_GAMES_CHANNEL_ID + '>!',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const question = getRandomQuestion(interaction.channelId);
      const triviaId = Math.random().toString(36).slice(2, 10);

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🎯 Veel Trivia')
        .setDescription(
          `**${question.text}**\n\nPick an answer below. You've got **45 seconds**!`
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`trivia:${triviaId}:A`)
          .setLabel(question.options[0])
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`trivia:${triviaId}:B`)
          .setLabel(question.options[1])
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`trivia:${triviaId}:C`)
          .setLabel(question.options[2])
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });

      activeTrivia.set(triviaId, {
        question,
        correctLetter: question.correctLetter,
        channelId: interaction.channelId,
        answeredUsers: new Set(),
      });

      setTimeout(async () => {
        const active = activeTrivia.get(triviaId);
        if (!active) return;
        activeTrivia.delete(triviaId);

        try {
          await interaction.editReply({
            content: "🍿 Show's over for this round — /trivia to queue up the next one.",
            embeds: [],
            components: [],
          });
        } catch (err) {
          console.error('Failed to update trivia timeout:', err);
        }
      }, TRIVIA_TIMEOUT_MS);
    } catch (err) {
      console.error('Failed to show trivia:', err);
      await interaction.editReply(getHiccupMessage());
    }
  }
}

async function handleTriviaButton(interaction) {
  const customId = interaction.customId;
  if (!customId.startsWith('trivia:')) return;

  const [_, triviaId, answerLetter] = customId.split(':');
  const active = activeTrivia.get(triviaId);

  if (!active || active.channelId !== interaction.channelId) {
    await interaction.reply({
      content: 'This trivia already ended. Run /trivia to start a new one!',
      ephemeral: true,
    });
    return;
  }

  if (active.answeredUsers.has(interaction.user.id)) {
    await interaction.reply({
      content: 'You already answered this one. Wait for the next round!',
      ephemeral: true,
    });
    return;
  }
  active.answeredUsers.add(interaction.user.id);

  const isCorrect = answerLetter === active.correctLetter;
  const { question: q } = active;
  const correctIndex = q.correctIndex;
  const correctText = q.options[correctIndex];
  const letters = ['A', 'B', 'C'];

  const revealRow = new ActionRowBuilder().addComponents(
    q.options.map((opt, i) => {
      let style = ButtonStyle.Danger;
      if (i === correctIndex) style = ButtonStyle.Success;
      return new ButtonBuilder()
        .setCustomId(`trivia:${triviaId}:${letters[i]}`)
        .setLabel(opt)
        .setStyle(style)
        .setDisabled(true);
    })
  );

  try {
    await interaction.update({ components: [revealRow] });
  } catch (err) {
    console.error('Failed to reveal trivia colors:', err);
  }

  if (isCorrect) {
    await interaction.followUp({
      content: `✅ Correct! You've picked the right answer. **${active.correctLetter}** - ${correctText}`,
      flags: [MessageFlags.Ephemeral],
    });
  } else {
    await interaction.followUp({
      content: `❌ Incorrect! You've picked the wrong answer. The correct answer was **${active.correctLetter}** - ${correctText}`,
      flags: [MessageFlags.Ephemeral],
    });
  }
}

client.on('error', (err) => {
  console.error('Client error:', err);
  console.error(getDownMessage());
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('Failed to login:', err);
  console.error(getDownMessage());
});
