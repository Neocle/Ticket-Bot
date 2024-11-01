const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Add or remove a user from the blacklist.')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Blacklist a user.')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to blacklist.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a user from the blacklist.')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to remove from the blacklist.')
                        .setRequired(true))),
    
    async execute(interaction) {
        const staffRoleId = config.staffRoleId;
        
        if (!interaction.member.roles.cache.has(staffRoleId)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');

        if (subcommand === 'add') {
            try {
                db.prepare('INSERT INTO blacklist (userId) VALUES (?)').run(user.id);
                return interaction.reply({ content: `${user.tag} has been blacklisted.`, ephemeral: true });
            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return interaction.reply({ content: `${user.tag} is already blacklisted.`, ephemeral: true });
                }
                console.error('Error blacklisting user:', error);
                return interaction.reply({ content: 'There was an error blacklisting the user.', ephemeral: true });
            }
        } else if (subcommand === 'remove') {
            try {
                const result = db.prepare('DELETE FROM blacklist WHERE userId = ?').run(user.id);
                if (result.changes === 0) {
                    return interaction.reply({ content: `${user.tag} was not found in the blacklist.`, ephemeral: true });
                }
                return interaction.reply({ content: `${user.tag} has been removed from the blacklist.`, ephemeral: true });
            } catch (error) {
                console.error('Error removing user from blacklist:', error);
                return interaction.reply({ content: 'There was an error removing the user from the blacklist.', ephemeral: true });
            }
        }
    }
};
