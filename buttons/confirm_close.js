const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const db = require('../database/database');

module.exports = {
    data: {
        name: 'confirm_close_ticket',
    },
    async execute(interaction) {
        try {
            if (interaction.replied || interaction.deferred) {
                console.warn('This interaction has already been replied to.');
                return; 
            }
            const staffMember = interaction.user;
            const ticketChannel = interaction.channel;
            const ticketData = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(ticketChannel.id);
            const ticketCreatorId = ticketData?.userId;

            if (!ticketCreatorId) {
                throw new Error('Ticket creator not found in the database.');
            }

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

            await interaction.update({ content: "You successfully closed the ticket.", ephemeral: true, components: [] });

            const embed = new EmbedBuilder()
                .setColor(config.ticketCloseEmbed?.color || 0x0099ff)
                .setTitle(config.ticketCloseEmbed?.title || 'Ticket was closed')
                .setDescription(config.ticketCloseEmbed?.description || 'You are now unable to talk with the staff and your case is marked as complete. If your DMs are opened, you will be able to rate the support you received in order for the staff to listen to your opinion.')
                .setTimestamp(config.ticketCloseEmbed?.timestamp ? new Date(config.ticketCloseEmbed.timestamp) : null);

            if (config.ticketCloseEmbed?.footer) {
                embed.setFooter({
                    text: config.ticketCloseEmbed.footer.text,
                    iconURL: config.ticketCloseEmbed.footer.icon_url,
                });
            }

            if (config.ticketCloseEmbed?.author) {
                embed.setAuthor({
                    name: config.ticketCloseEmbed.author.name,
                    url: config.ticketCloseEmbed.author.url,
                    iconURL: config.ticketCloseEmbed.author.icon_url,
                });
            }

            if (config.ticketCloseEmbed?.thumbnail?.url) {
                embed.setThumbnail(config.ticketCloseEmbed.thumbnail.url);
            }

            if (config.ticketCloseEmbed?.image?.url) {
                embed.setImage(config.ticketCloseEmbed.image.url);
            }

            if (config.ticketCloseEmbed?.fields) {
                config.ticketCloseEmbed.fields.forEach(field => {
                    embed.addFields({ name: field.name, value: field.value, inline: field.inline });
                });
            }

            await ticketChannel.send({ content: `<@${ticketCreatorId}>`, embeds: [embed], components: [updatedRow] });

            const logsChannelId = config.logsChannelId;
            const logsChannel = await interaction.guild.channels.fetch(logsChannelId);
            if (!logsChannel) {
                console.error('Logs channel not found.');
                return;
            }
    
            const logEmbed = new EmbedBuilder()
                .setColor(config.ticketCloseEmbed?.color)
                .setTitle('Ticket Closed')
                .addFields(
                    { name: 'Closed by', value: `${staffMember.tag}`, inline: false },
                    { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: false },
                    { name: 'At', value: new Date().toLocaleString(), inline: false }
                )
    
            await logsChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error('Error closing ticket:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.update({ content: 'There was an error closing the ticket. Please try again.', components: [] });
            }
        }
    }
};
