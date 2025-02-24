const { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const { generateTranscript } = require('../utils/transcripts');
const db = require('../database/database');
const { sendFeedbackDM } = require('../utils/reviews'); 
const path = require('path');
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

module.exports = {
    data: {
        name: 'archive_ticket'
    },
    async execute(interaction) {
        try {
            // Check if the user has the staff role if staffCanArchive is enabled
            if (config.staffCanArchive && !interaction.member.roles.cache.has(config.staffRoleId)) {
                await interaction.reply({ content: 'You do not have permission to archive tickets.', ephemeral: true });
                return;
            }

            const ticketChannel = interaction.channel;
            const logsChannelId = config.logsChannelId;

            const ticketData = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(ticketChannel.id);
            if (!ticketData) {
                await interaction.reply({ content: 'Ticket data not found. This ticket might not be registered in the database.', ephemeral: true });
                return;
            }

            const ticketCreatorId = ticketData.userId;
            const ticketId = ticketData.id;
            const ticketCategory = ticketData.category;
            const createdAt = ticketData.createdAt;

            const completedAt = new Date().toISOString();

            db.prepare('UPDATE tickets SET status = ?, completedAt = ? WHERE channelId = ?')
              .run('archived', completedAt, ticketChannel.id);

            await interaction.reply({ content: 'Archiving the ticket...', ephemeral: true });

            const filePath = await generateTranscript(ticketChannel, interaction);

            const logsChannel = await interaction.guild.channels.fetch(logsChannelId);
            if (!logsChannel) {
                throw new Error('Logs channel not found.');
            }

            const ticketEmbed = new EmbedBuilder()
                .setColor(16729670)
                .setTitle(`Ticket Archive: \`${ticketChannel.name}\``)
                .addFields(
                    { name: 'Ticket ID', value: `${ticketId}`, inline: false },
                    { name: 'Ticket Creator', value: `<@${ticketCreatorId}>`, inline: false },
                    { name: 'Category', value: ticketCategory || 'N/A', inline: false },
                    { name: 'Created At', value: `<t:${Math.floor(new Date(createdAt).getTime() / 1000)}:F>`, inline: false },
                    { name: 'Completed At', value: `<t:${Math.floor(new Date(completedAt).getTime() / 1000)}:F>`, inline: false },
                    { name: 'Status', value: 'Archived', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `Ticket archived by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            const viewButton = new ButtonBuilder()
                .setLabel('View Ticket')
                .setStyle(ButtonStyle.Link)
                .setURL(`${APP_URL}/transcripts/${path.basename(filePath)}`);

            const row = new ActionRowBuilder().addComponents(viewButton);

            await logsChannel.send({
                embeds: [ticketEmbed],
                files: [filePath],
                components: [row]
            });
            
            await sendFeedbackDM(interaction.client, ticketCreatorId, ticketId);
            await ticketChannel.delete();

        } catch (error) {
            console.error('Error archiving ticket:', error);
            try {
                await interaction.followUp({ content: 'There was an error archiving the ticket. Please try again later.', ephemeral: true });
            } catch (replyError) {
                console.error('Error replying to interaction:', replyError);
            }
        }
    }
};
