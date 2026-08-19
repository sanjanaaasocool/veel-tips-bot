require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Get a random UGC creator tip'),
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a UGC/creator question and get a tailored tip')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Your question about content creation, UGC, filming, editing, brands, etc.')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('role')
        .setDescription('Are you a creator or a brand?')
        .addChoices(
          { name: 'Creator', value: 'creator' },
          { name: 'Brand', value: 'brand' }
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Answer a UGC creator trivia question'),
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    // Guild-scoped registration = shows up instantly in your server.
    // (Global registration can take up to an hour to propagate.)
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Successfully registered /tip, /ask, and /trivia commands.');
  } catch (error) {
    console.error('Failed to register command:', error);
  }
})();
