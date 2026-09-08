const {
  EPHEMERAL,
  askEmbed,
  editInteractionResponse,
  sendFollowup,
  tipEmbed,
} = require('./lib/discord');
const { getHiccupMessage } = require('./lib/messages');
const { askCreator, generateTip } = require('./generateTip');

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;

function optionValue(options, name) {
  return options.find((option) => option.name === name)?.value;
}

async function buildEmbed(commandName, options) {
  if (commandName === 'tip') {
    return tipEmbed(await generateTip());
  }

  if (commandName === 'ask') {
    const query = optionValue(options, 'query');
    return askEmbed(query, await askCreator(query));
  }

  throw new Error(`Unknown command: ${commandName}`);
}

/** Slash command: replace the "thinking..." placeholder with the real answer. */
async function runCommand({ commandName, options = [], token }) {
  try {
    const embed = await buildEmbed(commandName, options);
    await editInteractionResponse({
      applicationId: APPLICATION_ID,
      token,
      body: { embeds: [embed] },
    });
  } catch (err) {
    console.error('Worker failed:', err);

    // Someone is watching a "thinking..." spinner right now; replace it with
    // something honest before letting the invocation fail.
    await editInteractionResponse({
      applicationId: APPLICATION_ID,
      token,
      body: { content: getHiccupMessage() },
    }).catch((patchErr) => console.error('Could not report failure to Discord:', patchErr));

    throw err;
  }
}

/** Trivia button: private verdict, sent after the public reveal has gone out. */
async function sendTriviaResult({ token, isCorrect, correctLetter, correctLabel }) {
  const answer = correctLabel ? `**${correctLetter}** - ${correctLabel}` : `**${correctLetter}**`;
  const content = isCorrect
    ? `✅ Correct! You've picked the right answer. ${answer}`
    : `❌ Incorrect! You've picked the wrong answer. The correct answer was ${answer}`;

  await sendFollowup({
    applicationId: APPLICATION_ID,
    token,
    body: { content, flags: EPHEMERAL },
  });
}

exports.handler = async (event) => {
  // `kind` defaults to command so an invocation already in flight during a
  // deploy still lands correctly.
  const kind = event.kind ?? 'command';

  if (kind === 'triviaResult') {
    return sendTriviaResult(event);
  }

  if (kind === 'command') {
    return runCommand(event);
  }

  throw new Error(`Unknown worker event kind: ${kind}`);
};
