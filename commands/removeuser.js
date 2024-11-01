// commands/removeuser.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeuser')
        .setDescription('Remove a user from a ticket channel.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove from the ticket.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('ticket')
                .setDescription('The ticket channel (optional). If not provided, uses the current channel.')
                .setRequired(false)),
    
    async execute(interaction) {
        const staffRoleId = config.staffRoleId;

        // Check if the user has the staff role
        if (!interaction.member.roles.cache.has(staffRoleId)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        // Get the user to remove and the target ticket channel
        const userToRemove = interaction.options.getUser('user');
        const ticketChannel = interaction.options.getChannel('ticket') || interaction.channel;

        const ticketData = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(ticketChannel.id);
        const ticketCreatorId = ticketData?.userId;

        if (userToRemove.id === ticketCreatorId) {
            return interaction.reply({ content: 'You cannot remove the ticket creator from their own ticket.', ephemeral: true });
        }

        // Ensure the selected channel is a text-based channel
        if (!ticketChannel.isTextBased()) {
            return interaction.reply({ content: 'The provided channel is not a valid ticket channel.', ephemeral: true });
        }

        // Check if the channel exists in the database
        if (!ticketData) {
            return interaction.reply({ content: 'This is not a valid ticket channel.', ephemeral: true });
        }

        try {
            // Update the permissions for the selected channel to remove the user
            await ticketChannel.permissionOverwrites.edit(userToRemove.id, {
                ViewChannel: false,
                SendMessages: false
            });

            await interaction.reply({ content: `Successfully removed ${userToRemove} from ${ticketChannel}.` });
        } catch (error) {
            console.error('Error removing user from ticket:', error);
            await interaction.reply({ content: 'There was an error removing the user from the ticket. Please try again.', ephemeral: true });
        }
    }
};
