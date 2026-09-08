const { InvokeCommand, LambdaClient } = require('@aws-sdk/client-lambda');
const {
  EPHEMERAL,
  InteractionResponseType,
  InteractionType,
  correctLabelFrom,
  parseTriviaCustomId,
  triviaEmbed,
  triviaRevealRow,
  triviaRow,
  verifyRequest,
} = require('./lib/discord');
const { getRandomQuestion } = require('./trivia');

const lambda = new LambdaClient({});

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const WORKER_FUNCTION_NAME = process.env.WORKER_FUNCTION_NAME;

// Which channel each command is allowed in. A command absent from this map is
// allowed anywhere. Mirrors the checks the always-on bot did in handleCommand.
const REQUIRED_CHANNEL = {
  tip: process.env.CREATOR_TIPS_CHANNEL_ID,
  ask: process.env.CREATOR_TIPS_CHANNEL_ID,
  trivia: process.env.QUICK_GAMES_CHANNEL_ID,
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function ephemeral(content) {
  return json(200, {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: EPHEMERAL },
  });
}

async function invokeWorker(payload) {
  await lambda.send(
    new InvokeCommand({
      FunctionName: WORKER_FUNCTION_NAME,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify(payload)),
    })
  );
}

function handleCommand(interaction) {
  const commandName = interaction.data?.name;

  // The raw HTTP payload uses snake_case; there is no discord.js normalisation
  // layer here, so this is channel_id rather than channelId.
  const requiredChannel = REQUIRED_CHANNEL[commandName];
  if (requiredChannel && interaction.channel_id !== requiredChannel) {
    return { immediate: ephemeral(`This command only works in <#${requiredChannel}>!`) };
  }

  // Trivia never calls Gemini, so it needs no deferral and no worker: the
  // question is picked locally and returned in the initial response.
  if (commandName === 'trivia') {
    const question = getRandomQuestion(interaction.channel_id);

    return {
      immediate: json(200, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { embeds: [triviaEmbed(question)], components: [triviaRow(question)] },
      }),
    };
  }

  return {
    handoff: {
      kind: 'command',
      commandName,
      options: interaction.data?.options ?? [],
      token: interaction.token,
    },
  };
}

function handleButton(interaction) {
  const parsed = parseTriviaCustomId(interaction.data?.custom_id);
  if (!parsed) {
    return { immediate: json(400, { error: 'unrecognised component' }) };
  }

  const { correctLetter, chosenLetter } = parsed;
  const components = interaction.message?.components;

  return {
    // Repaint the buttons green/red and disable them. Labels are read back off
    // the message Discord sent, so no round state had to be stored anywhere.
    immediate: json(200, {
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: { components: [triviaRevealRow(components, correctLetter)] },
    }),
    // The per-user verdict has to be a followup, which cannot be sent until the
    // response above has gone out. The worker does it a moment later.
    handoff: {
      kind: 'triviaResult',
      token: interaction.token,
      isCorrect: chosenLetter === correctLetter,
      correctLetter,
      correctLabel: correctLabelFrom(components, correctLetter),
    },
  };
}

exports.handler = async (event) => {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  const headers = event.headers ?? {};
  const verified = verifyRequest({
    rawBody,
    signature: headers['x-signature-ed25519'],
    timestamp: headers['x-signature-timestamp'],
    publicKeyHex: PUBLIC_KEY,
  });

  // Discord probes this endpoint with deliberately bad signatures when you save
  // the Interactions Endpoint URL and refuses the URL unless it gets a 401 back,
  // so this branch is load-bearing rather than merely defensive.
  if (!verified) {
    return { statusCode: 401, body: 'invalid request signature' };
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return json(200, { type: InteractionResponseType.PONG });
  }

  let result;
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    result = handleCommand(interaction);
  } else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    result = handleButton(interaction);
  } else {
    return json(400, { error: 'unsupported interaction type' });
  }

  if (result.handoff) {
    try {
      await invokeWorker(result.handoff);
    } catch (err) {
      console.error('Could not hand off to worker:', err);

      // For a slash command the hand-off IS the reply, so failing it would
      // strand the user on a spinner. For a trivia button the reveal below is
      // the important part and only the private verdict is lost, so carry on.
      if (!result.immediate) {
        return ephemeral('Sorry, something went wrong. Try again in a bit!');
      }
    }
  }

  return (
    result.immediate ??
    json(200, { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE })
  );
};
