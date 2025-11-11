const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تصفير')
    .setDescription('تصفير إحصائيات التذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('الكل')
        .setDescription('تصفير إحصائيات جميع الأعضاء'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('عضو')
        .setDescription('تصفير إحصائيات عضو معين')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('العضو المراد تصفير إحصائياته')
            .setRequired(true))),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'الكل') {
        await resetAllStats(interaction, client);
      } else if (subcommand === 'عضو') {
        await resetUserStats(interaction, client);
      }
    } catch (error) {
      console.error('❌ خطأ في أمر التصفير:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ حدث خطأ')
        .setDescription('حدث خطأ أثناء تصفير الإحصائيات.')
        .setColor(client.config.COLORS.ERROR);
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

// تصفير جميع الإحصائيات
async function resetAllStats(interaction, client) {
  const Stats = require('../../models/Stats');
  
  // تأكيد التصفير
  const confirmEmbed = new EmbedBuilder()
    .setTitle('⚠️ تأكيد التصفير')
    .setDescription('هل أنت متأكد من تصفير إحصائيات **جميع** الأعضاء؟\n\n**هذا الإجراء لا يمكن التراجع عنه!**')
    .setColor(client.config.COLORS.WARNING);

  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm_reset_all')
    .setLabel('نعم، تصفير الكل')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_reset')
    .setLabel('إلغاء')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.reply({ 
    embeds: [confirmEmbed], 
    components: [row],
    ephemeral: true 
  });
}

// تصفير إحصائيات عضو معين
async function resetUserStats(interaction, client) {
  const user = interaction.options.getUser('user');
  const Stats = require('../../models/Stats');

  // البحث عن إحصائيات العضو
  const userStats = await Stats.findOne({ 
    guildId: interaction.guild.id, 
    userId: user.id 
  });

  if (!userStats) {
    const noStatsEmbed = new EmbedBuilder()
      .setTitle('❌ لا توجد إحصائيات')
      .setDescription(`لا توجد إحصائيات للعضو ${user}.`)
      .setColor(client.config.COLORS.WARNING);
    
    return interaction.reply({ embeds: [noStatsEmbed], ephemeral: true });
  }

  // تأكيد التصفير
  const confirmEmbed = new EmbedBuilder()
    .setTitle('⚠️ تأكيد التصفير')
    .setDescription(`هل أنت متأكد من تصفير إحصائيات ${user}؟\n\n**إجمالي التذاكر:** ${userStats.tickets.totalClaimed}\n**هذا الإجراء لا يمكن التراجع عنه!**`)
    .setColor(client.config.COLORS.WARNING);

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_reset_user_${user.id}`)
    .setLabel('نعم، تصفير الإحصائيات')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_reset')
    .setLabel('إلغاء')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.reply({ 
    embeds: [confirmEmbed], 
    components: [row],
    ephemeral: true 
  });
}