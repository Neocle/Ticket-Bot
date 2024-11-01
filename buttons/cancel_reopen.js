module.exports = {
    data: {
        name: 'cancel_reopen_ticket'
    },
    async execute(interaction) {
        await interaction.update({ content: 'Reopen action has been canceled.', components: [] });
    }
};
