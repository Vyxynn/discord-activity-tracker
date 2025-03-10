const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const express = require('express');

// Initialize the app and the Discord client
const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers
    ]
});

// Path for the JSON file
const dataFilePath = path.join(__dirname, 'data.json');
let userActivities = {};

// Function to read data from the file
const loadData = () => {
    if (fs.existsSync(dataFilePath)) {
        try {
            const rawData = fs.readFileSync(dataFilePath, 'utf-8');
            userActivities = JSON.parse(rawData);
            console.log('Data loaded from data.json');
        } catch (error) {
            console.error('Error loading data.json, starting fresh:', error);
            userActivities = {};
        }
    } else {
        console.log('No data.json file found, starting with an empty store');
    }
};

// Function to save data to JSON file
const saveData = () => {
    fs.writeFileSync(dataFilePath, JSON.stringify(userActivities, null, 2), 'utf-8');
    console.log('Data saved to data.json');
};

// Slash command handling
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'activities') {
        const user = interaction.options.getUser('user') || interaction.user;
        const userId = user.id;

        const activities = userActivities[userId] || {
            username: "Unknown",
            activities: [
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" }
            ]
        };

        const activityText = activities.activities.map(activity => `${activity.name}: ${activity.details}`).join('\n');
        await interaction.reply(`Activities for **${activities.username}**:\n${activityText}`);
    }
});

// Define the Slash Commands
client.on('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
        new SlashCommandBuilder()
            .setName('activities')
            .setDescription('Get the activities of yourself or another user')
            .addUserOption(option => 
                option.setName('user')
                    .setDescription('The user to get activities for')
                    .setRequired(false))
    ];

    await client.application.commands.set(commands);
    console.log('Slash commands registered!');
});

// Presence update handler
client.on('presenceUpdate', (oldPresence, newPresence) => {
    console.log('Presence update detected');
    const userId = newPresence.userId;

    if (!newPresence.activities || newPresence.activities.length === 0) {
        console.log(`No activities found for user: ${userId}`);

        if (userActivities[userId]) {
            userActivities[userId].activities = [
                { name: "No data", type: "No data", details: "No data" },
                ...userActivities[userId].activities.slice(0, 3)
            ];
            console.log(`Updated activities for ${userId}:`, userActivities[userId]);
            saveData();
        }
        return;
    }

    const currentActivity = newPresence.activities[0];
    const currentTime = Date.now();

    if (!userActivities[userId]) {
        userActivities[userId] = {
            username: newPresence.user.username,
            activities: [
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" }
            ],
            lastActivityChange: currentTime
        };
    }

    const prevActivity = userActivities[userId].activities[0];
    const timeDifference = currentTime - (userActivities[userId].lastActivityChange || 0);

    if (prevActivity.name === currentActivity.name && timeDifference < 5 * 60 * 1000) {
        console.log(`Skipping update for ${userId} due to rate limit.`);
        return;
    }

    userActivities[userId].username = newPresence.user.username;

    if (prevActivity.name !== currentActivity.name) {
        console.log('Activity change detected!');
        const newActivities = [
            { name: currentActivity.name, type: currentActivity.type, details: currentActivity.details },
            ...userActivities[userId].activities.slice(0, 3)
        ];

        while (newActivities.length < 4) {
            newActivities.push({ name: "No data", type: "No data", details: "No data" });
        }

        userActivities[userId].activities = newActivities;
    } else {
        userActivities[userId].activities[0] = { name: currentActivity.name, type: currentActivity.type, details: currentActivity.details };
    }

    userActivities[userId].lastActivityChange = currentTime;
    saveData();
});

// Guild member join handler
client.on('guildMemberAdd', (member) => {
    console.log(`New member joined: ${member.id}`);
    const userId = member.id;
    if (!userActivities[userId]) {
        userActivities[userId] = {
            username: member.user.username,
            activities: [
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" }
            ]
        };
        console.log(`Initialized activity tracking for new member: ${userId}`);
        saveData();
    }
});

// Express route to get user activities
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 10, 
    message: { error: "Too many requests, please try again later." }
});
app.use('/user/:id/activities', apiLimiter);

app.get('/user/:id/activities', (req, res) => {
    const userId = req.params.id;
    console.log(`Received request for user: ${userId}`);

    const activities = userActivities[userId];

    res.json(activities || {
        username: "Unknown",
        activities: [
            { name: "No data", type: "No data", details: "No data" },
            { name: "No data", type: "No data", details: "No data" },
            { name: "No data", type: "No data", details: "No data" },
            { name: "No data", type: "No data", details: "No data" }
        ]
    });
});

// Start the HTTP server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HTTP server is running on port ${PORT}`);
});

// Login to the Discord client
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    loadData();

    client.guilds.cache.forEach(async (guild) => {
        console.log(`Checking members in guild: ${guild.name}`);

        const members = await guild.members.fetch({ withPresences: true });
        members.forEach(member => {
            if (!member.presence) return;

            const userId = member.id;
            if (!userActivities[userId]) {
                userActivities[userId] = {
                    username: member.user.username,
                    activities: [
                        { name: "No data", type: "No data", details: "No data" },
                        { name: "No data", type: "No data", details: "No data" },
                        { name: "No data", type: "No data", details: "No data" },
                        { name: "No data", type: "No data", details: "No data" }
                    ]
                };
                saveData();
            }

            const currentActivity = member.presence.activities[0];
            if (currentActivity && userActivities[userId].activities[0].name !== currentActivity.name) {
                userActivities[userId].activities = [
                    { name: currentActivity.name, type: currentActivity.type, details: currentActivity.details },
                    ...userActivities[userId].activities.slice(0, 3)
                ];
                saveData();
            }
        });
    });
});

// Login to Discord
client.login(token);
