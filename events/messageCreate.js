const { Events, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DEFAULT_PREFIX } = require('../config');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    // تجاهل رسائل البوتات
    if (message.author.bot) return;

    // تجاهل الرسائل خارج السيرفرات
    if (!message.guild) return;

    try {
      // جلب إعدادات السيرفر
      const serverSettings = await client.database.getServerSettings(message.guild.id);
      const prefix = serverSettings?.prefix || DEFAULT_PREFIX;

      console.log(`📨 رسالة جديدة من ${message.author.tag}: ${message.content}`);
      console.log(`🔍 البادئة: ${prefix}`);

      // التحقق من الأمر العادي
      if (message.content.startsWith(prefix)) {
        console.log(`🎯 تم اكتشاف أمر: ${message.content}`);
        await handlePrefixCommand(message, client, prefix, serverSettings);
        return;
      }

      // معالجة الردود على التذاكر
      await handleTicketReplies(message, client, serverSettings);

      // تحديث إحصائيات النشاط
      await updateUserStats(message, client);

    } catch (error) {
      console.error('❌ خطأ في معالجة الرسالة:', error);
    }
  }
};

// معالجة الأوامر العادية
async function handlePrefixCommand(message, client, prefix, serverSettings) {
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  console.log(`🔧 معالجة أمر: ${commandName}`, args);

  // حذف رسالة الأمر
  try {
    await message.delete();
  } catch (error) {
    console.log('⚠️ لا يمكن حذف الرسالة');
  }

  // الأوامر العادية
  switch (commandName) {
    case 'خط':
      await handleLineCommand(message, client, serverSettings);
      break;

    case 'say':
      await handleSayCommand(message, client, args, serverSettings);
      break;

    case 'embed':
      await handleEmbedCommand(message, client, args, serverSettings);
      break;

    case 'ticket':
      await handleTicketCommand(message, client, serverSettings);
      break;

    case 'فحص':
      await handleStatsCommand(message, client, serverSettings);
      break;

    case 'تصفير':
      await handleResetCommand(message, client, args, serverSettings);
      break;

    case 'نداء':
      await handleCallCommand(message, client, args, serverSettings);
      break;

    case 'مهلة':
      await handleTimeoutCommand(message, client, serverSettings);
      break;

    case 'rename':
      await handleRenameCommand(message, client, args, serverSettings);
      break;

    default:
      console.log(`❌ أمر غير معروف: ${commandName}`);
      break;
  }
}

// معالجة الردود في التذاكر
async function handleTicketReplies(message, client, serverSettings) {
  const Ticket = require('../models/Ticket');
  const ticket = await Ticket.findOne({ 
    channelId: message.channel.id, 
    status: { $in: ['open', 'claimed'] } 
  });

  if (ticket) {
    console.log(`💬 رسالة في تذكرة ${ticket.ticketId} من ${message.author.tag}`);

    // إذا كان المرسل هو صاحب التذكرة
    if (message.author.id === ticket.userId) {
      // إلغاء أي مهلة زمنية نشطة
      const wasCancelled = client.timeoutSystem.cancelTimeout(message.channel.id, message.author.id);

      if (wasCancelled) {
        console.log(`⏰ تم إلغاء مهلة التذكرة ${ticket.ticketId}`);

        const activityEmbed = new EmbedBuilder()
          .setTitle('✅ تم إيقاف المهلة')
          .setDescription(`تم إيقاف المهلة الزمنية بسبب رد <@${message.author.id}> على الرسالة.`)
          .setColor(client.config.COLORS.SUCCESS)
          .setTimestamp();

        await message.channel.send({ embeds: [activityEmbed] });
      }

      // زيادة عداد الرسائل
      ticket.messageCount += 1;
      await ticket.save();
    }

    // تحديث إحصائيات المستخدم
    await updateUserActivity(message.author.id, message.guild.id, client);
  }
}

