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
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering /tip slash command...');

    // Guild-scoped registration = shows up instantly in your server.
    // (Global registration can take up to an hour to propagate.)
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Successfully registered /tip and /ask commands.');
  } catch (error) {
    console.error('Failed to register command:', error);
  }
})();
