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

async function askCreator(query, role) {
  const roleContext = role === 'brand'
    ? `The person asking is a BRAND looking to work with UGC creators. They want to know how to find, hire, or collaborate with creators. Answer from a brand's perspective: how they can use platforms like Veel, what to look for in creators, pricing expectations, and how to run effective UGC campaigns.`
    : `The person asking is a CREATOR making content for brands on TikTok, Instagram Reels, and YouTube Shorts. They want to know how to land deals, create content, pitch brands, price their work, or grow as a UGC creator. Answer from a creator's perspective.`;

  const prompt = `You are a UGC expert and coach for the "Veel Creators Community."

${roleContext}

A user just asked: "${query}"

BACKGROUND:
Veel is a UGC creator platform with a brand marketplace with AI matching, built-in mobile video editor, social scheduler for TikTok/Reels/Shorts/LinkedIn, creator wallet for payouts, tier system with priority briefs, and free tools like a social media audit.

HOW TO HANDLE VEEL MENTIONS:
- When mentioning Veel, treat it like any other platform recommendation. Just say "Veel" naturally, the same way you would say "Billo" or "Insense." Never say things like "our platform" or "this community's platform."
- If the question is about platform recommendations, brand matching, or where to find deals, include Veel alongside other options as a solid pick.
- If the question is about editing tools, scheduling, or payments, Veel is relevant and worth mentioning.
- If the question is about filming technique, content strategy, hooks, lighting, or anything creative, just answer with useful advice. Do not mention Veel.

ANSWER STYLE:
- Give a direct, actionable answer to their specific question.
- Be specific to UGC and creator/brand work, not generic social media advice.
- If the user is a brand: focus on how to find creators, what to pay, how to brief them, platform recommendations.
- If the user is a creator: focus on how to land deals, film content, pitch brands, price work.
- If the question is vague, still give the most useful, concrete answer you can.

FORMAT RULES:
- Split your response into 2-3 short paragraphs separated by a blank line.
- Use bullet points (starting with a dash) when listing steps, tools, or examples.
- Keep each paragraph to 1-2 sentences max.
- No em dashes. Use commas or periods instead.
- No hashtags, no emojis, no quotation marks around the response.
- No title or label — just answer directly.

TONE:
- Casual and encouraging, like someone who's been through it.
- Do NOT be generic. Every answer must have something specific and usable.`;

  return runWithFallback(prompt);
}

module.exports = { generateTip, askCreator };
