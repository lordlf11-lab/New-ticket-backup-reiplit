const { 
  Events, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle 
} = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    console.log(`🔘 تفاعل جديد: ${interaction.type} من ${interaction.user.tag}`);

    // معالجة الأوامر السلاش
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction, client);
      return;
    }

    // معالجة الأزرار
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction, client);
      return;
    }

    // معالجة القوائم المنسدلة
    if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction, client);
      return;
    }

    // معالجة النماذج
    if (interaction.isModalSubmit()) {
      await handleModalInteraction(interaction, client);
      return;
    }
  }
};

// معالجة الأوامر السلاش
async function handleSlashCommand(interaction, client) {
  const command = client.slashCommands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ أمر غير معروف: ${interaction.commandName}`);
    return interaction.reply({ 
      content: '❌ هذا الأمر غير متوفر حالياً.', 
      ephemeral: true 
    });
  }

  try {
    console.log(`🔧 تشغيل أمر: ${interaction.commandName} بواسطة ${interaction.user.tag}`);
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`❌ خطأ في تنفيذ ${interaction.commandName}:`, error);

    const errorEmbed = new EmbedBuilder()
      .setColor(client.config.COLORS.ERROR)
      .setTitle('❌ حدث خطأ')
      .setDescription('حدث خطأ غير متوقع أثناء تنفيذ الأمر.')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

// معالجة الأزرار
async function handleButtonInteraction(interaction, client) {
  const { customId } = interaction;

  try {
    console.log(`🔘 تم الضغط على زر: ${customId}`);

    // أزرار فتح التذاكر
    if (customId === 'open_ticket_btn') {
      await handleOpenTicketButton(interaction, client);
    }

    // أزرار استلام التذاكر
    else if (customId === 'claim_ticket') {
      await handleClaimTicketButton(interaction, client);
    }

    // أزرار إغلاق التذاكر
    else if (customId === 'close_ticket') {
      await handleCloseTicketButton(interaction, client);
    }

    // أزرار إخفاء التذاكر
    else if (customId === 'hide_ticket') {
      await handleHideTicketButton(interaction, client);
    }

    // أزرار مساعد الإدارة
    else if (customId === 'admin_helper') {
      await handleAdminHelperButton(interaction, client);
    }

    // أزرار تأكيد الإغلاق
    else if (customId === 'confirm_close') {
      await handleConfirmCloseButton(interaction, client);
    }

    // أزرار إلغاء الإغلاق
    else if (customId === 'cancel_close') {
      await handleCancelCloseButton(interaction, client);
    }

    // أزرار التصفير
    else if (customId.startsWith('confirm_reset_')) {
      await handleResetConfirmation(interaction, client);
    }

    else if (customId === 'cancel_reset') {
      await handleCancelReset(interaction, client);
    }

    else {
      console.log(`❌ زر غير معروف: ${customId}`);
      await interaction.reply({ 
        content: '❌ هذا الزر لم يعد نشطاً.', 
        ephemeral: true 
      });
    }
  } catch (error) {
    console.error('❌ خطأ في معالجة الزر:', error);
    console.error('❌ تفاصيل الخطأ:', error.stack);

    await interaction.reply({ 
      content: '❌ حدث خطأ في معالجة هذا الزر. يرجى المحاولة مرة أخرى.', 
      ephemeral: true 
    });
  }
}

// معالجة القوائم المنسدلة
async function handleSelectMenuInteraction(interaction, client) {
  const { customId, values } = interaction;

  try {
    console.log(`📋 قائمة منسدلة: ${customId} - ${values[0]}`);

    if (customId === 'select_ticket_type') {
      await handleTicketTypeSelect(interaction, client);
    }
    else if (customId === 'ticket_options') {
      await handleTicketOptionsSelect(interaction, client);
    }
  } catch (error) {
    console.error('❌ خطأ في معالجة القائمة:', error);
    await interaction.reply({ 
      content: '❌ حدث خطأ في معالجة هذا الخيار.', 
      ephemeral: true 
    });
  }
}

// معالجة النماذج
async function handleModalInteraction(interaction, client) {
  const { customId } = interaction;

  try {
    console.log(`📝 نموذج: ${customId}`);

    if (customId.startsWith('ticket_reason_')) {
      await handleTicketReasonModal(interaction, client);
    }
  } catch (error) {
    console.error('❌ خطأ في معالجة النموذج:', error);
    await interaction.reply({ 
      content: '❌ حدث خطأ في معالجة هذا النموذج.', 
      ephemeral: true 
    });
  }
}

// ========== الدوال المساعدة للتفاعلات ==========

// زر فتح التذكرة
async function handleOpenTicketButton(interaction, client) {
  try {
    console.log('🎫 تم الضغط على زر فتح التذكرة');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_ticket_type')
      .setPlaceholder('اختر نوع التذكرة')
      .addOptions([
        { 
          label: 'طـلـب دعـم فـنـي', 
          description: 'فتح تذكرة دعم فني', 
          value: 'support', 
          emoji: '📩' 
        },
        { 
          label: 'طلب إدارة عليا', 
          description: 'فتح تذكرة طلب عليا', 
          value: 'complaint', 
          emoji: '⚠️' 
        },
        { 
          label: 'طـلـب رفـع رانـك', 
          description: 'فتح تذكرة رفع رانك', 
          value: 'rankup', 
          emoji: '📈' 
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ 
      content: 'يرجى اختيار نوع التذكرة من القائمة أدناه:', 
      components: [row], 
      ephemeral: true 
    });

  } catch (error) {
    console.error('❌ خطأ في زر فتح التذكرة:', error);

    await interaction.reply({ 
      content: '❌ حدث خطأ في فتح قائمة التذاكر. يرجى المحاولة مرة أخرى.', 
      ephemeral: true 
    });
  }
}

// اختيار نوع التذكرة
async function handleTicketTypeSelect(interaction, client) {
  const type = interaction.values[0];
  console.log(`🎯 تم اختيار نوع التذكرة: ${type}`);

  await client.ticketSystem.openTicketReasonModal(interaction, type);
}

// نموذج سبب التذكرة
async function handleTicketReasonModal(interaction, client) {
  const type = interaction.customId.replace('ticket_reason_', '');
  const reason = interaction.fields.getTextInputValue('ticket_reason');

  console.log(`📝 نموذج تذكرة: ${type} - ${reason.substring(0, 50)}...`);

  try {
    const { channel, ticket } = await client.ticketSystem.createTicket(interaction, type, reason);

    await interaction.reply({ 
      content: `✅ تم فتح التذكرة: ${channel}`, 
      ephemeral: true 
    });

  } catch (error) {
    console.error('❌ خطأ في فتح التذكرة:', error);

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ خطأ في فتح التذكرة')
      .setDescription(error.message)
      .setColor(client.config.COLORS.ERROR);

    await interaction.reply({ 
      embeds: [errorEmbed], 
      ephemeral: true 
    });
  }
}

// زر استلام التذكرة
async function handleClaimTicketButton(interaction, client) {
  const Ticket = require('../models/Ticket');
  const ticket = await Ticket.findOne({ 
    channelId: interaction.channel.id, 
    status: { $in: ['open', 'claimed'] } 
  });

  if (!ticket) {
    console.log('❌ محاولة استلام تذكرة غير موجودة');
    return interaction.reply({ 
      content: '❌ هذه ليست قناة تذكرة مفتوحة.', 
      ephemeral: true 
    });
  }

  console.log(`🎯 محاولة استلام التذكرة: ${ticket.ticketId}`);

  try {
    await client.ticketSystem.claimTicket(interaction, ticket);
  } catch (error) {
    console.error('❌ خطأ في استلام التذكرة:', error);
    await interaction.reply({ 
      content: `❌ ${error.message}`, 
      ephemeral: true 
    });
  }
}

// زر إغلاق التذكرة
async function handleCloseTicketButton(interaction, client) {
  const Ticket = require('../models/Ticket');
  const ticket = await Ticket.findOne({ 
    channelId: interaction.channel.id, 
    status: { $in: ['open', 'claimed'] } 
  });

  if (!ticket) {
    console.log('❌ محاولة إغلاق تذكرة غير موجودة');
    return interaction.reply({ 
      content: '❌ هذه ليست قناة تذكرة مفتوحة.', 
      ephemeral: true 
    });
  }

  console.log(`🔒 محاولة إغلاق التذكرة: ${ticket.ticketId}`);

  try {
    await client.ticketCloser.startCloseProcess(interaction, ticket);
  } catch (error) {
    console.error('❌ خطأ في إغلاق التذكرة:', error);
    await interaction.reply({ 
      content: `❌ ${error.message}`, 
      ephemeral: true 
    });
  }
}

// زر تأكيد الإغلاق
async function handleConfirmCloseButton(interaction, client) {
  const Ticket = require('../models/Ticket');
  const ticket = await Ticket.findOne({ 
    channelId: interaction.channel.id, 
    status: { $in: ['open', 'claimed'] } 
  });

  if (!ticket) {
    console.log('❌ محاولة تأكيد إغلاق تذكرة غير موجودة');
    return interaction.reply({ 
      content: '❌ هذه ليست قناة تذكرة مفتوحة.', 
      ephemeral: true 
    });
  }

  console.log(`✅ تأكيد إغلاق التذكرة: ${ticket.ticketId}`);

  await client.ticketCloser.confirmClose(interaction, ticket);
}

// زر إلغاء الإغلاق
async function handleCancelCloseButton(interaction, client) {
  console.log('❌ إلغاء إغلاق التذكرة');

  await interaction.update({ 
    content: '❌ تم إلغاء الإغلاق.', 
    components: [], 
    embeds: [] 
  });
}

// زر إخفاء التذكرة
async function handleHideTicketButton(interaction, client) {
  const Ticket = require('../models/Ticket');
  const ticket = await Ticket.findOne({ 
    channelId: interaction.channel.id, 
    status: { $in: ['open', 'claimed'] } 
  });

  if (!ticket) {
    console.log('❌ محاولة إخفاء تذكرة غير موجودة');
    return interaction.reply({ 
      content: '❌ هذه ليست قناة تذكرة مفتوحة.', 
      ephemeral: true 
    });
  }

  console.log(`👁️ محاولة إخفاء التذكرة: ${ticket.ticketId}`);

  try {
    // إخفاء التذكرة من المستخدم
    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false
    });

    // تحديث حالة التذكرة
    ticket.status = 'hidden';
    await ticket.save();

    const hideEmbed = new EmbedBuilder()
      .setTitle('👁️ تم إخفاء التذكرة')
      .setDescription(`تم إخفاء التذكرة من <@${ticket.userId}>\nالتذكرة لا تزال موجودة للإدارة ولكن لا يمكن للعميل رؤيتها.`)
      .setColor(client.config.COLORS.WARNING)
      .setTimestamp();

    await interaction.reply({ embeds: [hideEmbed] });

    // إرسال رسالة للخاص
    const dmEmbed = new EmbedBuilder()
      .setTitle('👁️ تم إخفاء تذكرتك')
      .setDescription('تم إخفاء تذكرتك من قبل الإدارة. لم تعد تستطيع الوصول إليها.')
      .setColor(client.config.COLORS.WARNING)
      .setTimestamp();

    try {
      const user = await client.users.fetch(ticket.userId);
      await user.send({ embeds: [dmEmbed] });
    } catch {
      console.log('⚠️ لا يمكن إرسال رسالة خاصة للمستخدم');
    }

    console.log(`✅ تم إخفاء التذكرة: ${ticket.ticketId}`);

  } catch (error) {
    console.error('❌ خطأ في إخفاء التذكرة:', error);
    await interaction.reply({ 
      content: '❌ حدث خطأ في إخفاء التذكرة.', 
      ephemeral: true 
    });
  }
}

// زر مساعد الإدارة
async function handleAdminHelperButton(interaction, client) {
  console.log('🔧 فتح مساعد الإدارة');
  await client.adminHelper.openAdminHelper(interaction);
}

// اختيارات مساعد الإدارة
async function handleTicketOptionsSelect(interaction, client) {
  const selectedAction = interaction.values[0];
  console.log(`🔧 اختيار مساعد الإدارة: ${selectedAction}`);

  await client.adminHelper.handleAdminHelperSelect(interaction, selectedAction);
}

// تأكيد التصفير
async function handleResetConfirmation(interaction, client) {
  const { customId } = interaction;

  try {
    console.log(`🔄 تأكيد التصفير: ${customId}`);

    if (customId === 'confirm_reset_all') {
      // تصفير جميع الإحصائيات
      const Stats = require('../models/Stats');
      await Stats.deleteMany({ guildId: interaction.guild.id });

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ تم التصفير')
        .setDescription('تم تصفير إحصائيات جميع الأعضاء بنجاح.')
        .setColor(client.config.COLORS.SUCCESS)
        .setTimestamp();

      await interaction.update({ 
        embeds: [successEmbed], 
        components: [] 
      });

      console.log('✅ تم تصفير جميع الإحصائيات');

    } else if (customId.startsWith('confirm_reset_user_')) {
      // تصفير إحصائيات عضو معين
      const userId = customId.replace('confirm_reset_user_', '');
      const Stats = require('../models/Stats');

      await Stats.findOneAndDelete({ 
        guildId: interaction.guild.id, 
        userId: userId 
      });

      const user = await client.users.fetch(userId);
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ تم التصفير')
        .setDescription(`تم تصفير إحصائيات ${user} بنجاح.`)
        .setColor(client.config.COLORS.SUCCESS)
        .setTimestamp();

      await interaction.update({ 
        embeds: [successEmbed], 
        components: [] 
      });

      console.log(`✅ تم تصفير إحصائيات المستخدم: ${user.tag}`);
    }

  } catch (error) {
    console.error('❌ خطأ في التصفير:', error);

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ حدث خطأ')
      .setDescription('حدث خطأ أثناء تصفير الإحصائيات.')
      .setColor(client.config.COLORS.ERROR);

    await interaction.update({ 
      embeds: [errorEmbed], 
      components: [] 
    });
  }
}

// إلغاء التصفير
async function handleCancelReset(interaction, client) {
  console.log('❌ إلغاء التصفير');

  await interaction.update({ 
    content: '❌ تم إلغاء التصفير.', 
    components: [], 
    embeds: [] 
  });
}