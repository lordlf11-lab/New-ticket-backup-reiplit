const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('فحص')
    .setDescription('عرض إحصائيات أعضاء الدعم')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // جلب إحصائيات الأعضاء
      const Stats = require('../../models/Stats');
      const stats = await Stats.find({ guildId: interaction.guild.id })
        .sort({ 'tickets.totalClaimed': -1 })
        .limit(20);

      if (stats.length === 0) {
        const noStatsEmbed = new EmbedBuilder()
          .setTitle('📊 الإحصائيات')
          .setDescription('لا توجد إحصائيات متاحة حتى الآن.')
          .setColor(client.config.COLORS.WARNING);
        
        return interaction.editReply({ embeds: [noStatsEmbed] });
      }

      // بناء قائمة الإحصائيات
      let description = '';
      stats.forEach((stat, index) => {
        const user = client.users.cache.get(stat.userId) || { username: 'مستخدم غير معروف' };
        description += `**${index + 1}. ${user.username}**\n`;
        description += `• إجمالي التذاكر: **${stat.tickets.totalClaimed}**\n`;
        description += `• الدعم: ${stat.tickets.supportClaimed} | الشكاوى: ${stat.tickets.complaintClaimed} | الرانك: ${stat.tickets.rankupClaimed}\n`;
        description += `• آخر نشاط: <t:${Math.floor(stat.activity.lastActive / 1000)}:R>\n`;
        description += `————————————\n`;
      });

      const statsEmbed = new EmbedBuilder()
        .setTitle('📊 إحصائيات الإدارة')
        .setDescription(description)
        .setColor(client.config.COLORS.PRIMARY)
        .setFooter({ 
          text: `إجمالي الأعضاء: ${stats.length}`, 
          iconURL: interaction.guild.iconURL() 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [statsEmbed] });

    } catch (error) {
      console.error('❌ خطأ في أمر الفحص:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ حدث خطأ')
        .setDescription('حدث خطأ أثناء جلب الإحصائيات.')
        .setColor(client.config.COLORS.ERROR);
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
