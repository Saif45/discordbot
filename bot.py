import os
import discord
from discord import app_commands
import requests

DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
APP_SCRIPT_URL = os.getenv('APP_SCRIPT_URL')
SECRET = os.getenv('WEBHOOK_SECRET')
USER_EMAIL_MAP = os.getenv('USER_EMAIL_MAP')
if USER_EMAIL_MAP:
    USER_EMAIL_MAP = json.loads(USER_EMAIL_MAP)

intents = discord.Intents.default()
client = discord.Client(intents=intents)

tree = app_commands.CommandTree(client)

@tree.command(name='start', description='Start tracking a task')
@app_commands.describe(task='Task ID')
async def start(interaction: discord.Interaction, task: str):
    await interaction.response.defer(ephemeral=True)
    email = USER_EMAIL_MAP.get(str(interaction.user.id), '') if USER_EMAIL_MAP else ''
    payload = {'command':'start','task_id':task,'username':str(interaction.user),'email':email,'_secret':SECRET}
    try:
        r = requests.post(APP_SCRIPT_URL, json=payload, timeout=10)
        await interaction.followup.send('✅ started: ' + (r.json().get('message','')))
    except Exception as e:
        await interaction.followup.send('❌ failed: ' + str(e))

# similarly create stop, close, status commands

@client.event
async def on_ready():
    print('Ready', client.user)
    await tree.sync()

client.run(DISCORD_TOKEN)