// Ported from the always-on bot. Shown when Gemini fails so the user gets
// something with a bit of personality instead of a bare error string.
const API_HICCUP_MESSAGES = [
  '☕ Even bots need a coffee break sometimes. Retry in a moment!',
  "🙃 That tip got lost in the sauce. Try again! I promise I'm usually smarter than this.",
  '🫠 Tips Bot has left the chat... involuntarily. Give it a sec!',
  '🛠️ Currently AWOL. Probably stuck in traffic between servers. Try again shortly!',
];

// Avoids repeating the previous message. Lambda keeps module state only for the
// life of a warm container, so this is best-effort rather than guaranteed.
let lastIndex = -1;

function getHiccupMessage() {
  if (API_HICCUP_MESSAGES.length === 1) return API_HICCUP_MESSAGES[0];

  let index = Math.floor(Math.random() * API_HICCUP_MESSAGES.length);
  while (index === lastIndex) {
    index = Math.floor(Math.random() * API_HICCUP_MESSAGES.length);
  }
  lastIndex = index;

  return API_HICCUP_MESSAGES[index];
}

module.exports = { getHiccupMessage };
