const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: {
        name: 'claim_ticket',
    },
    async execute(interaction) {
        const staffRoleId = config.staffRoleId;
        const staffMember = interaction.user;

        if (!interaction.member.roles.cache.has(staffRoleId)) {
            return interaction.reply({
                content: 'You do not have permission to do this.',
                ephemeral: true,
            });
        }

        const ticketChannel = interaction.channel;
        await ticketChannel.permissionOverwrites.edit(staffMember, {
            ViewChannel: true,
            SendMessages: true,
        });

        const staffRole = interaction.guild.roles.cache.get(staffRoleId);
        if (staffRole) {
            await ticketChannel.permissionOverwrites.edit(staffRole, {
                SendMessages: false,
            });
        }

        const unclaimButton = new ButtonBuilder()
            .setCustomId('unclaim_ticket')
            .setLabel('✋ Unclaim')
            .setStyle(ButtonStyle.Secondary);

        const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Close')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(unclaimButton, closeButton);

        const currentEmbed = interaction.message.embeds[0];
        let updatedDescription = currentEmbed.description || '';

        const claimText = `\n\n**Ticket claimed by:** <@${staffMember.id}> at <t:${Math.floor(Date.now() / 1000)}:F>`;
        if (!updatedDescription.includes("Ticket claimed by")) {
            updatedDescription += claimText;
        }

        const updatedEmbed = EmbedBuilder.from(currentEmbed)
            .setDescription(updatedDescription)
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
            .setTitle('Ticket Claimed')
            .addFields(
                { name: 'Claimed by', value: `<@${staffMember.id}>`, inline: false },
                { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: false },
                { name: 'At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            );

        await logsChannel.send({ embeds: [logEmbed] });
    }
};
