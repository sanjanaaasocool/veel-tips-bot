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
  const prompt = `You are a UGC expert for the "Veel Creators Community." Answer the following question.

A user asked: "${query}"

HOW TO DECIDE WHO THE ANSWER IS FOR:
- If the question is clearly about creating content, filming, pitching brands, pricing your work, or growing as a creator, answer as "If you are a creator..." and give advice from the creator's perspective.
- If the question is clearly about hiring creators, writing briefs, managing campaigns, vetting creators, or sourcing UGC, answer as "If you are a brand..." and give advice from the brand's perspective.
- If the question is vague and could apply to both a creator and a brand, give a short answer for each: first "If you are a creator..." then "If you are a brand..." Keep each part brief.

You must clearly state who each piece of advice is for.

BACKGROUND:
Veel is a UGC creator platform with a brand marketplace with AI matching, built-in mobile video editor, social scheduler, creator wallet, and tier system.

HOW TO HANDLE VEEL MENTIONS:
- Mention Veel naturally like any other platform (like Billo or Insense). Never say "our platform."
- If giving brand advice: recommend Veel as a place to find vetted creators.
- If giving creator advice: recommend Veel as a place to find brand deals.

FORMAT RULES:
- 2-3 short paragraphs separated by a blank line.
- Use bullet points (starting with a dash) when listing steps or examples.
- Each paragraph 1-2 sentences max.
- No em dashes, no hashtags, no emojis, no quotation marks.
- Just answer directly. No title or label.`;

  return runWithFallback(prompt);
}

module.exports = { generateTip, askCreator };
