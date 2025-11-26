// index.js
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // bot application id
const GUILD_ID = process.env.GUILD_ID; // optional for dev
const APP_SCRIPT_URL = process.env.APP_SCRIPT_URL; // your deployed Apps Script URL
const SECRET = process.env.WEBHOOK_SECRET; // same as SECRET_WEBHOOK_KEY in Apps Script

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Register slash commands (run once or at startup in dev mode)
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('start').setDescription('Start tracking a task').addStringOption(opt => opt.setName('task').setDescription('Task ID').setRequired(true)),
    new SlashCommandBuilder().setName('stop').setDescription('Stop tracking a task').addStringOption(opt => opt.setName('task').setDescription('Task ID').setRequired(true)),
    new SlashCommandBuilder().setName('close').setDescription('Close a task').addStringOption(opt => opt.setName('task').setDescription('Task ID').setRequired(true)),
    new SlashCommandBuilder().setName('status').setDescription('Get task status').addStringOption(opt => opt.setName('task').setDescription('Task ID').setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
}

client.once('ready', async () => {
  console.log('Bot ready', client.user.tag);
  try { await registerCommands(); console.log('Commands registered'); } catch (e) { console.warn('Reg cmd', e.message); }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const task = interaction.options.getString('task');
  const cmd = interaction.commandName;

  // Resolve user's email: Discord doesn't provide email via bot; you must map discord user id -> email using your own DB
  // For demo we use environment mapping or fallback dummy
  const userEmail = process.env.USER_EMAIL_MAP ? (JSON.parse(process.env.USER_EMAIL_MAP)[interaction.user.id] || '') : '';

  const payload = {
    command: cmd,
    task_id: task,
    username: interaction.user.tag,
    email: userEmail,
    _secret: SECRET
  };

  await interaction.deferReply({ ephemeral: true });
  try {
    const resp = await axios.post(APP_SCRIPT_URL, payload, { timeout: 10000 });
    await interaction.editReply({ content: `✅ ${cmd} executed. Response: ${resp.data && resp.data.message ? resp.data.message : JSON.stringify(resp.data)}` });
  } catch (err) {
    await interaction.editReply({ content: `❌ Failed: ${err.message}` });
  }
});

client.login(DISCORD_TOKEN);