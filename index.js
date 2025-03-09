const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers, // Ensure this is included
    ]
});

// Path for the JSON file
const dataFilePath = path.join(__dirname, 'data.json');

// In-memory store for user activities.
let userActivities = {};

// Function to read data from JSON file
const loadData = () => {
    if (fs.existsSync(dataFilePath)) {
        const rawData = fs.readFileSync(dataFilePath, 'utf-8');
        userActivities = JSON.parse(rawData);
        console.log('Data loaded from data.json');
    } else {
        console.log('No data.json file found, starting with an empty store');
    }
};

// Function to save data to JSON file
const saveData = () => {
    fs.writeFileSync(dataFilePath, JSON.stringify(userActivities, null, 2), 'utf-8');
    console.log('Data saved to data.json');
};

// Discord presence update listener.
client.on('presenceUpdate', (oldPresence, newPresence) => {
    console.log('Presence update detected');
    const userId = newPresence.userId;

    // Ensure there's a valid presence
    if (!newPresence.activities || newPresence.activities.length === 0) {
        console.log(`No activities found for user: ${userId}`);

        // If the user is no longer playing anything, reset the current activity
        if (userActivities[userId]) {
            // Only shift the activities if the current activity is not "No data"
            if (userActivities[userId].activities[0].name !== "No data") {
                userActivities[userId].activities = [
                    { name: "No data", type: "No data", details: "No data" },
                    ...userActivities[userId].activities.slice(0, 3)  // Shift the activities down
                ];
            }
            console.log(`Updated activities for ${userId}:`, userActivities[userId]);
            saveData(); // Save the updated data to the file
        }

        return;
    }

    const currentActivity = newPresence.activities[0];  // Take only the most recent activity
    const currentTime = Date.now();  // Current timestamp

    // Initialize or update user activities if they don't exist yet
    if (!userActivities[userId]) {
        userActivities[userId] = {
            activities: [{ name: "No data", type: "No data", details: "No data" }, { name: "No data", type: "No data", details: "No data" }, { name: "No data", type: "No data", details: "No data" }, { name: "No data", type: "No data", details: "No data" }],
            lastActivityChange: currentTime // Track last activity change timestamp
        };
    }

    // Check if the current activity is the same as the previous one
    const prevActivity = userActivities[userId].activities[0];
    const timeDifference = currentTime - userActivities[userId].lastActivityChange;

    // Condition for "straight to the same activity" OR "1-minute interval"
    if ((prevActivity.name === currentActivity.name) || (timeDifference >= 60000)) {
        console.log('Same activity detected or 1-minute interval passed.');

        // If it's the same activity, just update the current activity without shifting
        userActivities[userId].activities[0] = { name: currentActivity.name, type: currentActivity.type, details: currentActivity.details };
        console.log(`Updated current activity for ${userId}:`, userActivities[userId]);
    } else {
        // Otherwise, shift the activities and add the new one to the top
        console.log('Activity change detected!');

        if (userActivities[userId].activities[0].name !== "No data") {
            const newActivities = [
                { name: currentActivity.name, type: currentActivity.type, details: currentActivity.details },
                ...userActivities[userId].activities.slice(0, 3)  // Keep the last 3 activities
            ];

            // Ensure there are always 4 activities, filling with "No data" if necessary
            while (newActivities.length < 4) {
                newActivities.push({ name: "No data", type: "No data", details: "No data" });
            }

            userActivities[userId].activities = newActivities;
            console.log(`Updated activities for ${userId}:`, userActivities[userId]);
        } else {
            // If the current activity is "No data", just update index 0
            userActivities[userId].activities[0] = { name: currentActivity.name, type: currentActivity.type, details: currentActivity.details };
            console.log(`Updated current activity for ${userId}:`, userActivities[userId]);
        }
    }

    // Update the last activity change timestamp
    userActivities[userId].lastActivityChange = currentTime;

    saveData(); // Save the updated data to the file
});

// When a user joins a server, initialize their activities
client.on('guildMemberAdd', member => {
    console.log(`New member joined: ${member.id}`);
    const userId = member.id;
    if (!userActivities[userId]) {
        userActivities[userId] = {
            activities: [
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" },
                { name: "No data", type: "No data", details: "No data" }
            ]
        };
        console.log(`Initialized activity tracking for new member: ${userId}`);
        saveData(); // Save the updated data to the file
    }
});

// Express route to get user activities.
app.get('/user/:id/activities', (req, res) => {
    const userId = req.params.id;
    console.log(`Received request for user: ${userId}`);

    // Check if user data exists
    const activities = userActivities[userId];
    console.log('User activities:', activities);

    // Send response with user data (or empty if no data)
    res.json(activities || {
        activities: [
            { name: "No data", type: "No data", details: "No data" },
            { name: "No data", type: "No data", details: "No data" },
            { name: "No data", type: "No data", details: "No data" },
            { name: "No data", type: "No data", details: "No data" }
        ]
    });
});

// Start the HTTP server.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HTTP server is running on port ${PORT}`);
});

// Login the Discord client.
client.login(config.token);

// Once the bot is logged in and ready, initialize user activity tracking across all servers
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Load data from the JSON file on startup
    loadData();

    // Fetch all guilds the bot is part of
    client.guilds.cache.forEach(async (guild) => {
        console.log(`Checking members in guild: ${guild.name}`);

        // Fetch all members in the guild (you may want to handle rate limits if the guild is large)
        const members = await guild.members.fetch();

        members.forEach(member => {
            const userId = member.id;
            // Initialize user activities if they don't exist
            if (!userActivities[userId]) {
                userActivities[userId] = {
                    activities: [
                        { name: "No data", type: "No data", details: "No data" },
                        { name: "No data", type: "No data", details: "No data" },
                        { name: "No data", type: "No data", details: "No data" },
                        { name: "No data", type: "No data", details: "No data" }
                    ]
                };
                console.log(`Initialized activity tracking for user: ${userId}`);
                saveData(); // Save the initialized data to the file
            }

            // Check if the member has any activity and update it
            const currentActivity = member.presence?.activities[0];  // Get the first activity

            if (currentActivity) {
                // Update activities only if the current activity is different
                if (!userActivities[userId]) {
                    userActivities[userId] = { activities: [{ name: "No data", type: "No data", details: "No data" }, { name: "No data", type: "No data", details: "No data" }, { name: "No data", type: "No data", details: "No data" }, { name: "No data", type: "No data", details: "No data" }] };
                }

                // If the current activity is new, shift it to the first position in the array
                if (userActivities[userId].activities[0].name !== currentActivity.name) {
                    const newActivities = [
                        { name: currentActivity.name, type: currentActivity.type, details: currentActivity.details },
                        ...userActivities[userId].activities.slice(0, 3)  // Keep the last 3 activities
                    ];

                    // Ensure there are always 4 activities, filling with "No data" if necessary
                    while (newActivities.length < 4) {
                        newActivities.push({ name: "No data", type: "No data", details: "No data" });
                    }

                    userActivities[userId].activities = newActivities;
                    console.log(`Updated activities for ${userId}:`, userActivities[userId]);
                    saveData(); // Save the updated data to the file
                }
            }
        });
    });
});
