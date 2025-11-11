const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('إنشاء إيمبد (للمشرفين فقط)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('text')
        .setDescription('النص الذي تريد وضعه في الإيمبد')
        .setRequired(true)),

  async execute(interaction, client) {
    const text = interaction.options.getString('text');

    try {
      const embed = new EmbedBuilder()
        .setDescription(text)
        .setColor(client.config.COLORS.PRIMARY)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('❌ خطأ في أمر embed:', error);
      await interaction.reply({ 
        content: '❌ حدث خطأ في إنشاء الإيمبد.', 
        ephemeral: true 
      });
    }
  }
};