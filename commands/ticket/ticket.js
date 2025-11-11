const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('فتح لوحة نظام التذاكر'),

  async execute(interaction, client) {
    try {
      // جلب إعدادات السيرفر
      const serverSettings = await client.database.getServerSettings(interaction.guild.id);
      
      // التحقق من إعداد السيرفر
      if (!serverSettings.ticketSettings?.categoryId) {
        const setupEmbed = new EmbedBuilder()
          .setTitle('❌ النظام غير مهيأ')
          .setDescription('يجب على الإدارة تهيئة النظام أولاً باستخدام `/setup`')
          .setColor(client.config.COLORS.ERROR);
        
        return interaction.reply({ embeds: [setupEmbed], ephemeral: true });
      }

      // زر فتح التذكرة
      const openTicketButton = new ButtonBuilder()
        .setCustomId('open_ticket_btn')
        .setLabel('اخـتـيـار نـوع الـتـذكـرة')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎫');

      const row = new ActionRowBuilder().addComponents(openTicketButton);

      // إيمبد الرئيسي
      const title = serverSettings.messages?.ticketTitle || '**قـسـم الـدعـم الـفـنـي**';
      const description = serverSettings.messages?.ticketDescription || 
        '**اضغط زر "اخـتـيـار نـوع الـتـذكـرة" لطلب فتح تذكرتك.**\n\nاختر نوع التذكرة المناسبة لك من خلال الضغط على الزر بالاسفل\n\nخدمة رفع الرانك لها تذكرتها الخاصة يمكنك اختيارها في حال كنت تريد الخدمة';

      const mainEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(client.config.COLORS.PRIMARY)
        .setThumbnail(interaction.guild.iconURL())
        .setImage(client.config.IMAGES.TICKET_BANNER)
        .setFooter({ text: `السيرفر: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

      await interaction.reply({ 
        embeds: [mainEmbed], 
        components: [row],
        ephemeral: false 
      });

      console.log(`🎫 تم فتح لوحة التذاكر في سيرفر: ${interaction.guild.name}`);

    } catch (error) {
      console.error('❌ خطأ في أمر التذاكر:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ حدث خطأ')
        .setDescription('حدث خطأ أثناء فتح لوحة التذاكر.')
        .setColor(client.config.COLORS.ERROR);
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
