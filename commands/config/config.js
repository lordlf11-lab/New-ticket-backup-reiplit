const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('تعديل إعدادات البوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('عرض الإعدادات الحالية'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('messages')
        .setDescription('تعديل رسائل النظام')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('نوع الرسالة')
            .setRequired(true)
            .addChoices(
              { name: 'عنوان التذاكر', value: 'ticketTitle' },
              { name: 'وصف التذاكر', value: 'ticketDescription' },
              { name: 'رسالة الترحيب', value: 'welcomeMessage' }
            ))
        .addStringOption(option =>
          option.setName('text')
            .setDescription('النص الجديد')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('security')
        .setDescription('إعدادات الحماية')
        .addIntegerOption(option =>
          option.setName('timeout')
            .setDescription('مهلة الإغلاق التلقائي (بالدقائق)')
            .setMinValue(1)
            .setMaxValue(60))
        .addIntegerOption(option =>
          option.setName('max_tickets')
            .setDescription('الحد الأقصى للتذاكر لكل مستخدم')
            .setMinValue(1)
            .setMaxValue(5))),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'view') {
        await viewConfig(interaction, client);
      } else if (subcommand === 'messages') {
        await updateMessages(interaction, client);
      } else if (subcommand === 'security') {
        await updateSecurity(interaction, client);
      }
    } catch (error) {
      console.error('❌ خطأ في أمر التكوين:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ حدث خطأ')
        .setDescription('حدث خطأ أثناء تعديل الإعدادات.')
        .setColor(client.config.COLORS.ERROR);
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

// عرض الإعدادات
async function viewConfig(interaction, client) {
  const serverSettings = await client.database.getServerSettings(interaction.guild.id);

  const configEmbed = new EmbedBuilder()
    .setTitle('⚙️ الإعدادات الحالية')
    .setDescription(`إعدادات سيرفر **${interaction.guild.name}**`)
    .addFields(
      {
        name: '📁 القنوات',
        value: `
          **الكاتيجوري:** ${serverSettings.ticketSettings?.categoryId ? '<#' + serverSettings.ticketSettings.categoryId + '>' : '❌ غير محدد'}
          **لوج الدعم:** ${serverSettings.logChannels?.support ? '<#' + serverSettings.logChannels.support + '>' : '❌ غير محدد'}
          **لوج الشكاوى:** ${serverSettings.logChannels?.complaint ? '<#' + serverSettings.logChannels.complaint + '>' : '❌ غير محدد'}
          **الترحيب:** ${serverSettings.logChannels?.welcome ? '<#' + serverSettings.logChannels.welcome + '>' : '❌ غير محدد'}
        `,
        inline: false
      },
      {
        name: '👥 الرتب',
        value: `
          **الدعم:** ${serverSettings.ticketSettings?.supportRole ? '<@&' + serverSettings.ticketSettings.supportRole + '>' : '❌ غير محدد'}
          **الشكاوى:** ${serverSettings.ticketSettings?.complaintRole ? '<@&' + serverSettings.ticketSettings.complaintRole + '>' : '❌ غير محدد'}
          **المشرفين:** ${serverSettings.ticketSettings?.adminRole ? '<@&' + serverSettings.ticketSettings.adminRole + '>' : '❌ غير محدد'}
        `,
        inline: false
      },
      {
        name: '🛡️ الحماية',
        value: `
          **المهلة التلقائية:** ${serverSettings.security?.autoCloseTimeout || 10} دقائق
          **الحد الأقصى:** ${serverSettings.security?.maxTicketsPerUser || 1} تذكرة
        `,
        inline: false
      }
    )
    .setColor(client.config.COLORS.PRIMARY)
    .setTimestamp();

  await interaction.reply({ embeds: [configEmbed], ephemeral: true });
}

// تحديث الرسائل
async function updateMessages(interaction, client) {
  const type = interaction.options.getString('type');
  const text = interaction.options.getString('text');

  const updates = {
    [`messages.${type}`]: text
  };

  await client.database.updateServerSettings(interaction.guild.id, updates);

  const successEmbed = new EmbedBuilder()
    .setTitle('✅ تم التحديث')
    .setDescription(`تم تحديث **${type}** بنجاح.`)
    .addFields({ name: 'النص الجديد:', value: text })
    .setColor(client.config.COLORS.SUCCESS)
    .setTimestamp();

  await interaction.reply({ embeds: [successEmbed], ephemeral: true });
}

// تحديث إعدادات الحماية
async function updateSecurity(interaction, client) {
  const timeout = interaction.options.getInteger('timeout');
  const maxTickets = interaction.options.getInteger('max_tickets');

  const updates = {};
  if (timeout) updates['security.autoCloseTimeout'] = timeout;
  if (maxTickets) updates['security.maxTicketsPerUser'] = maxTickets;

  await client.database.updateServerSettings(interaction.guild.id, updates);

  const successEmbed = new EmbedBuilder()
    .setTitle('✅ تم التحديث')
    .setDescription('تم تحديث إعدادات الحماية بنجاح.')
    .addFields(
      {
        name: 'الإعدادات المحدثة:',
        value: `
          ${timeout ? `• المهلة التلقائية: ${timeout} دقائق\n` : ''}
          ${maxTickets ? `• الحد الأقصى للتذاكر: ${maxTickets}` : ''}
        `
      }
    )
    .setColor(client.config.COLORS.SUCCESS)
    .setTimestamp();

  await interaction.reply({ embeds: [successEmbed], ephemeral: true });
}
