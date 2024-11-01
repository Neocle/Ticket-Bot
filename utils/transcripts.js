const fs = require('fs');
const path = require('path');
const moment = require('moment');
const db = require('../database/database');
const discordTranscripts = require('discord-html-transcripts');

const transcriptsDir = path.join(__dirname, '..', 'transcripts');

if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
}

/**
 * Function to generate and save a ticket transcript as HTML using discord-html-transcripts.
 * 
 * @param {Object} ticketChannel - The ticket channel object
 * @param {Object} interaction - The interaction object from Discord.js
 * @returns {String} filePath - The path to the saved transcript file
 */
async function generateTranscript(ticketChannel, interaction) {
    try {
        const ticketData = db.prepare('SELECT userId FROM tickets WHERE channelId = ?').get(ticketChannel.id);
        if (!ticketData) {
            throw new Error('Ticket not found in the database.');
        }

        const ticketCreatorId = ticketData.userId;
        const ticketCreator = await interaction.guild.members.fetch(ticketCreatorId);

        const sanitizedTicketCreator = ticketCreator?.user?.username?.replace(/[<>:"\/\\|?*]+/g, '-') || 'UnknownUser';

        const channelNameParts = ticketChannel.name.split('│');
        const ticketPrefix = (channelNameParts.length > 1) 
            ? channelNameParts[1].split('-')[0].replace(/[<>:"\/\\|?*]+/g, '-') 
            : 'unknown';

        const currentDate = moment().format('YYYY-MM-DD_HH-mm-ss');

        const fileName = `${ticketPrefix}-${sanitizedTicketCreator}-${currentDate}.html`;
        const filePath = path.join(transcriptsDir, fileName);

        // Generate the transcript using discord-html-transcripts
        const transcript = await discordTranscripts.createTranscript(ticketChannel, {
            limit: -1, // Fetch all messages
            returnType: 'buffer', // Return as buffer to save locally
            filename: fileName,
            saveImages: true, // Saves images within the HTML file
            poweredBy: false,
            hydrate: true
        });

        // Write the HTML transcript to the specified file path
        fs.writeFileSync(filePath, transcript);

        return filePath;
    } catch (error) {
        console.error('Error generating HTML transcript:', error);
        throw error;
    }
}

module.exports = { generateTranscript };
