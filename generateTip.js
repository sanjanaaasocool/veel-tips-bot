const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const TIP_ANGLES = [
  'a tip for landing your first UGC brand deal',
  'a tip for filming UGC product videos that convert',
  'a tip for writing a brand pitch DM that actually gets replies',
  'a tip for Instagram Reels hooks that stop the scroll',
  'a tip for TikTok content that brands want to repost',
  'a tip for YouTube Shorts that drive watch time',
  'a tip for pricing your UGC work as a beginner',
  'a tip for filming clean UGC videos with just a phone',
  'a tip for editing UGC content fast without fancy software',
  'a tip for gettingUGC brand deals on Instagram',
  'a tip for building a UGC portfolio that impresses brands',
  'a tip for repurposing one UGC video across TikTok, Reels, and Shorts',
  'a tip for creating authentic unboxing or review-style UGC',
  'a tip for negotiating rates with brands as a UGC creator',
  'a tip for growing engagement, not just followers, as a creator',
];

function pickAngle() {
  return TIP_ANGLES[Math.floor(Math.random() * TIP_ANGLES.length)];
}

const MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runWithFallback(prompt) {
  let lastError;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      lastError = err;
      console.error(`Model ${modelName} failed, trying next...`, err.status || err.message);
      await sleep(1500);
    }
  }
  throw lastError;
}

async function generateTip() {
  const angle = pickAngle();

  const prompt = `You are a UGC expert and creator coach for the "Veel Creators Community." These creators make content for brands on TikTok, Instagram Reels, and YouTube Shorts.

Write ONE tip: ${angle}.

BACKGROUND:
Veel is a UGC creator platform with a brand marketplace, built-in video editor, social scheduler, creator wallet, and tier system. You can mention it naturally when it fits, but do not force it. If the tip is about filming technique or content strategy, just give the tip without mentioning any platform.

FORMAT RULES:
- Split your response into 2-3 short paragraphs separated by a blank line.
- Use bullet points (starting with a dash) when listing steps, tools, or examples.
- Keep each paragraph to 1-2 sentences max.
- No em dashes. Use commas or periods instead.
- No hashtags, no emojis, no quotation marks around the tip.
- No title or label like "Tip:" — just the tip content itself.

TONE:
- Casual and encouraging, like a fellow creator sharing what works.
- Concrete and actionable. Give a specific technique they can use TODAY.`;

  return runWithFallback(prompt);
}

async function askCreator(query) {
  const prompt = `You are Veel Buddy, a helpful assistant for the Veel Creators Community Discord server. Answer the following question naturally and accurately, the way a knowledgeable, friendly person would.

A user asked: "${query}"

HOW TO ANSWER:
- First and foremost, answer the actual question. Prioritize being accurate and genuinely helpful over anything else.
- If the question is about UGC content creation, filming, pitching brands, pricing work, growing as a creator, running campaigns, briefs, vetting creators, or sourcing UGC, then bring in your creator/brand expertise and give real, specific, useful advice from the relevant side (creator or brand). Only split your answer into "creator" and "brand" perspectives if the question is genuinely ambiguous between the two, don't force this structure otherwise.
- If the question has nothing to do with UGC, content creation, or brand deals (general knowledge, trivia, random questions, casual chat, etc.), just answer it normally and honestly like any helpful assistant would. Do not twist it into a UGC lesson, do not add a "here's how this relates to your content" section, and do not tack on creator tips nobody asked for.

HOW TO HANDLE VEEL MENTIONS:
- Only mention Veel if the user directly asks about it/its features, or if recommending a platform is genuinely and naturally the most useful answer to what they asked (e.g. "where can I find brand deals" or "where can brands find creators").
- Never force Veel into unrelated answers. Most answers should not mention Veel at all.
- If you do mention Veel, be accurate: it's a UGC creator platform with a brand marketplace (AI-assisted matching), a built-in mobile video editor, a social scheduler, a creator wallet. Don't invent features. Never say "our platform," refer to it like you would any other named platform.

FORMAT RULES:
- Write like a normal, articulate person answering a question, not a marketing template. Default to plain paragraphs.
- Only use bullet points if the answer is a list of steps, options, or examples, and it's genuinely clearer as a list. Do not force bullets onto answers that read fine as prose.
- Length should match the question. A quick factual question gets a quick, direct answer. A meatier question about strategy or campaigns can be more thorough.
- No em dashes. Use commas or periods instead.
- No hashtags, no emojis, no quotation marks around the answer.
- No title or label like "Answer:" — just respond directly.`;

  return runWithFallback(prompt);
}

module.exports = { generateTip, askCreator };
