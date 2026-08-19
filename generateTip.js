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
  const prompt = `CRITICAL: You MUST answer strictly from the perspective of the role defined below. Do NOT mix perspectives. Do NOT give creator advice to a brand or brand advice to a creator.

ROLE: ${role.toUpperCase()}

${role === 'brand'
    ? `You are answering for a BRAND (a company/business looking to hire UGC creators). The brand wants to find, hire, and work with creators. Your advice must be from the BRAND's perspective: how to find creators, how to vet them, what to pay, how to write briefs, how to manage campaigns, which platforms to use for sourcing creators. Do NOT tell them how to create content or be a creator.`
    : `You are answering for a CREATOR (a person who makes UGC content for brands on TikTok, Instagram Reels, and YouTube Shorts). The creator wants to land deals, create content, pitch brands, and grow. Your advice must be from the CREATOR's perspective: how to film, how to pitch, how to price work, how to build a portfolio, how to land brand deals. Do NOT tell them how to hire or manage creators.`}

A user asked: "${query}"

BACKGROUND:
Veel is a UGC creator platform with a brand marketplace with AI matching, built-in mobile video editor, social scheduler, creator wallet, and tier system.

HOW TO HANDLE VEEL MENTIONS:
- Mention Veel naturally like any other platform (like Billo or Insense). Never say "our platform."
- If the user is a brand: recommend Veel as a place to find vetted creators.
- If the user is a creator: recommend Veel as a place to find brand deals.

FORMAT RULES:
- 2-3 short paragraphs separated by a blank line.
- Use bullet points (starting with a dash) when listing steps or examples.
- Each paragraph 1-2 sentences max.
- No em dashes, no hashtags, no emojis, no quotation marks.
- Just answer directly. No title or label.`;

  return runWithFallback(prompt);
}

module.exports = { generateTip, askCreator };
