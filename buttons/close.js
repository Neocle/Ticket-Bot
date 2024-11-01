const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: {
        name: 'close_ticket'
    },
    async execute(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_close_ticket')
                .setLabel('✅ Confirm')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cancel_close_ticket')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            content: 'Are you sure you want to close this ticket?',
            components: [row],
            ephemeral: true
        });
    }
};
