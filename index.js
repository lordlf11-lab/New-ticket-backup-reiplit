const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const database = require('./systems/database');
const path = require('path');
const fs = require('fs');

class TicketBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
      ]
    });

    this.config = config;
    this.database = database;
    
    // collections للتخزين
    this.commands = new Collection();
    this.slashCommands = new Collection();
    this.cooldowns = new Collection();
    
    // أنظمة البوت
    this.ticketSystem = new (require('./systems/tickets'))(this);
    this.ticketCloser = new (require('./systems/ticketCloser'))(this);
    this.timeoutSystem = new (require('./systems/timeoutSystem'))(this);
    this.adminHelper = new (require('./systems/adminHelper'))(this);

    // ربط الأنظمة
    this.ticketSystem.timeoutSystem = this.timeoutSystem;

    // التحميل التلقائي
    this.loadEvents();
    this.loadCommands();
  }

  // تحميل الأحداث
  loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      
      if (event.once) {
        this.once(event.name, (...args) => event.execute(...args, this));
      } else {
        this.on(event.name, (...args) => event.execute(...args, this));
      }
      
      console.log(`✅ تم تحميل event: ${event.name}`);
    }
  }

  // تحميل الأوامر
  loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = path.join(commandsPath, folder);
      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
          this.slashCommands.set(command.data.name, command);
          console.log(`✅ تم تحميل command: ${command.data.name}`);
        } else {
          console.log(`❌ أمر ناقص في: ${filePath}`);
        }
      }
    }
  }

  // بدء البوت
  async start() {
    try {
      // الاتصال بقاعدة البيانات
      await this.database.connect();
      
      // تسجيل الدخول
      await this.login(this.config.TOKEN);
      
      console.log(`✅ ${this.user.tag} يعمل الآن!`);
      
    } catch (error) {
      console.error('❌ خطأ في بدء البوت:', error);
      process.exit(1);
    }
  }
}

// إنشاء وتشغيل البوت
const bot = new TicketBot();
bot.start();

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (error) => {
  console.error('❌ خطأ غير معالج:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ استثناء غير معالج:', error);
  process.exit(1);
});