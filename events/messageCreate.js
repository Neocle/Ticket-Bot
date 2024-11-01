const db = require('../database/database');
const closureTimeouts = require('../commands/alert').closureTimeouts;

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const ticketData = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(message.channel.id);

        if (!ticketData || ticketData.status !== 'open') return;

        if (closureTimeouts && closureTimeouts.has(message.channel.id)) {
            clearTimeout(closureTimeouts.get(message.channel.id));
            closureTimeouts.delete(message.channel.id);

            await message.channel.send(`The automatic closure has been canceled due to recent activity, <@${ticketData.userId}>.`);
        }
    },
};
