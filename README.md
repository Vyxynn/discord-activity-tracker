# Discord Activity Tracker

This is a Discord bot and web service that tracks and displays user activity (like playing games or listening to music) within the Discord servers it is a part of. It uses `discord.js` to connect to Discord, `express` for the HTTP server, and stores user activities in a JSON file.

## Features

- Tracks user activities (games, music, etc.) on Discord.
- Provides a simple web API to query user activities.
- Saves user activities in a local `data.json` file.
- Automatically initializes and updates user activity data upon logging in or when a new member joins a server.

## Installation

1. **Clone this repository:**

   ```bash
   git clone https://github.com/Vyxynn/discord-activity-tracker.git
   cd discord-activity-tracker
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create a `config.json` file** in the root directory with your bot’s token:

   ```json
   {
     "token": "YOUR_DISCORD_BOT_TOKEN"
   }
   ```

4. **Start the bot:**

   ```bash
   node index.js
   ```

   The bot will start logging in and begin tracking user activities on Discord.

## API

### Get User Activities

You can get the last 4 activities of a user by sending a `GET` request to the following endpoint:

```
GET /user/:id/activities
```

- `:id` - The Discord user ID.

Example:

```bash
curl http://localhost:3000/user/123456789012345678/activities
```

Response example:

```json
{
  "activities": [
    { "name": "Game 1", "type": "Playing", "details": "Level 10" },
    { "name": "Game 2", "type": "Playing", "details": "Level 5" },
    { "name": "No data", "type": "No data", "details": "No data" },
    { "name": "No data", "type": "No data", "details": "No data" }
  ]
}
```

If no activity is found for the user, the response will return "No data".

## License

This project is licensed under the **GNU GENERAL PUBLIC LICENSE** Version 3, 29 June 2007. See [LICENSE](LICENSE) for more details.

## Notes

- The bot saves user activities in a local `data.json` file.
- If no activity data is found for a user, the bot will initialize it with a default set of "No data".
- You can extend the code to track more activities or customize the web service as needed.

## Contributing

Feel free to fork the project, make changes, and submit pull requests. If you have any suggestions or bug fixes, please open an issue on the repository.

---

**Disclaimer:** This bot does not store or share personal information. Activities are tracked for the purpose of this bot's functionality.