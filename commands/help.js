const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json'); // Import your config file

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays help information for the bot.'),
    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor(config.mainColor || 0x0099ff)
            .setTitle('⚙️ Help Menu')
            .setDescription('<arg> -> required, [arg] -> optional')
            .addFields(
                { name: '`/help`', value: 'Displays this help message.', inline: false },
                { name: '`/ping`', value: 'Displays the Bot & API latency.', inline: false },
                { name: '`/panel [channel]`', value: 'Send the panel to open tickets.', inline: false },
                { name: '`/alert [ticket_channel]`', value: 'Mark a ticket as inactive and mention the ticket creator.', inline: false },
                { name: '`/adduser <user> [ticket_channel]`', value: 'Add an user to a ticket.', inline: false },
                { name: '`/removeuser <user> [ticket_channel]`', value: 'Remove an user from a ticket.', inline: false },
                { name: '`/blacklist add <user>`', value: 'Add a user to the blacklist preventing them from opening tickets.', inline: false },
                { name: '`/blacklist remove <user>`', value: 'Add a user to the blacklist preventing them from opening tickets.', inline: false }
            )
            .setTimestamp()
            .setThumbnail(interaction.client.user.displayAvatarURL());

        await interaction.reply({ embeds: [helpEmbed] });
    },
};