// تحديث إحصائيات المستخدم
async function updateUserStats(message, client) {
  const Stats = require('../models/Stats');

  try {
    await Stats.findOneAndUpdate(
      { guildId: message.guild.id, userId: message.author.id },
      { 
        $set: { userName: message.author.username },
        $inc: { 'activity.totalMessages': 1 },
        $set: { 'activity.lastActive': new Date() }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('❌ خطأ في تحديث إحصائيات المستخدم:', error);
  }
}

// تحديث نشاط المستخدم
async function updateUserActivity(userId, guildId, client) {
  const Stats = require('../models/Stats');

  try {
    await Stats.findOneAndUpdate(
      { guildId, userId },
      { 
        $set: { 'activity.lastActive': new Date() }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('❌ خطأ في تحديث نشاط المستخدم:', error);
  }
}

// ========== دوال الأوامر العادية ==========

// أمر الخط
async function handleLineCommand(message, client, serverSettings) {
  console.log('🎨 تشغيل أمر الخط');

  if (!serverSettings.ticketSettings?.lineRole) {
    return message.channel.send('❌ لم يتم إعداد رتبة الخط بعد.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const member = await message.guild.members.fetch(message.author.id);
  const hasLineRole = member.roles.cache.has(serverSettings.ticketSettings.lineRole);

  if (!hasLineRole) {
    return message.channel.send('❌ لا تملك صلاحية استخدام هذا الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  await message.channel.send(client.config.IMAGES.LINE_IMAGE);
}

// أمر say
async function handleSayCommand(message, client, args, serverSettings) {
  console.log('🗣️ تشغيل أمر say');

  if (!serverSettings.ticketSettings?.adminRole) {
    return message.channel.send('❌ لم يتم إعداد رتبة المشرفين بعد.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const member = await message.guild.members.fetch(message.author.id);
  const hasAdminRole = member.roles.cache.has(serverSettings.ticketSettings.adminRole);

  if (!hasAdminRole) {
    return message.channel.send('❌ لا تملك صلاحية استخدام هذا الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const text = args.join(' ');
  if (!text) {
    return message.channel.send('❌ يرجى كتابة النص بعد الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  await message.channel.send(text);
}

// أمر embed
async function handleEmbedCommand(message, client, args, serverSettings) {
  console.log('🖼️ تشغيل أمر embed');

  if (!serverSettings.ticketSettings?.adminRole) {
    return message.channel.send('❌ لم يتم إعداد رتبة المشرفين بعد.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const member = await message.guild.members.fetch(message.author.id);
  const hasAdminRole = member.roles.cache.has(serverSettings.ticketSettings.adminRole);

  if (!hasAdminRole) {
    return message.channel.send('❌ لا تملك صلاحية استخدام هذا الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const text = args.join(' ');
  if (!text) {
    return message.channel.send('❌ يرجى كتابة النص بعد الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const embed = new EmbedBuilder()
    .setDescription(text)
    .setColor(client.config.COLORS.PRIMARY)
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}

// أمر ticket
async function handleTicketCommand(message, client, serverSettings) {
  console.log('🎫 تشغيل أمر ticket عادي');

  // استخدام النظام الرئيسي لفتح لوحة التذاكر
  const openTicketButton = new ButtonBuilder()
    .setCustomId('open_ticket_btn')
    .setLabel('اخـتـيـار نـوع الـتـذكـرة')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🎫');

  const row = new ActionRowBuilder().addComponents(openTicketButton);

  const mainEmbed = new EmbedBuilder()
    .setTitle('**قـسـم الـدعـم الـفـنـي**')
    .setDescription('**اضغط زر "اخـتـيـار نـوع الـتـذكـرة" لطلب فتح تذكرتك.**\n\nاختر نوع التذكرة المناسبة لك من خلال الضغط على الزر بالاسفل\n\nخدمة رفع الرانك لها تذكرتها الخاصة يمكنك اختيارها في حال كنت تريد الخدمة')
    .setColor(client.config.COLORS.PRIMARY)
    .setThumbnail(message.guild.iconURL())
    .setImage(client.config.IMAGES.TICKET_BANNER)
    .setFooter({ text: `السيرفر: ${message.guild.name}`, iconURL: message.guild.iconURL() });

  await message.channel.send({ 
    embeds: [mainEmbed], 
    components: [row]
  });
}

// أمر الفحص
async function handleStatsCommand(message, client, serverSettings) {
  console.log('📊 تشغيل أمر الفحص');

  if (!serverSettings.ticketSettings?.adminRole) {
    return message.channel.send('❌ لم يتم إعداد رتبة المشرفين بعد.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const member = await message.guild.members.fetch(message.author.id);
  const hasAdminRole = member.roles.cache.has(serverSettings.ticketSettings.adminRole);

  if (!hasAdminRole) {
    return message.channel.send('❌ لا تملك صلاحية استخدام هذا الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  // استخدام الأمر السلاش بدلاً من ذلك
  await message.channel.send('🔧 يرجى استخدام الأمر `/فحص` للحصول على إحصائيات مفصلة.').then(msg => {
    setTimeout(() => msg.delete(), 5000);
  });
}

// أمر التصفير
async function handleResetCommand(message, client, args, serverSettings) {
  console.log('🔄 تشغيل أمر التصفير');

  if (!serverSettings.ticketSettings?.adminRole) {
    return message.channel.send('❌ لم يتم إعداد رتبة المشرفين بعد.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const member = await message.guild.members.fetch(message.author.id);
  const hasAdminRole = member.roles.cache.has(serverSettings.ticketSettings.adminRole);

  if (!hasAdminRole) {
    return message.channel.send('❌ لا تملك صلاحية استخدام هذا الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  // استخدام الأمر السلاش بدلاً من ذلك
  await message.channel.send('🔧 يرجى استخدام الأمر `/تصفير` لتصفير الإحصائيات.').then(msg => {
    setTimeout(() => msg.delete(), 5000);
  });
}

// أمر النداء
async function handleCallCommand(message, client, args, serverSettings) {
  console.log('📢 تشغيل أمر النداء');

  const Ticket = require('../models/Ticket');
  const ticket = await Ticket.findOne({ 
    channelId: message.channel.id, 
    status: { $in: ['open', 'claimed'] } 
  });

  if (!ticket) {
    return message.channel.send('❌ هذا الأمر يعمل فقط داخل التذاكر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const text = args.join(' ');
  if (!text) {
    return message.channel.send('❌ يرجى كتابة رسالة النداء بعد الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const callEmbed = new EmbedBuilder()
    .setTitle('📢 نداء عاجل')
    .setDescription(`**من: <@${message.author.id}>**\n\n${text}`)
    .setColor(client.config.COLORS.WARNING)
    .setTimestamp();

  await message.channel.send({ 
    content: `<@${ticket.userId}>`,
    embeds: [callEmbed] 
  });
}

// أمر المهلة
async function handleTimeoutCommand(message, client, serverSettings) {
  console.log('⏰ تشغيل أمر المهلة');

  const Ticket = require('../models/Ticket');
  const ticket = await Ticket.findOne({ 
    channelId: message.channel.id, 
    status: { $in: ['open', 'claimed'] } 
  });

  if (!ticket) {
    return message.channel.send('❌ هذا الأمر يعمل فقط داخل التذاكر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  await client.timeoutSystem.startTimeout(message.channel.id, ticket.userId, ticket.ticketId, 10);

  const timeoutEmbed = new EmbedBuilder()
    .setTitle('⏰ بدء المهلة الزمنية')
    .setDescription('تم بدء مهلة لمدة 10 دقائق.\nيرجى الرد داخل هذه القناة قبل انتهاء المهلة وإغلاق التذكرة.')
    .setColor(client.config.COLORS.WARNING)
    .setTimestamp();

  await message.channel.send({ embeds: [timeoutEmbed] });
}

// أمر تغيير الاسم
async function handleRenameCommand(message, client, args, serverSettings) {
  console.log('✏️ تشغيل أمر rename');

  const Ticket = require('../models/Ticket');
  const ticket = await Ticket.findOne({ 
    channelId: message.channel.id, 
    status: { $in: ['open', 'claimed'] } 
  });

  if (!ticket) {
    return message.channel.send('❌ هذا الأمر يعمل فقط داخل التذاكر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  const newName = args.join(' ');
  if (!newName) {
    return message.channel.send('❌ يرجى كتابة الاسم الجديد بعد الأمر.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }

  try {
    await message.channel.setName(newName);

    const renameEmbed = new EmbedBuilder()
      .setTitle('✏️ تغيير اسم التذكرة')
      .setDescription(`تم تغيير اسم التذكرة إلى: **${newName}**`)
      .setColor(client.config.COLORS.SUCCESS)
      .setTimestamp();

    await message.channel.send({ embeds: [renameEmbed] });

  } catch (error) {
    await message.channel.send('❌ حدث خطأ في تغيير اسم التذكرة.').then(msg => {
      setTimeout(() => msg.delete(), 5000);
    });
  }
}