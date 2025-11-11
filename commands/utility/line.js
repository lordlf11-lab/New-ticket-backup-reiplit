const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('خط')
    .setDescription('إرسال صورة الخط المميز'),

  async execute(interaction, client) {
    try {
      // جلب إعدادات السيرفر
      const serverSettings = await client.database.getServerSettings(interaction.guild.id);
      
      // التحقق من الصلاحية
      if (serverSettings.ticketSettings?.lineRole) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const hasLineRole = member.roles.cache.has(serverSettings.ticketSettings.lineRole);
        
        if (!hasLineRole) {
          return interaction.reply({ 
            content: '❌ لا تملك صلاحية استخدام هذا الأمر.', 
            ephemeral: true 
          });
        }
      }

      await interaction.reply({ 
        content: client.config.IMAGES.LINE_IMAGE,
        ephemeral: false 
      });

    } catch (error) {
      console.error('❌ خطأ في أمر الخط:', error);
      await interaction.reply({ 
        content: '❌ حدث خطأ في إرسال الصورة.', 
        ephemeral: true 
      });
    }
  }
};