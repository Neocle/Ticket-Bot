const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const { exec } = require('child_process');
const startStatisticsUpdater = require('./utils/statistics');
const startActivityUpdater = require('./utils/activity');
require('./utils/webserver');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });
client.commands = new Collection();
client.eventHandlers = new Collection();
client.buttonHandlers = new Collection();

exec('node deploy-commands.js', (error, stdout, stderr) => {
    if (error) {
        console.error(`${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`${stderr}`);
        return;
    }
    console.log(`${stdout}`);
});

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    client.eventHandlers.set(event.name, event);
}

const buttonFiles = fs.readdirSync('./buttons').filter(file => file.endsWith('.js'));
for (const file of buttonFiles) {
    const button = require(`./buttons/${file}`);
    if (!button.data || !button.data.name) {
        console.error(`Button handler ${file} is missing 'data.name' property`);
        continue;
    }
    client.buttonHandlers.set(button.data.name, button);
}

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (command) await command.execute(interaction);
        } else if (interaction.isStringSelectMenu()) {
            const selectMenuHandler = client.eventHandlers.get('interactionCreate');
            if (selectMenuHandler) await selectMenuHandler.execute(interaction);
        } else if (interaction.isModalSubmit()) {
            const modalSubmit = client.eventHandlers.get('interactionCreate');
            if (modalSubmit) await modalSubmit.execute(interaction);
        } else if (interaction.isButton()) {
            const buttonHandler = client.buttonHandlers.get(interaction.customId);
            if (buttonHandler) await buttonHandler.execute(interaction);
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});

client.on('messageCreate', async (message) => {
    const messageCreateHandler = require('./events/messageCreate.js');
    messageCreateHandler.execute(message, client);
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Start periodic updates and web server
    startStatisticsUpdater(client);
    startActivityUpdater(client);
});

client.login(process.env.TOKEN);
