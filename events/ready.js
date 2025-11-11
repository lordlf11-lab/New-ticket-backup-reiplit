const { Events } = require('discord.js');
const { BOT_SETTINGS } = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ ${client.user.tag} يعمل الآن!`);

    // تعيين حالة البوت
    client.user.setPresence({
      status: BOT_SETTINGS.STATUS,
      activities: [BOT_SETTINGS.ACTIVITY]
    });

    // تسجيل الأوامر السلاش globally
    try {
      const commandsArray = Array.from(client.slashCommands.values()).map(cmd => cmd.data);
      await client.application.commands.set(commandsArray);
      console.log(`✅ تم تسجيل ${commandsArray.length} أمر سلاش globally`);
    } catch (error) {
      console.error('❌ خطأ في تسجيل الأوامر:', error);
    }

    // تحديث إحصائيات السيرفرات
    const serverCount = client.guilds.cache.size;
    console.log(`🔄 البوت في ${serverCount} سيرفر`);

    // تحديث نشاط البوت بعدد السيرفرات
    client.user.setActivity({
      name: `${serverCount} سيرفر | /ticket`,
      type: BOT_SETTINGS.ACTIVITY.type
    });

    // بدء خدمات الخلفية
    startBackgroundServices(client);
  }
};

// خدمات الخلفية
function startBackgroundServices(client) {
  // تنظيف التذاكر المغلقة من الذاكرة كل ساعة
  setInterval(() => {
    const now = Date.now();
    for (const [channelId, timeout] of client.ticketTimeouts) {
      if (timeout.timestamp && (now - timeout.timestamp) > 3600000) { // ساعة
        client.ticketTimeouts.delete(channelId);
      }
    }
    console.log('🔄 تم تنظيف ذاكرة التذاكر');
  }, 3600000); // كل ساعة

  // تحديث إحصائيات البوت كل 30 دقيقة
  setInterval(async () => {
    try {
      const serverCount = client.guilds.cache.size;
      const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      
      console.log(`📊 إحصائيات البوت: ${serverCount} سيرفر, ${totalMembers} عضو`);
      
      // تحديث النشاط
      client.user.setActivity({
        name: `${serverCount} سيرفر | /ticket`,
        type: BOT_SETTINGS.ACTIVITY.type
      });
    } catch (error) {
      console.error('❌ خطأ في تحديث الإحصائيات:', error);
    }
  }, 1800000); // كل 30 دقيقة
}
