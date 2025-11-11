const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config');

class AdminHelper {
  constructor(client) {
    this.client = client;
  }

  // فتح قائمة مساعد الإدارة
  async openAdminHelper(interaction) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_options')
      .setPlaceholder('اختيارات التذكرة')
      .addOptions([
        {
          label: 'استدعاء عضو',
          description: 'قم باستدعاء عضو للتذكرة',
          value: 'call_user',
          emoji: '🔈'
        },
        {
          label: 'إضافة عضو',
          description: 'أضف عضو للتذكرة',
          value: 'add_member',
          emoji: '➕'
        },
        {
          label: 'طرد عضو',
          description: 'طرد عضو من التذكرة',
          value: 'kick_member',
          emoji: '➖'
        },
        {
          label: 'تغيير الاسم',
          description: 'تغيير اسم التذكرة',
          value: 'rename_ticket',
          emoji: '✏️'
        },
        {
          label: 'بدء مهلة',
          description: 'بدء مهلة زمنية',
          value: 'start_timeout',
          emoji: '⏰'
        }
      ]);

    const menuRow = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: '**🔧 مساعد الإدارة - اختر الإجراء المطلوب:**',
      components: [menuRow],
      ephemeral: false
    });
  }

  // معالجة اختيارات المساعد
  async handleAdminHelperSelect(interaction, selectedAction) {
    switch (selectedAction) {
      case 'call_user':
        await this.handleCallUser(interaction);
        break;
      case 'add_member':
        await this.handleAddMember(interaction);
        break;
      case 'kick_member':
        await this.handleKickMember(interaction);
        break;
      case 'rename_ticket':
        await this.handleRenameTicket(interaction);
        break;
      case 'start_timeout':
        await this.handleStartTimeout(interaction);
        break;
    }
  }

  // استدعاء عضو
  async handleCallUser(interaction) {
    await interaction.reply({
      content: '**🔈 | منشن العضو الذي تريد استدعائه للتذكرة:**',
      ephemeral: false
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async m => {
      const mentionedUser = m.mentions.users.first();
      if (!mentionedUser) {
        return m.reply('❌ لم يتم ذكر أي عضو صحيح.');
      }

      const callEmbed = new EmbedBuilder()
        .setTitle('🔔 استدعاء عاجل')
        .setDescription(`${mentionedUser} تم استدعاؤك إلى هذه التذكرة بواسطة <@${interaction.user.id}>`)
        .setColor(COLORS.WARNING)
        .setTimestamp();

      await m.channel.send({ content: `${mentionedUser}`, embeds: [callEmbed] });
      await m.delete().catch(() => {});
    });
  }

  // إضافة عضو
  async handleAddMember(interaction) {
    await interaction.reply({
      content: '**➕ | منشن العضو الذي تريد إضافته للتذكرة:**',
      ephemeral: false
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async m => {
      const mentionedUser = m.mentions.users.first();
      if (!mentionedUser) {
        return m.reply('❌ لم يتم ذكر أي عضو صحيح.');
      }

      try {
        await interaction.channel.permissionOverwrites.edit(mentionedUser.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ تمت الإضافة بنجاح')
          .setDescription(`تمت إضافة ${mentionedUser} إلى التذكرة`)
          .setColor(COLORS.SUCCESS)
          .setTimestamp();

        await m.reply({ embeds: [successEmbed] });
        await m.delete().catch(() => {});

      } catch (error) {
        await m.reply('❌ حدث خطأ أثناء إضافة العضو.');
      }
    });
  }

  // طرد عضو
  async handleKickMember(interaction) {
    await interaction.reply({
      content: '**➖ | منشن العضو الذي تريد طرده من التذكرة:**',
      ephemeral: false
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async m => {
      const mentionedUser = m.mentions.users.first();
      if (!mentionedUser) {
        return m.reply('❌ لم يتم ذكر أي عضو صحيح.');
      }

      // منع طرد صاحب التذكرة
      const Ticket = require('../models/Ticket');
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      
      if (ticket && ticket.userId === mentionedUser.id) {
        return m.reply('❌ لا يمكن طرد صاحب التذكرة.');
      }

      try {
        await interaction.channel.permissionOverwrites.delete(mentionedUser.id);

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ تم الطرد بنجاح')
          .setDescription(`تم طرد ${mentionedUser} من التذكرة`)
          .setColor(COLORS.SUCCESS)
          .setTimestamp();

        await m.reply({ embeds: [successEmbed] });
        await m.delete().catch(() => {});

      } catch (error) {
        await m.reply('❌ حدث خطأ أثناء طرد العضو.');
      }
    });
  }

  // تغيير اسم التذكرة
  async handleRenameTicket(interaction) {
    await interaction.reply({
      content: '**✏️ | اكتب الاسم الجديد للتذكرة:**',
      ephemeral: false
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async m => {
      const newName = m.content.trim();
      
      if (!newName || newName.length > 100) {
        return m.reply('❌ الاسم غير صالح. يجب أن يكون بين 1 و 100 حرف.');
      }

      try {
        await interaction.channel.setName(newName);

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ تم التغيير بنجاح')
          .setDescription(`تم تغيير اسم التذكرة إلى: **${newName}**`)
          .setColor(COLORS.SUCCESS)
          .setTimestamp();

        await m.reply({ embeds: [successEmbed] });
        await m.delete().catch(() => {});

      } catch (error) {
        await m.reply('❌ حدث خطأ أثناء تغيير الاسم.');
      }
    });
  }

  // بدء مهلة
  async handleStartTimeout(interaction) {
    const Ticket = require('../models/Ticket');
    const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
    
    if (!ticket) {
      return interaction.reply('❌ هذه ليست قناة تذكرة صالحة.');
    }

    const timeoutSystem = this.client.ticketSystem.timeoutSystem;
    await timeoutSystem.startTimeout(interaction.channel.id, ticket.userId, ticket.ticketId, 10);

    const successEmbed = new EmbedBuilder()
      .setTitle('⏰ تم بدء المهلة')
      .setDescription('تم بدء مهلة زمنية لمدة 10 دقائق.')
      .setColor(COLORS.WARNING)
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  }
}

module.exports = AdminHelper;