const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: {
        name: 'reopen_ticket'
    },
    async execute(interaction) {
        try {
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_reopen_ticket')
                    .setLabel('✅ Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel_reopen_ticket')
                    .setLabel('❌ Cancel')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                content: 'Are you sure you want to reopen this ticket?',
                components: [confirmationRow],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error requesting reopen confirmation:', error);
            await interaction.reply({ content: 'There was an error processing the request. Please try again.', ephemeral: true });
        }
    }
};
