const { Events } = require('discord.js');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild, client) {
    try {
      console.log(`❌ غادر البوت السيرفر: ${guild.name} (${guild.id})`);

      // الاحتفاظ بإعدادات السيرفر في قاعدة البيانات
      // (يمكن إضافة خيار لحذفها لاحقاً)

      // تحديث إحصائيات البوت
      await updateBotStats(client);

    } catch (error) {
      console.error('❌ خطأ في معالجة مغادرة السيرفر:', error);
    }
  }
};

// تحديث إحصائيات البوت
async function updateBotStats(client) {
  const serverCount = client.guilds.cache.size;
  
  client.user.setActivity({
    name: `${serverCount} سيرفر | /ticket`,
    type: client.config.BOT_SETTINGS.ACTIVITY.type
  });

  console.log(`📊 إحصائيات محدثة: ${serverCount} سيرفر`);
}