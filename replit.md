# Discord Ticket Bot

## Overview
This is a multi-server Discord ticket bot that helps manage support tickets across multiple Discord servers. Built with Discord.js v14 and MongoDB for persistent data storage.

## Project Structure
- `index.js` - Main bot entry point and initialization
- `config.js` - Bot configuration and settings
- `commands/` - Discord slash commands organized by category
  - `config/` - Configuration commands
  - `management/` - Bot management commands (stats, reset)
  - `setup/` - Server setup commands
  - `ticket/` - Ticket system commands
  - `utility/` - Utility commands (help, embed, etc.)
- `events/` - Discord event handlers
- `models/` - MongoDB/Mongoose data models
- `systems/` - Core bot systems (tickets, database, etc.)

## Recent Setup (Nov 9, 2025)
- Imported project from GitHub
- Installed Node.js 20 and all dependencies
- Configured workflow to run the bot
- Added .gitignore for Node.js project
- Installed system dependencies (libuuid for canvas support)

## Configuration Required

### Environment Variables
The bot requires two environment secrets to be configured in Replit Secrets:

1. **DISCORD_BOT_TOKEN** - Your Discord bot token
   - Get from: https://discord.com/developers/applications
   - Format: Just the token string (e.g., `MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GxYzAb...`)

2. **MONGO_URI** - MongoDB connection string
   - Get from: MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
   - **Important**: Must start with `mongodb://` or `mongodb+srv://`
   - Example format: `mongodb+srv://username:password@cluster.mongodb.net/ticketbot`
   - **Do NOT** include "MONGO_URI=" in the value, just the connection string itself

### Current Issue
The MONGO_URI secret appears to have been set with "MONGO_URI=" prefix in the value. It needs to be updated to contain only the MongoDB connection string starting with "mongodb://" or "mongodb+srv://".

## Tech Stack
- **Runtime**: Node.js 20
- **Discord Library**: discord.js v14
- **Database**: MongoDB (via Mongoose)
- **Image Generation**: Canvas
- **Voice Support**: @discordjs/voice

## Bot Features
- Multi-server ticket system
- Custom ticket categories
- Automated ticket management
- Server statistics tracking
- Admin helper tools
- Customizable embed messages
- Member join/update events
- Complaint/support channels

## Running the Bot
The bot runs automatically via the "Discord Bot" workflow which executes `npm start`.

To manually start: `npm start`
For development with auto-reload: `npm run dev`

## Database
Uses MongoDB for storing:
- Server configurations
- Ticket data
- Statistics
- User data across multiple servers

Each server (guild) has independent settings and ticket data.
