const { Events, EmbedBuilder } = require('discord.js');
const { IMAGES } = require('../config');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    try {
      // الكشف عن البوست (nitro boost)
      await handleBoostUpdate(oldMember, newMember, client);
      
      // الكشف عن تغيير الرتب
      await handleRoleUpdate(oldMember, newMember, client);

    } catch (error) {
      console.error('❌ خطأ في معالجة تحديث العضو:', error);
    }
  }
};

// معالجة تحديث البوست
async function handleBoostUpdate(oldMember, newMember, client) {
  const hadNitro = oldMember.premiumSince;
  const hasNitro = newMember.premiumSince;

  if (!hadNitro && hasNitro) {
    // جلب إعدادات السيرفر
    const serverSettings = await client.database.getServerSettings(newMember.guild.id);
    
    if (!serverSettings?.logChannels?.boost) return;

    const boostChannel = newMember.guild.channels.cache.get(serverSettings.logChannels.boost);
    if (!boostChannel) return;

    // إنشاء إيمبد البوست
    const boostEmbed = new EmbedBuilder()
      .setTitle('💎 شكراً على البوست!')
      .setDescription(`**شكراً ${newMember} على دعمك للسيرفر! 💜**`)
      .setColor('#ff73fa')
      .setThumbnail(newMember.guild.iconURL())
      .setImage(IMAGES.BOOST_IMAGE || IMAGES.TICKET_BANNER)
      .setTimestamp();

    await boostChannel.send({ 
      content: `<@${newMember.id}>`,
      embeds: [boostEmbed] 
    });

    // تحديث إحصائيات السيرفر
    await client.database.updateServerSettings(newMember.guild.id, {
      $inc: { 'statistics.totalBoosts': 1 }
    });

    console.log(`✅ تم تسجيل بوست جديد من: ${newMember.user.tag}`);
  }
}

// معالجة تغيير الرتب
async function handleRoleUpdate(oldMember, newMember, client) {
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  // الكشف عن الرتب المضافة
  const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
  
  // الكشف عن الرتب الم removED
  const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

  // تسجيل التغييرات المهمة (يمكن توسيعها لاحقاً)
  if (addedRoles.size > 0 || removedRoles.size > 0) {
    console.log(`🔄 تغيير رتب لـ ${newMember.user.tag}: +${addedRoles.size} -${removedRoles.size}`);
  }
}