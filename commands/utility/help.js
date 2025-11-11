const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('عرض جميع أوامر البوت'),

  async execute(interaction, client) {
    try {
      const helpEmbed = new EmbedBuilder()
        .setTitle('🎯 مركز المساعدة - بوت التذاكر')
        .setDescription(`
          **مرحباً بك في نظام البوت المتكامل!**
          
          **📋 الأقسام المتاحة:**
        `)
        .addFields(
          {
            name: '🎫 نظام التذاكر',
            value: '`/ticket` - فتح لوحة التذاكر\n`/نداء` - نداء عاجل في التذكرة\n`/مهلة` - بدء مهلة زمنية\n`/rename` - تغيير اسم التذكرة',
            inline: true
          },
          {
            name: '🔧 الإعدادات',
            value: '`/setup` - إعداد البوت في السيرفر\n`/config` - تعديل الإعدادات',
            inline: true
          },
          {
            name: '📊 الإدارة',
            value: '`/فحص` - إحصائيات الأعضاء\n`/تصفير` - تصفير الإحصائيات',
            inline: true
          },
          {
            name: '🛠️ الأوامر العامة',
            value: '`/خط` - إرسال صورة الخط\n`/say` - إرسال رسالة\n`/embed` - إنشاء إيمبد',
            inline: true
          }
        )
        .setColor(client.config.COLORS.PRIMARY)
        .setFooter({ 
          text: `طلب بواسطة ${interaction.user.username}`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();

      // أزرار إضافية
      const supportButton = new ButtonBuilder()
        .setLabel('الدعم الفني')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/example');

      const docsButton = new ButtonBuilder()
        .setLabel('التوثيق')
        .setStyle(ButtonStyle.Link)
        .setURL('https://docs.example.com');

      const row = new ActionRowBuilder().addComponents(supportButton, docsButton);

      await interaction.reply({ 
        embeds: [helpEmbed], 
        components: [row],
        ephemeral: true 
      });

    } catch (error) {
      console.error('❌ خطأ في أمر المساعدة:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ حدث خطأ')
        .setDescription('حدث خطأ أثناء عرض المساعدة.')
        .setColor(client.config.COLORS.ERROR);
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
