const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js'); // Ensure correct imports
const db = require('../database/database'); // Ensure this path is correct
const config = require('../config.json');

async function sendFeedbackDM(client, userId, ticketId) {
    try {
        const user = await client.users.fetch(userId);

        const embed = new EmbedBuilder()
            .setColor(config.reviewsDmEmbed?.color || 0x0099ff)
            .setTitle(config.reviewsDmEmbed?.title || 'Feedback Request')
            .setDescription(config.reviewsDmEmbed?.description || 'Please rate the support you received.')
            .setTimestamp(config.reviewsDmEmbed?.timestamp ? new Date(config.reviewsDmEmbed.timestamp) : new Date());

        if (config.reviewsDmEmbed?.footer) {
            embed.setFooter({
                text: config.reviewsDmEmbed.footer.text,
                iconURL: config.reviewsDmEmbed.footer.icon_url,
            });
        }

        if (config.reviewsDmEmbed?.author) {
            embed.setAuthor({
                name: config.reviewsDmEmbed.author.name,
                url: config.reviewsDmEmbed.author.url,
                iconURL: config.reviewsDmEmbed.author.icon_url,
            });
        }

        if (config.reviewsDmEmbed?.thumbnail?.url) {
            embed.setThumbnail(config.reviewsDmEmbed.thumbnail.url);
        }

        if (config.reviewsDmEmbed?.image?.url) {
            embed.setImage(config.reviewsDmEmbed.image.url);
        }

        if (config.reviewsDmEmbed?.fields) {
            config.reviewsDmEmbed.fields.forEach(field => {
                embed.addFields({ name: field.name, value: field.value, inline: field.inline });
            });
        }

        const ratingMenu = new StringSelectMenuBuilder()
            .setCustomId(`feedback_rating_${ticketId}`)
            .setPlaceholder(config.reviewsDmEmbed?.ratingPlaceholder || 'Select your rating (1-5 stars)')
            .addOptions([
                { label: '1 Star', value: '1' },
                { label: '2 Stars', value: '2' },
                { label: '3 Stars', value: '3' },
                { label: '4 Stars', value: '4' },
                { label: '5 Stars', value: '5' },
            ]);

        const actionRow = new ActionRowBuilder().addComponents(ratingMenu);

        await user.send({ embeds: [embed], components: [actionRow] });

    } catch (error) {
        console.error('Error sending feedback DM:', error);
    }
}

async function sendFeedbackToChannel(client, userId, rating, comment, ticketId) {
    try {
        const reviewsChannel = await client.channels.fetch(config.reviewsChannelId);

        if (!reviewsChannel) {
            console.error('Reviews channel not found.');
            return;
        }

        const reviewsEmbed = new EmbedBuilder()
            .setColor(config.reviewsChannelEmbed?.color || 0x0099ff)
            .setTitle(config.reviewsChannelEmbed?.title || 'New Feedback Received')
            .setDescription(`**Ticket ID**: ${ticketId}\n**User**: <@${userId}>\n**Rating**: ${'⭐'.repeat(rating)}${'☆'.repeat(5 - rating)}\n**Comment**:\n\`\`\`${comment || 'No comment provided.'}\`\`\``)
            .setTimestamp(config.reviewsChannelEmbed?.timestamp ? new Date(config.reviewsChannelEmbed.timestamp) : null);
    
        if (config.reviewsChannelEmbed?.footer) {
            reviewsEmbed.setFooter({
                text: config.reviewsChannelEmbed.footer.text,
                iconURL: config.reviewsChannelEmbed.footer.icon_url,
            });
        }

        if (config.reviewsChannelEmbed?.author) {
            reviewsEmbed.setAuthor({
                name: config.reviewsChannelEmbed.author.name,
                url: config.reviewsChannelEmbed.author.url,
                iconURL: config.reviewsChannelEmbed.author.icon_url,
            });
        }

        if (config.reviewsChannelEmbed?.thumbnail?.url) {
            reviewsEmbed.setThumbnail(config.reviewsChannelEmbed.thumbnail.url);
        }

        if (config.reviewsChannelEmbed?.image?.url) {
            reviewsEmbed.setImage(config.reviewsChannelEmbed.image.url);
        }

        if (config.reviewsChannelEmbed?.fields) {
            config.reviewsChannelEmbed.fields.forEach(field => {
                reviewsEmbed.addFields({ name: field.name, value: field.value, inline: field.inline });
            });
        }

        await reviewsChannel.send({ embeds: [reviewsEmbed] });

    } catch (error) {
        console.error('Error sending feedback to the reviews channel:', error);
    }
}


module.exports = {
    sendFeedbackDM,
    sendFeedbackToChannel
};
