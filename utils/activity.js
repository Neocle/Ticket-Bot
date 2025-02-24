// activity.js
const { ActivityType } = require('discord.js');
const db = require('../database/database');

const updateBotActivity = async (client) => {
    try {
        const totalOpenedTickets = db.prepare('SELECT COUNT(*) FROM tickets WHERE status = ?').get('open')['COUNT(*)'];
        const totalCompletedTickets = db.prepare('SELECT COUNT(*) FROM tickets WHERE status = ?').get('archived')['COUNT(*)'];
        const totalTicketsEverOpened = db.prepare('SELECT COUNT(*) FROM tickets').get()['COUNT(*)'];
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
        const completedTickets = db.prepare('SELECT completedAt, createdAt FROM tickets WHERE status = ?').all('archived');
        const averageCompleteTime = completedTickets.length > 0 
            ? ((completedTickets.reduce((total, ticket) => total + (new Date(ticket.completedAt) - new Date(ticket.createdAt)), 0) / completedTickets.length) / (60 * 60 * 1000)).toFixed(2) 
            : "0.00";

        const reviews = db.prepare('SELECT rating FROM reviews').all();
        const reviewsAverage = reviews.length > 0 
            ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) 
            : 0;

        const statuses = [
            `${totalOpenedTickets} open tickets`,
            `${totalCompletedTickets} completed tickets`,
            `${totalMembers} members`,
            `${totalTicketsEverOpened} tickets ever opened`,
            `${averageCompleteTime}hours average completion time`,
            `${reviewsAverage}⭐ average rating`
        ];

        let currentStatusIndex = 0;

        client.user.setActivity(statuses[currentStatusIndex], { type: ActivityType.Watching });
        currentStatusIndex = (currentStatusIndex + 1) % statuses.length;

        setInterval(() => {
            client.user.setActivity(statuses[currentStatusIndex], { type: ActivityType.Watching });
            currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
        }, 3 * 60 * 1000);
    } catch (error) {
        console.error('Error updating bot activity:', error);
    }
};

const startActivityUpdater = (client) => {
    updateBotActivity(client);
};

module.exports = startActivityUpdater;
