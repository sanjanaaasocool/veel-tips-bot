const crypto = require('node:crypto');

const API = 'https://discord.com/api/v10';

const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  UPDATE_MESSAGE: 7,
};

const ComponentType = { ACTION_ROW: 1, BUTTON: 2 };
const ButtonStyle = { SECONDARY: 2, SUCCESS: 3, DANGER: 4 };

const EPHEMERAL = 64;

const LETTERS = ['A', 'B', 'C'];

// Discord hands out a bare 32-byte Ed25519 key; node's crypto wants SPKI DER,
// which for this curve is a fixed 12-byte prefix plus the key itself.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function toKeyObject(publicKeyHex) {
  return crypto.createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
    format: 'der',
    type: 'spki',
  });
}

/**
 * Discord signs `timestamp + rawBody`. The body has to be the exact bytes that
 * arrived: re-serializing the parsed JSON changes key order and whitespace, and
 * the signature stops matching.
 */
function verifyRequest({ rawBody, signature, timestamp, publicKeyHex }) {
  if (!rawBody || !signature || !timestamp || !publicKeyHex) return false;

  try {
    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      toKeyObject(publicKeyHex),
      Buffer.from(signature, 'hex')
    );
  } catch {
    // Malformed hex in either the signature or the key lands here.
    return false;
  }
}

const EMBED_DESCRIPTION_LIMIT = 4096;

function truncate(text, limit) {
  const clean = (text ?? '').trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1)}…`;
}

function tipEmbed(tipText) {
  return {
    color: 0x6c5ce7,
    title: '🪄 Veel Creator Tip',
    description: truncate(tipText, EMBED_DESCRIPTION_LIMIT),
    footer: { text: 'Veel Creators Community' },
  };
}

function askEmbed(query, answer) {
  // The question goes inline rather than in an embed field: fields cap at 1024
  // characters and Gemini answers regularly run past that.
  const body = `**${truncate(query, 256)}**\n\n${answer ?? ''}`;

  return {
    color: 0x00b894,
    title: '💡 Veel Creator Answer',
    description: truncate(body, EMBED_DESCRIPTION_LIMIT),
    footer: { text: 'Veel Creators Community' },
  };
}

function triviaEmbed(question) {
  return {
    color: 0xe74c3c,
    title: '🎯 Veel Trivia',
    description: `**${question.text}**\n\nPick an answer below.`,
    footer: { text: 'Veel Creators Community' },
  };
}

// The whole round is encoded in the button id as `trivia:<correct>:<this one>`.
// That keeps the game stateless: a button press carries everything needed to
// judge it, so nothing has to be remembered between Lambda invocations.
function triviaCustomId(correctLetter, buttonLetter) {
  return `trivia:${correctLetter}:${buttonLetter}`;
}

function parseTriviaCustomId(customId) {
  const parts = String(customId ?? '').split(':');
  if (parts.length !== 3 || parts[0] !== 'trivia') return null;

  const [, correctLetter, chosenLetter] = parts;
  if (!LETTERS.includes(correctLetter) || !LETTERS.includes(chosenLetter)) return null;

  return { correctLetter, chosenLetter };
}

function triviaRow(question) {
  return {
    type: ComponentType.ACTION_ROW,
    components: question.options.map((label, index) => ({
      type: ComponentType.BUTTON,
      style: ButtonStyle.SECONDARY,
      label,
      custom_id: triviaCustomId(question.correctLetter, LETTERS[index]),
    })),
  };
}

/**
 * Rebuilds the button row in reveal state. Labels come from the message Discord
 * sent us, so the original question text never has to be stored anywhere.
 */
function triviaRevealRow(messageComponents, correctLetter) {
  const buttons = messageComponents?.[0]?.components ?? [];

  return {
    type: ComponentType.ACTION_ROW,
    components: buttons.map((button) => {
      const parsed = parseTriviaCustomId(button.custom_id);
      const isCorrect = parsed?.chosenLetter === correctLetter;

      return {
        type: ComponentType.BUTTON,
        style: isCorrect ? ButtonStyle.SUCCESS : ButtonStyle.DANGER,
        label: button.label,
        custom_id: button.custom_id,
        disabled: true,
      };
    }),
  };
}

/** Label of the correct button, read back off the message Discord sent us. */
function correctLabelFrom(messageComponents, correctLetter) {
  const buttons = messageComponents?.[0]?.components ?? [];
  const match = buttons.find(
    (button) => parseTriviaCustomId(button.custom_id)?.chosenLetter === correctLetter
  );

  return match?.label ?? '';
}

/** Replaces the "thinking..." placeholder left by a deferred response. */
async function editInteractionResponse({ applicationId, token, body }) {
  const res = await fetch(`${API}/webhooks/${applicationId}/${token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Discord followup failed: ${res.status} ${await res.text()}`);
  }
}

/** Sends an additional message on an interaction that was already answered. */
async function sendFollowup({ applicationId, token, body }) {
  const res = await fetch(`${API}/webhooks/${applicationId}/${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Discord followup failed: ${res.status} ${await res.text()}`);
  }
}

async function postToChannel({ botToken, channelId, body }) {
  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Discord post failed: ${res.status} ${await res.text()}`);
  }
}

module.exports = {
  ButtonStyle,
  ComponentType,
  EPHEMERAL,
  InteractionResponseType,
  InteractionType,
  LETTERS,
  askEmbed,
  correctLabelFrom,
  editInteractionResponse,
  parseTriviaCustomId,
  postToChannel,
  sendFollowup,
  tipEmbed,
  triviaEmbed,
  triviaRevealRow,
  triviaRow,
  verifyRequest,
};
