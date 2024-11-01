const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const db = require('../database/database');

module.exports = {
    data: {
        name: 'confirm_reopen_ticket'
    },
    async execute(interaction) {
        try {
            if (interaction.replied || interaction.deferred) {
                console.warn('This interaction has already been replied to.');
                return; 
            }
            const ticketChannel = interaction.channel;
            const staffMember = interaction.user;
            const ticketData = db.prepare('SELECT userId, categoryId FROM tickets WHERE channelId = ?').get(ticketChannel.id);
            const ticketCreatorId = ticketData?.userId;
            const originalCategoryId = ticketData?.categoryId;

            if (!ticketCreatorId || !originalCategoryId) {
                throw new Error('Ticket creator or original category not found in the database.');
            }

            await ticketChannel.setParent(originalCategoryId, { lockPermissions: false });
            db.prepare('UPDATE tickets SET status = ? WHERE channelId = ?').run('open', ticketChannel.id);

            await ticketChannel.permissionOverwrites.edit(ticketCreatorId, {
                SendMessages: true,
            });

            const embed = new EmbedBuilder()
                .setColor(config.ticketReopenEmbed?.color || 0x0099ff)
                .setTitle(config.ticketReopenEmbed?.title || 'Ticket was re-opened')
                .setDescription(config.ticketReopenEmbed?.description || 'You can now talk again.')
                .setTimestamp(config.ticketReopenEmbed?.timestamp ? new Date(config.ticketReopenEmbed.timestamp) : null);

            if (config.ticketReopenEmbed?.footer) {
                embed.setFooter({
                    text: config.ticketReopenEmbed.footer.text,
                    iconURL: config.ticketReopenEmbed.footer.icon_url,
                });
            }

            if (config.ticketReopenEmbed?.author) {
                embed.setAuthor({
                    name: config.ticketReopenEmbed.author.name,
                    url: config.ticketReopenEmbed.author.url,
                    iconURL: config.ticketReopenEmbed.author.icon_url,
                });
            }

            if (config.ticketReopenEmbed?.thumbnail?.url) {
                embed.setThumbnail(config.ticketReopenEmbed.thumbnail.url);
            }

            if (config.ticketReopenEmbed?.image?.url) {
                embed.setImage(config.ticketReopenEmbed.image.url);
            }

            if (config.ticketReopenEmbed?.fields) {
                config.ticketReopenEmbed.fields.forEach(field => {
                    embed.addFields({ name: field.name, value: field.value, inline: field.inline });
                });
            }

            const messages = await ticketChannel.messages.fetch({ limit: 10 });
            const closedEmbedMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title === (config.ticketCloseEmbed?.title || 'Ticket was closed'));

            if (closedEmbedMessage) {
                const updatedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('archive_ticket')
                        .setLabel('🗃️ Archive')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('reopen_ticket')
                        .setLabel('🔓 Reopen')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true)
                );

                await interaction.update({ content: "You successfully re-opened the ticket.", ephemeral: true, components: [] });
                await closedEmbedMessage.edit({ components: [updatedRow] });
            }

            await ticketChannel.send({ content: `<@${ticketCreatorId}>`, embeds: [embed], components: [] });

            const logsChannelId = config.logsChannelId;
            const logsChannel = await interaction.guild.channels.fetch(logsChannelId);
            if (!logsChannel) {
                console.error('Logs channel not found.');
                return;
            }

            const logEmbed = new EmbedBuilder()
                .setColor(config.ticketReopenEmbed?.color)
                .setTitle('Ticket Re-opened')
                .addFields(
                    { name: 'Re-opened by', value: `${staffMember.tag}`, inline: false },
                    { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: false },
                    { name: 'At', value: new Date().toLocaleString(), inline: false }
                );

            await logsChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error('Error reopening ticket:', error);
            await interaction.reply({ content: 'There was an error reopening the ticket. Please try again.', ephemeral: true });
        }
    }
};
