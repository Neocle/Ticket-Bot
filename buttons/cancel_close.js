module.exports = {
    data: {
        name: 'cancel_close_ticket'
    },
    async execute(interaction) {
        await interaction.update({
            content: 'Ticket close operation canceled.',
            components: []
        });
    }
};
