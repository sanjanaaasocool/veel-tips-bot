const { postToChannel, tipEmbed } = require('./lib/discord');
const { generateTip } = require('./generateTip');

exports.handler = async () => {
  const embed = tipEmbed(await generateTip());

  await postToChannel({
    botToken: process.env.DISCORD_TOKEN,
    channelId: process.env.TIPS_CHANNEL_ID,
    body: { embeds: [embed] },
  });

  console.log('Posted scheduled tip.');
};
