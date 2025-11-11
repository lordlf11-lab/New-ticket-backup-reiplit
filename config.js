const { config } = require('dotenv');
config();

module.exports = {
  TOKEN: process.env.DISCORD_BOT_TOKEN,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/ticketbot',
  
  // إعدادات عامة
  DEFAULT_PREFIX: '$',
  DEVELOPERS: ['YOUR_USER_ID'],
  
  // إعدادات البوت العامة
  BOT_SETTINGS: {
    STATUS: 'online',
    ACTIVITY: {
      name: 'Multi-Server Ticket Bot',
      type: 1 // 0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching
    }
  },
  
  // الألوان
  COLORS: {
    PRIMARY: '#da2424',
    SUCCESS: '#00ff00',
    WARNING: '#ff9900',
    ERROR: '#ff0000'
  },
  
  // الروابط
  IMAGES: {
    TICKET_BANNER: 'https://i.thteam.me/0M9azgCUEs.jpg',
    COMPLAINT_BANNER: 'https://i.thteam.me/ZjJBBPJgyl.jpg',
    LINE_IMAGE: 'https://i.thteam.me/XUKGig4Ob7.png'
  }
};