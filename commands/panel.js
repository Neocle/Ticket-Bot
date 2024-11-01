const { SlashCommandBuilder, ActionRowBuilder, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Send a ticket creation panel to a specific channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the ticket panel to')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)
        ),
    async execute(interaction) {
        const adminRoleId = config.adminRoleId;
        if (!interaction.member.roles.cache.has(adminRoleId)) {
            return interaction.reply({
                content: 'You do not have permission to run this command.',
                ephemeral: true,
            });
        }

        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        const embed = new EmbedBuilder()
        
            .setColor(config.panelembed.color || 0x0099ff)
            .setTitle(config.panelembed.title || 'Create a Ticket')
            .setDescription(config.panelembed.description || 'Choose a support category and click the button below to create a support ticket.')
            .setURL(config.panelembed.url || null) 
            .setThumbnail(config.panelembed.thumbnail?.url || null)
            .setImage(config.panelembed.image?.url || null)
            .setTimestamp(config.panelembed.timestamp ? new Date(config.panelembed.timestamp) : null);

        if (config.panelembed.footer) {
            embed.setFooter({
                text: config.panelembed.footer.text,
                iconURL: config.panelembed.footer.icon_url || null
            });
        }

        if (config.panelembed.author) {
            embed.setAuthor({
                name: config.panelembed.author.name,
                url: config.panelembed.author.url || null,
                iconURL: config.panelembed.author.icon_url || null
            });
        }

        if (config.panelembed.fields && Array.isArray(config.panelembed.fields)) {
            config.panelembed.fields.forEach(field => {
                if (field.name && field.value) {
                    embed.addFields({ 
                        name: field.name, 
                        value: field.value, 
                        inline: field.inline || false
                    });
                }
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('create_ticket')
            .setPlaceholder('Select a category to create a ticket');

        config.ticketCategories.forEach(category => {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(category.label)
                    .setDescription(category.description)
                    .setValue(category.value)
                    .setEmoji(category.emoji)
            );
        });

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `Ticket panel sent to ${targetChannel}`, ephemeral: true });
        } catch (error) {
            console.error('Error sending panel:', error);
            await interaction.reply({ content: 'Failed to send the ticket panel.', ephemeral: true });
        }
    },
};
