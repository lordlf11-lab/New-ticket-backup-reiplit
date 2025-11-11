const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('إعداد البوت في السيرفر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    
    // إعداد القنوات
    .addSubcommand(subcommand =>
      subcommand
        .setName('channels')
        .setDescription('إعداد قنوات النظام')
        .addChannelOption(option =>
          option.setName('category')
            .setDescription('الكاتيجوري الرئيسي للتذاكر')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('support_log')
            .setDescription('قناة لوج الدعم الفني')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('complaint_log')
            .setDescription('قناة لوج الشكاوى')
            .addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option =>
          option.setName('rankup_log')
            .setDescription('قناة لوج رفع الرانك')
            .addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option =>
          option.setName('welcome')
            .setDescription('قناة الترحيب')
            .addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option =>
          option.setName('boost')
            .setDescription('قناة إشعارات البوست')
            .addChannelTypes(ChannelType.GuildText)))
    
    // إعداد الرتب
    .addSubcommand(subcommand =>
      subcommand
        .setName('roles')
        .setDescription('إعداد رتب النظام')
        .addRoleOption(option =>
          option.setName('support')
            .setDescription('رتبة الدعم الفني')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('complaint')
            .setDescription('رتبة الشكاوى')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('rankup')
            .setDescription('رتبة رفع الرانك')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('admin')
            .setDescription('رتبة المشرفين')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('line')
            .setDescription('رتبة صلاحية الخط'))),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'channels') {
        await setupChannels(interaction, client);
      } else if (subcommand === 'roles') {
        await setupRoles(interaction, client);
      }
    } catch (error) {
      console.error('❌ خطأ في إعداد السيرفر:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ حدث خطأ')
        .setDescription('حدث خطأ أثناء إعداد النظام.')
        .setColor(client.config.COLORS.ERROR);
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

// إعداد القنوات
async function setupChannels(interaction, client) {
  const category = interaction.options.getChannel('category');
  const supportLog = interaction.options.getChannel('support_log');
  const complaintLog = interaction.options.getChannel('complaint_log');
  const rankupLog = interaction.options.getChannel('rankup_log');
  const welcomeChannel = interaction.options.getChannel('welcome');
  const boostChannel = interaction.options.getChannel('boost');

  // تحديث إعدادات السيرفر
  const updates = {
    'ticketSettings.categoryId': category.id,
    'logChannels.support': supportLog.id,
    'logChannels.complaint': complaintLog?.id || null,
    'logChannels.rankup': rankupLog?.id || null,
    'logChannels.welcome': welcomeChannel?.id || null,
    'logChannels.boost': boostChannel?.id || null
  };

  await client.database.updateServerSettings(interaction.guild.id, updates);

  const successEmbed = new EmbedBuilder()
    .setTitle('✅ تم الإعداد بنجاح')
    .setDescription(`
      **تم إعداد القنوات بنجاح:**
      
      **📁 الكاتيجوري:** ${category}
      **📝 لوج الدعم:** ${supportLog}
      **⚠️ لوج الشكاوى:** ${complaintLog || 'غير محدد'}
      **📈 لوج الرانك:** ${rankupLog || 'غير محدد'}
      **👋 الترحيب:** ${welcomeChannel || 'غير محدد'}
      **💎 البوست:** ${boostChannel || 'غير محدد'}
      
      **🎯 الخطوة التالية:**
      استخدم \`/setup roles\` لإعداد الرتب
    `)
    .setColor(client.config.COLORS.SUCCESS)
    .setTimestamp();

  await interaction.reply({ embeds: [successEmbed], ephemeral: true });
  
  console.log(`✅ تم إعداد القنوات في سيرفر: ${interaction.guild.name}`);
}

// إعداد الرتب
async function setupRoles(interaction, client) {
  const supportRole = interaction.options.getRole('support');
  const complaintRole = interaction.options.getRole('complaint');
  const rankupRole = interaction.options.getRole('rankup');
  const adminRole = interaction.options.getRole('admin');
  const lineRole = interaction.options.getRole('line');

  // تحديث إعدادات السيرفر
  const updates = {
    'ticketSettings.supportRole': supportRole.id,
    'ticketSettings.complaintRole': complaintRole.id,
    'ticketSettings.rankupRole': rankupRole.id,
    'ticketSettings.adminRole': adminRole.id,
    'ticketSettings.lineRole': lineRole?.id || null
  };

  await client.database.updateServerSettings(interaction.guild.id, updates);

  const successEmbed = new EmbedBuilder()
    .setTitle('✅ تم الإعداد بنجاح')
    .setDescription(`
      **تم إعداد الرتب بنجاح:**
      
      **👥 الدعم الفني:** ${supportRole}
      **⚠️ الشكاوى:** ${complaintRole}
      **📈 رفع الرانك:** ${rankupRole}
      **🔧 المشرفين:** ${adminRole}
      **🎨 الخط:** ${lineRole || 'غير محدد'}
      
      **🎉 النظام جاهز الآن!**
      استخدم \`/ticket\` لفتح لوحة التذاكر
    `)
    .setColor(client.config.COLORS.SUCCESS)
    .setTimestamp();

  await interaction.reply({ embeds: [successEmbed], ephemeral: true });
  
  console.log(`✅ تم إعداد الرتب في سيرفر: ${interaction.guild.name}`);
}
