// commands/adduser.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adduser')
        .setDescription('Add a user to a ticket channel.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add to the ticket.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('ticket')
                .setDescription('The ticket channel (optional). If not provided, uses the current channel.')
                .setRequired(false)),

    async execute(interaction) {
        const staffRoleId = config.staffRoleId;

        if (!interaction.member.roles.cache.has(staffRoleId)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const userToAdd = interaction.options.getUser('user');
        const ticketChannel = interaction.options.getChannel('ticket') || interaction.channel;

        const ticketData = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(ticketChannel.id);
        const ticketCreatorId = ticketData?.userId;

        if (userToAdd.id === ticketCreatorId) {
            return interaction.reply({ content: 'You cannot add the ticket creator to their own ticket.', ephemeral: true });
        }

        if (!ticketChannel.isTextBased()) {
            return interaction.reply({ content: 'The provided channel is not a valid ticket channel.', ephemeral: true });
        }

        if (!ticketData) {
            return interaction.reply({ content: 'This is not a valid ticket channel.', ephemeral: true });
        }

        try {
            await ticketChannel.permissionOverwrites.edit(userToAdd.id, {
                ViewChannel: true,
                SendMessages: true
            });

            await interaction.reply({ content: `Successfully added ${userToAdd} to ${ticketChannel}.` });
        } catch (error) {
            console.error('Error adding user to ticket:', error);
            await interaction.reply({ content: 'There was an error adding the user to the ticket. Please try again.', ephemeral: true });
        }
    }
};
