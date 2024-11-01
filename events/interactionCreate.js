const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, Events, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { createTicket } = require('../utils/ticket');
const db = require('../database/database'); // Import the database
const { sendFeedbackToChannel } = require('../utils/reviews')

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'create_ticket') {
                    const selectedCategory = config.ticketCategories.find(category => category.value === interaction.values[0]);

                    if (!selectedCategory) {
                        console.error('Selected category not found:', interaction.values[0]);
                        return interaction.reply({ content: 'Category not found.', ephemeral: true });
                    }

                    if (!Array.isArray(selectedCategory.questions)) {
                        console.error(`Questions property is not valid for category: ${selectedCategory.value}`);
                        return interaction.reply({ content: 'No questions defined for this category.', ephemeral: true });
                    }

                    const isBlacklistedQuery = db.prepare(`SELECT COUNT(*) AS count FROM blacklist WHERE userId = ?`);
                    const { count: isBlacklisted } = isBlacklistedQuery.get(interaction.user.id);

                    if (isBlacklisted > 0) {
                        return await interaction.reply({ 
                            content: 'You are not allowed to open a ticket because you are blacklisted.', 
                            ephemeral: true 
                        });
                    }

                    const ticketCreatorId = interaction.user.id;
                    const openTicketsQuery = db.prepare(`SELECT COUNT(*) AS count FROM tickets WHERE userId = ?`);
                    const { count } = openTicketsQuery.get(ticketCreatorId);

                    if (count >= config.maxTicketsPerUser) { 
                        return await interaction.reply({ 
                            content: `You cannot have more than ${config.maxTicketsPerUser} open tickets at the same time.`, 
                            ephemeral: true 
                        });
                    }

                    if (selectedCategory.questions.length === 0) {
                        await interaction.deferReply({ ephemeral: true });
                        await createTicket(interaction, selectedCategory, {});
                        return;
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_modal_${selectedCategory.value}`) 
                        .setTitle(`${selectedCategory.label} - Ticket`);

                    selectedCategory.questions.forEach(question => {
                        const textInput = new TextInputBuilder()
                            .setCustomId(question.customId)
                            .setLabel(question.label)
                            .setPlaceholder(question.placeholder)
                            .setRequired(true)
                            .setStyle(question.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short);

                        const actionRow = new ActionRowBuilder().addComponents(textInput);
                        modal.addComponents(actionRow);
                    });

                    return interaction.showModal(modal);
                }

                else if (interaction.customId.startsWith('feedback_rating')) {
                    const ticketId = interaction.customId.split('_')[2];
                
                    const rating = interaction.values[0];
                
                    if (!interaction.client.ratingCache) interaction.client.ratingCache = {};
                    interaction.client.ratingCache[interaction.user.id] = { rating, ticketId };
                
                    const modal = new ModalBuilder()
                        .setCustomId(`feedback_comment_${ticketId}`)
                        .setTitle('Feedback Comment');
                
                    const commentInput = new TextInputBuilder()
                        .setCustomId('feedback_comment_input')
                        .setLabel('Additional Comments')
                        .setPlaceholder('Enter your comments here')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Paragraph);
                
                    const actionRow = new ActionRowBuilder().addComponents(commentInput);
                    modal.addComponents(actionRow);
                
                    await interaction.showModal(modal);
                    return;
                }                              
            }

            else if (interaction.isModalSubmit()) {
                const customIdParts = interaction.customId.split('_');
            
                if (customIdParts[0] === 'ticket') {
                    const categoryValue = customIdParts[2];
                    const selectedCategory = config.ticketCategories.find(category => category.value === categoryValue);
            
                    if (!selectedCategory) {
                        console.error('Selected category not found for modal submission:', categoryValue);
                        return interaction.reply({ content: 'Category not found for this ticket.', ephemeral: true });
                    }
            
                    const answers = {};
                    selectedCategory.questions.forEach(question => {
                        const value = interaction.fields.getTextInputValue(question.customId);
                        answers[question.customId] = value;
                    });
            
                    const isBlacklistedQuery = db.prepare(`SELECT COUNT(*) AS count FROM blacklist WHERE userId = ?`);
                    const { count: isBlacklisted } = isBlacklistedQuery.get(interaction.user.id);
            
                    if (isBlacklisted > 0) {
                        return await interaction.reply({ 
                            content: 'You are not allowed to open a ticket because you are blacklisted.', 
                            ephemeral: true 
                        });
                    }
            
                    const ticketCreatorId = interaction.user.id;
                    const openTicketsQuery = db.prepare(`SELECT COUNT(*) AS count FROM tickets WHERE userId = ?`);
                    const { count } = openTicketsQuery.get(ticketCreatorId);
            
                    if (count >= config.maxTicketsPerUser) {
                        return await interaction.reply({ 
                            content: `You cannot have more than ${config.maxTicketsPerUser} open tickets at the same time.`, 
                            ephemeral: true 
                        });
                    }
            
                    await interaction.deferReply({ ephemeral: true });
                    await createTicket(interaction, selectedCategory, answers);
                    return;
                }
            
                else if (customIdParts[0] === 'feedback') {
                    const ticketId = customIdParts[2];
                
                    const feedbackQuery = db.prepare(`SELECT COUNT(*) AS count FROM reviews WHERE userId = ? AND ticketId = ?`);
                    const { count: feedbackExists } = feedbackQuery.get(interaction.user.id, ticketId);
                
                    if (feedbackExists > 0) {
                        return await interaction.reply({
                            content: 'You have already submitted feedback for this ticket.',
                            ephemeral: true
                        });
                    }
                
                    const cachedRating = interaction.client.ratingCache[interaction.user.id];
                    
                    if (!cachedRating) {
                        return await interaction.reply({
                            content: 'There was an issue retrieving your rating. Please try again.',
                            ephemeral: true
                        });
                    }
                
                    const ratingValue = cachedRating.rating;
                
                    const comment = interaction.fields.getTextInputValue('feedback_comment_input');

                    db.prepare(`INSERT INTO reviews (userId, ticketId, rating, comment) VALUES (?, ?, ?, ?)`)
                        .run(interaction.user.id, ticketId, ratingValue, comment);
                    
                    delete interaction.client.ratingCache[interaction.user.id];
                
                    await sendFeedbackToChannel(interaction.client, interaction.user.id, ratingValue, comment, ticketId);
                
                    const confirmationEmbed = new EmbedBuilder()
                    .setColor(config.mainColor || 0x0099ff)
                    .setTitle('Thank you for your feedback!')
                    .setDescription(`You rated us **${'⭐'.repeat(ratingValue)}${'☆'.repeat(5 - ratingValue)}**.\nYour comment:\n\`\`\`${comment || 'No comment provided.'}\`\`\``)
                    .setTimestamp(config.reviewsDmEmbed.timestamp ? new Date(config.reviewsDmEmbed.timestamp) : null);
                
                    await interaction.reply({ embeds: [confirmationEmbed], ephemeral: true });
                }                                              
            }                 

            else if (interaction.isCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (command) {
                    await interaction.deferReply({ ephemeral: true });
                    await command.execute(interaction);
                }
            }
        } catch (error) {
            console.error('Error during interaction handling:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An unexpected error occurred.', ephemeral: true });
            }
        }
    }
};
