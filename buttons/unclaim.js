const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: {
        name: 'unclaim_ticket',
    },
    async execute(interaction) {
        const staffRoleId = config.staffRoleId;
        const adminRoleId = config.adminRoleId;
        const ticketChannel = interaction.channel;
        const staffMember = interaction.user;

        const claimedByMember = ticketChannel.permissionOverwrites.cache.some(o => 
            o.id === staffMember.id && o.allow.has(PermissionsBitField.Flags.SendMessages)
        );

        const isAdmin = interaction.member.roles.cache.has(adminRoleId);
        if (!claimedByMember && !isAdmin) {
            return interaction.reply({
                content: 'You do not have permission to unclaim this ticket.',
                ephemeral: true,
            });
        }

        const staffRole = interaction.guild.roles.cache.get(staffRoleId);
        if (staffRole) {
            await ticketChannel.permissionOverwrites.edit(staffRole, {
                SendMessages: true,
            });
        }

        await ticketChannel.permissionOverwrites.edit(staffMember, {
            SendMessages: false,
        });

        const claimButton = new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('✋ Claim')
            .setStyle(ButtonStyle.Success);

        const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Close')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

        const currentEmbed = interaction.message.embeds[0];
        let updatedDescription = (currentEmbed.description || '').replace(/\n*\*\*Ticket claimed by:.*\n?/g, '');

        const updatedEmbed = EmbedBuilder.from(currentEmbed)
            .setDescription(updatedDescription || 'Ticket unclaimed.')
            .setTimestamp(config.ticketEmbed.timestamp ? new Date(config.ticketEmbed.timestamp) : null);

        if (config.ticketEmbed?.footer?.text) {
            updatedEmbed.setFooter({
                text: config.ticketEmbed.footer.text,
                iconURL: config.ticketEmbed.footer.icon_url || null,
            });
        }

        if (config.ticketEmbed?.author?.name) {
            updatedEmbed.setAuthor({
                name: config.ticketEmbed.author.name,
                url: config.ticketEmbed.author.url || null,
                iconURL: config.ticketEmbed.author.icon_url || null,
            });
        }

        if (config.ticketEmbed?.image?.url) {
            updatedEmbed.setImage(config.ticketEmbed.image.url);
        }

        if (config.ticketEmbed?.thumbnail?.url) {
            updatedEmbed.setThumbnail(config.ticketEmbed.thumbnail.url);
        }

        await interaction.update({ embeds: [updatedEmbed], components: [row] });

        const logsChannelId = config.logsChannelId;
        const logsChannel = await interaction.guild.channels.fetch(logsChannelId);
        if (!logsChannel) {
            console.error('Logs channel not found.');
            return;
        }

        const logEmbed = new EmbedBuilder()
            .setColor(config.mainColor)
            .setTitle('Ticket Unclaimed')
            .addFields(
                { name: 'Unclaimed by', value: `${staffMember.tag}`, inline: false },
                { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: false },
                { name: 'At', value: new Date().toLocaleString(), inline: false }
            )

        await logsChannel.send({ embeds: [logEmbed] });
    }
};
