const mongoose = require('mongoose');
const config = require('../config');

class Database {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      await mongoose.connect(config.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      this.isConnected = true;
      console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
      
      // تحديث حالة الاتصال
      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        console.log('❌ فقدان الاتصال بقاعدة البيانات');
      });
      
      mongoose.connection.on('reconnected', () => {
        this.isConnected = true;
        console.log('✅ إعادة الاتصال بقاعدة البيانات');
      });
      
    } catch (error) {
      console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ تم قطع الاتصال بقاعدة البيانات');
    }
  }

  // دالة للحصول على إعدادات السيرفر
  async getServerSettings(guildId) {
    try {
      const Server = require('../models/Server');
      let settings = await Server.findOne({ guildId });
      
      if (!settings) {
        // إنشاء إعدادات افتراضية للسيرفر الجديد
        settings = new Server({
          guildId,
          ticketSettings: {},
          logChannels: {},
          messages: {},
          statistics: { totalTickets: 0, openedTickets: 0, closedTickets: 0 }
        });
        await settings.save();
        console.log(`✅ تم إنشاء إعدادات جديدة للسيرفر: ${guildId}`);
      }
      
      return settings;
    } catch (error) {
      console.error('❌ خطأ في جلب إعدادات السيرفر:', error);
      return null;
    }
  }

  // دالة تحديث إعدادات السيرفر
  async updateServerSettings(guildId, updates) {
    try {
      const Server = require('../models/Server');
      const result = await Server.findOneAndUpdate(
        { guildId },
        { $set: updates },
        { new: true, upsert: true }
      );
      return result;
    } catch (error) {
      console.error('❌ خطأ في تحديث إعدادات السيرفر:', error);
      return null;
    }
  }
}

module.exports = new Database();
