// statistics.js

const db = require('../database/database');
const config = require('../config.json');

const updateStatistics = async (client) => {
    try {
        const totalOpenedTickets = db.prepare('SELECT COUNT(*) FROM tickets WHERE status = ?').get('open')['COUNT(*)'];
        const totalCompletedTickets = db.prepare('SELECT COUNT(*) FROM tickets WHERE status = ?').get('archived')['COUNT(*)'];
        const totalTicketsEverOpened = db.prepare('SELECT COUNT(*) FROM tickets').get()['COUNT(*)'];

        const completedTickets = db.prepare('SELECT completedAt, createdAt FROM tickets WHERE status = ?').all('archived');
        const averageCompleteTime = completedTickets.length > 0 
            ? (completedTickets.reduce((total, ticket) => total + (new Date(ticket.completedAt) - new Date(ticket.createdAt)), 0) / completedTickets.length) / 60000 
            : 0;

        const reviews = db.prepare('SELECT rating FROM reviews').all();
        const reviewsAverage = reviews.length > 0 
            ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) 
            : 0;

        if (config.numberOpenedTickets) {
            const openedChannel = await client.channels.fetch(config.numberOpenedTickets.id);
            if (openedChannel) {
                await openedChannel.setName(`${config.numberOpenedTickets.title} ${totalOpenedTickets}`);
            }
        }

        if (config.numberCompletedTickets) {
            const completedChannel = await client.channels.fetch(config.numberCompletedTickets.id);
            if (completedChannel) {
                await completedChannel.setName(`${config.numberCompletedTickets.title} ${totalCompletedTickets}`);
            }
        }

        if (config.totalTicketsEverOpened) {
            const totalChannel = await client.channels.fetch(config.totalTicketsEverOpened.id);
            if (totalChannel) {
                await totalChannel.setName(`${config.totalTicketsEverOpened.title} ${totalTicketsEverOpened}`);
            }
        }

        if (config.averageCompleteTime) {
            const avgTimeChannel = await client.channels.fetch(config.averageCompleteTime.id);
            if (avgTimeChannel) {
                await avgTimeChannel.setName(`${config.averageCompleteTime.title} ${averageCompleteTime.toFixed(2)} min`);
            }
        }

        if (config.reviewsAverage) {
            const reviewsAvgChannel = await client.channels.fetch(config.reviewsAverage.id);
            if (reviewsAvgChannel) {
                await reviewsAvgChannel.setName(`${config.reviewsAverage.title} ${reviewsAverage.toFixed(2)} /5`);
            }
        }

    } catch (error) {
        console.error('Error updating statistics:', error);
    }
};

const startStatisticsUpdater = (client) => {
    updateStatistics(client);
    setInterval(() => updateStatistics(client), 10 * 60 * 1000);
};

module.exports = startStatisticsUpdater;
