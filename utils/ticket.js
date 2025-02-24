const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const db = require('../database/database');

async function createTicket(interaction, category, answers) {
    try {
        const ticketCreatorId = interaction.user.id;
        const channelName = `${category.channelNameEmoji}│${category.ticketsPrefix}-${interaction.user.globalName}`;
        const createdAt = new Date().toISOString();
    
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            topic: `Ticket created by ${interaction.user.globalName} for ${category.label}`,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: config.staffRoleId,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: ticketCreatorId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                }
            ],
        });
    
        const insertTicket = db.prepare(`
            INSERT INTO tickets (userId, channelId, category, categoryId, createdAt, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
    
        insertTicket.run(ticketCreatorId, ticketChannel.id, category.label, category.id, createdAt, 'open');
    
        const mainEmbed = new EmbedBuilder()
            .setColor(config.ticketEmbed?.color || 0x0099ff)
            .setTitle(`${category.label} - ${interaction.user.globalName}`)
            .setDescription(config.ticketEmbed?.description || `Ticket created by ${interaction.user.tag}`)
            .setTimestamp(config.ticketEmbed.timestamp ? new Date(config.ticketEmbed.timestamp) : null);

        if (config.ticketEmbed?.footer?.text) {
            mainEmbed.setFooter({
                text: config.ticketEmbed.footer.text,
                iconURL: config.ticketEmbed.footer.icon_url || null,
            });
        }

        if (config.ticketEmbed?.author?.name) {
            mainEmbed.setAuthor({
                name: config.ticketEmbed.author.name,
                url: config.ticketEmbed.author.url || null,
                iconURL: config.ticketEmbed.author.icon_url || null,
            });
        }

        if (config.ticketEmbed?.thumbnail?.url) {
            mainEmbed.setThumbnail(config.ticketEmbed.thumbnail.url);
        }

        if (config.ticketEmbed?.image?.url) {
            mainEmbed.setImage(config.ticketEmbed.image.url);
        }

        if (config.ticketEmbed?.fields && config.ticketEmbed.fields.length > 0) {
            for (const field of config.ticketEmbed.fields) {
                if (field.name && field.value) { 
                    mainEmbed.addFields({
                        name: field.name,
                        value: field.value,
                        inline: field.inline || false,
                    });
                }
            }
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('✋ Claim')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Close')
                .setStyle(ButtonStyle.Danger)
        );

        const mainMessage = await ticketChannel.send({ embeds: [mainEmbed], components: [row] });

        setTimeout(async () => {
            const mentionMessage = await ticketChannel.send(`<@${ticketCreatorId}>`);
            setTimeout(() => {
                mentionMessage.delete();
            }, 1000);
        }, 3000);

        if (category.questions && category.questions.length > 0) {
            const questionsEmbed = new EmbedBuilder()
                .setColor(config.mainColor || 0x0099ff)
 
            for (const question of category.questions) {
                const answer = answers[question.customId];

                questionsEmbed.addFields({
                    name: question.label,
                    value: `\`\`\`\n${answer || 'No answer provided.'}\n\`\`\``,
                    inline: false
                });
            }

            await ticketChannel.send({ embeds: [questionsEmbed] });
        }

        if (!interaction.replied) {
            await interaction.editReply({ content: `Ticket created in ${ticketChannel}`, ephemeral: true });
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        if (!interaction.replied) {
            await interaction.reply({ content: 'An error occurred while creating the ticket. Please try again later.', ephemeral: true });
        }
    }    
}

module.exports = { createTicket };
