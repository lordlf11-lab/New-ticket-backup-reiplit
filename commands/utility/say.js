const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('إرسال رسالة كالبوت (للمشرفين فقط)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('text')
        .setDescription('النص الذي تريد إرساله')
        .setRequired(true)),

  async execute(interaction, client) {
    const text = interaction.options.getString('text');

    try {
      await interaction.deferReply({ ephemeral: true });
      await interaction.channel.send(text);
      await interaction.editReply('✅ تم إرسال الرسالة بنجاح.');

    } catch (error) {
      console.error('❌ خطأ في أمر say:', error);
      await interaction.editReply('❌ حدث خطأ في إرسال الرسالة.');
    }
  }
};