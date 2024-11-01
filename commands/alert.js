const { SlashCommandBuilder, EmbedBuilder, ChannelType, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/database');
const config = require('../config.json');

let closureTimeouts = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Alert the ticket creator that the ticket is inactive.')
        .addChannelOption(option =>
            option.setName('ticket_channel')
                .setDescription('The ticket channel to send the alert (optional).')
                .addChannelTypes(ChannelType.GuildText)
        ),
    async execute(interaction) {
        const ticketChannel = interaction.options.getChannel('ticket_channel') || interaction.channel;

        if (!(ticketChannel instanceof TextChannel)) {
            return await interaction.reply({ content: 'Please provide a valid text channel.', ephemeral: true });
        }

        const ticketData = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(ticketChannel.id);

        if (!ticketData) {
            return await interaction.reply({ content: 'No ticket found for this channel.', ephemeral: true });
        }

        const ticketCreatorId = ticketData.userId;

        const alertEmbed = new EmbedBuilder()
            .setColor(config.mainColor || 0x0099ff)
            .setTitle('Ticket Inactive Alert')
            .setDescription(`Hello <@${ticketCreatorId}>, your ticket has been inactive and will be automatically closed after two days.`)
            .setTimestamp();

        await ticketChannel.send({ content: `<@${ticketCreatorId}>`, embeds: [alertEmbed] });

        if (closureTimeouts.has(ticketChannel.id)) {
            clearTimeout(closureTimeouts.get(ticketChannel.id));
        }

        const delayClosure = 10* 1000; // 2 days

        const timeoutId = setTimeout(async () => {
            const updatedTicketData = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(ticketChannel.id);
            if (updatedTicketData && updatedTicketData.status === 'open') {
                await closeTicket(ticketChannel, ticketCreatorId, updatedTicketData.id);
            }
        }, delayClosure);

        closureTimeouts.set(ticketChannel.id, timeoutId);

        await interaction.reply({ content: 'Alert sent successfully!', ephemeral: true });
    },
    closureTimeouts
};

async function closeTicket(ticketChannel, ticketCreatorId, ticketId) {
    try {
        await ticketChannel.setParent(config.closedCategoryId, { lockPermissions: false });
        await ticketChannel.permissionOverwrites.edit(ticketCreatorId, { SendMessages: false });
        db.prepare('UPDATE tickets SET status = ? WHERE channelId = ?').run('closed', ticketChannel.id);

        const updatedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('archive_ticket')
                .setLabel('🗃️ Archive')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('reopen_ticket')
                .setLabel('🔓 Reopen')
                .setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
            .setColor(config.ticketCloseEmbed?.color || 0x0099ff)
            .setTitle(config.ticketCloseEmbed?.title || 'Ticket was closed')
            .setDescription(config.ticketCloseEmbed?.description || 'Your ticket has been closed due to inactivity. If your DMs are opened, you can still rate the support you received.')
            .setTimestamp();

        await ticketChannel.send({ content: `<@${ticketCreatorId}>`, embeds: [embed], components: [updatedRow] });

        closureTimeouts.delete(ticketChannel.id);
    } catch (error) {
        console.error('Error closing ticket:', error);
    }
}
