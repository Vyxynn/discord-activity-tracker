const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');

// Import configuration from config.json
const config = require('./config.json');

// Get token, clientId, and guildId from config.json
const token = config.token;
const clientId = config.clientId;
const guildId = config.guildId;

// Create an instance of the REST module
const rest = new REST({ version: '9' }).setToken(token);

// Define your commands
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
    new SlashCommandBuilder().setName('activities').setDescription('Displays user activities')
    // Add more commands as needed
]
.map(command => command.toJSON());

// Register commands for the specific guild
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
