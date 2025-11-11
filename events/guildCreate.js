const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {
    try {
      console.log(`✅ انضم البوت إلى سيرفر جديد: ${guild.name} (${guild.id})`);

      // إنشاء إعدادات افتراضية للسيرفر
      const serverSettings = await client.database.getServerSettings(guild.id);
      
      // إرسال رسالة ترحيب إلى المالك
      await sendWelcomeMessage(guild, client);

      // تحديث إحصائيات البوت
      await updateBotStats(client);

    } catch (error) {
      console.error('❌ خطأ في معالجة انضمام السيرفر:', error);
    }
  }
};

// إرسال رسالة ترحيب
async function sendWelcomeMessage(guild, client) {
  try {
    const owner = await guild.fetchOwner();
    
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('🎉 شكراً لإضافتي!')
      .setDescription(`
        **مرحباً ${owner.user.username}!**

        شكراً لإضافتي إلى **${guild.name}**!

        **🎯 لبدء الاستخدام:**
        1. استخدم \`/setup\` لإعداد البوت
        2. استخدم \`/ticket\` لفتح نظام التذاكر
        3. استخدم \`/help\` للمساعدة

        **📁 المميزات المتاحة:**
        • نظام تذاكر متكامل
        • لوجات تلقائية
        • إحصائيات مفصلة
        • إعدادات مرنة

        **🔧 الدعم الفني:**
        إذا احتجت مساعدة، استخدم \`/ticket\` لفتح تذكرة دعم!
      `)
      .setColor(client.config.COLORS.PRIMARY)
      .setTimestamp();

    await owner.send({ embeds: [welcomeEmbed] }).catch(() => {
      console.log(`❌ لا يمكن إرسال رسالة خاصة لمالك السيرفر: ${owner.user.tag}`);
    });

  } catch (error) {
    console.error('❌ خطأ في إرسال رسالة الترحيب:', error);
  }
}

// تحديث إحصائيات البوت
async function updateBotStats(client) {
  const serverCount = client.guilds.cache.size;
  
  // تحديث نشاط البوت
  client.user.setActivity({
    name: `${serverCount} سيرفر | /ticket`,
    type: client.config.BOT_SETTINGS.ACTIVITY.type
  });

  console.log(`📊 إحصائيات محدثة: ${serverCount} سيرفر`);
}