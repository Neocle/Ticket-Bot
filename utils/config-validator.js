const dotenv = require('dotenv');
const config = require('../config.json'); // Ensure the path is correct

// Load environment variables from .env file
dotenv.config();

function checkConfig() {
    const requiredConfigFields = [
        'clientId', 'guildId', 'staffRoleId', 'adminRoleId', 'maxTicketsPerUser', 'logsChannelId', 
        'reviewsChannelId', 'closedCategoryId', 'mainColor', 'staffCanArchive',
        'app.name', 'app.url', 'app.icon', 'app.copyright', 'app.port',
        'numberOpenedTickets.id', 'numberOpenedTickets.title',
        'totalTicketsEverOpened.id', 'totalTicketsEverOpened.title',
        'averageCompleteTime.id', 'averageCompleteTime.title',
        'reviewsAverage.id', 'reviewsAverage.title',
        'panelembed.title', 'panelembed.description', 'panelembed.color', 'panelembed.thumbnail.url',
        'ticketEmbed.description', 'ticketEmbed.color',
        'ticketCloseEmbed.title', 'ticketCloseEmbed.description', 'ticketCloseEmbed.color',
        'ticketReopenEmbed.title', 'ticketReopenEmbed.description', 'ticketReopenEmbed.color',
        'reviewsDmEmbed.title', 'reviewsDmEmbed.description', 'reviewsDmEmbed.color',
        'reviewsChannelEmbed.title', 'reviewsChannelEmbed.color'
    ];

    const requiredEnvVars = [
        'TOKEN', 'CLIENT_ID', 'CLIENT_SECRET', 'SESSION_SECRET', 
        'SESSION_DATABASE', 'DATABASE'
    ];

    let missingConfigFields = [];
    let missingEnvVars = [];

    // Check required fields in the config file
    requiredConfigFields.forEach(field => {
        const keys = field.split('.');
        let value = config;
        for (let key of keys) {
            value = value && value[key];
        }

        if (value === undefined || value === null || value === '') {
            missingConfigFields.push(field);
        }
    });

    // Check required environment variables
    requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
            missingEnvVars.push(envVar);
        }
    });

    // Log results
    if (missingConfigFields.length > 0 || missingEnvVars.length > 0) {
        console.log('Missing fields detected:\n');

        if (missingConfigFields.length > 0) {
            console.log('Missing in config.json:', missingConfigFields.join(', '));
        }

        if (missingEnvVars.length > 0) {
            console.log('Missing in .env:', missingEnvVars.join(', '));
        }

        process.exit(1);
    } else {
        console.log('All required fields are filled out.');
    }
}

checkConfig();
