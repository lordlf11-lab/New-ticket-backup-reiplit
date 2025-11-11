const { 
  ChannelType, 
  PermissionsBitField, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const { COLORS, IMAGES } = require('../config');

class TicketSystem {
  constructor(client) {
    this.client = client;
    this.timeouts = new Map();
    this.activeTimers = new Map();
  }

  // فتح نموذج سبب التذكرة
  async openTicketReasonModal(interaction, type) {
    const reasonModal = new ModalBuilder()
      .setCustomId(`ticket_reason_${type}`)
      .setTitle('سبب فتح التذكرة');

    const reasonInput = new TextInputBuilder()
      .setCustomId('ticket_reason')
      .setLabel('ما هو سبب فتح التذكرة؟ اكتب بالتفصيل')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000);

    const actionRow = new ActionRowBuilder().addComponents(reasonInput);
    reasonModal.addComponents(actionRow);

    await interaction.showModal(reasonModal);
  }

  // إنشاء تذكرة جديدة
  async createTicket(interaction, type, reason) {
    const { guild, user } = interaction;
    
    try {
      // جلب إعدادات السيرفر
      const serverSettings = await this.client.database.getServerSettings(guild.id);
      
      // التحقق من الإعدادات
      if (!serverSettings.ticketSettings?.categoryId) {
        throw new Error('لم يتم إعداد النظام بعد. استخدم /setup أولاً.');
      }

      // التحقق من وجود تذاكر مفتوحة
      const Ticket = require('../models/Ticket');
      const openTickets = await Ticket.countDocuments({
        guildId: guild.id,
        userId: user.id,
        status: { $in: ['open', 'claimed'] }
      });

      const maxTickets = serverSettings.security?.maxTicketsPerUser || 1;
      if (openTickets >= maxTickets) {
        throw new Error(`لديك بالفعل ${openTickets} تذكرة مفتوحة. الحد الأقصى هو ${maxTickets}.`);
      }

      // إنشاء رقم التذكرة
      const ticketCount = await Ticket.countDocuments({ guildId: guild.id });
      const ticketNumber = ticketCount + 1;
      const ticketName = `${type}-${ticketNumber.toString().padStart(4, '0')}`;

      // إعداد الصلاحيات
      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles
          ]
        }
      ];

      // إضافة صلاحيات الرتب
      const rolePermissions = this.getRolePermissions(type, serverSettings);
      permissionOverwrites.push(...rolePermissions);

      // إنشاء القناة
      const channel = await guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: serverSettings.ticketSettings.categoryId,
        permissionOverwrites,
        topic: `تذكرة ${type} - ${user.tag} - ${reason.substring(0, 100)}...`
      });

      // حفظ التذكرة في قاعدة البيانات
      const ticketData = {
        ticketId: ticketName,
        guildId: guild.id,
        channelId: channel.id,
        userId: user.id,
        userName: user.username,
        type: type,
        reason: reason,
        status: 'open',
        messageCount: 0,
        createdAt: new Date()
      };

      const ticket = new Ticket(ticketData);
      await ticket.save();

      // تحديث إحصائيات السيرفر
      await this.client.database.updateServerSettings(guild.id, {
        $inc: { 
          'statistics.totalTickets': 1,
          'statistics.openedTickets': 1
        }
      });

      // إرسال رسالة الترحيب في التذكرة
      await this.sendTicketWelcomeMessage(channel, ticket, serverSettings);

      // إرسال رسالة خاصة للمستخدم
      await this.sendTicketDM(user, channel, ticket, reason);

      return { channel, ticket };

    } catch (error) {
      console.error('❌ خطأ في إنشاء التذكرة:', error);
      throw error;
    }
  }

  // الحصول على صلاحيات الرتب
  getRolePermissions(type, serverSettings) {
    const permissions = [];
    const basePermissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.EmbedLinks
    ];

    switch (type) {
      case 'support':
        if (serverSettings.ticketSettings?.supportRole) {
          permissions.push({
            id: serverSettings.ticketSettings.supportRole,
            allow: basePermissions
          });
        }
        break;

      case 'complaint':
        if (serverSettings.ticketSettings?.complaintRole) {
          permissions.push({
            id: serverSettings.ticketSettings.complaintRole,
            allow: basePermissions
          });
        }
        break;

      case 'rankup':
        if (serverSettings.ticketSettings?.rankupRole) {
          permissions.push({
            id: serverSettings.ticketSettings.rankupRole,
            allow: basePermissions
          });
        }
        break;
    }

    // إضافة صلاحيات المشرفين
    if (serverSettings.ticketSettings?.adminRole) {
      permissions.push({
        id: serverSettings.ticketSettings.adminRole,
        allow: [...basePermissions, PermissionsBitField.Flags.ManageChannels]
      });
    }

    return permissions;
  }

  // إرسال رسالة الترحيب في التذكرة
  async sendTicketWelcomeMessage(channel, ticket, serverSettings) {
    const { type, reason } = ticket;

    // بناء الوصف بناءً على نوع التذكرة
    let description, title, image;
    
    switch (type) {
      case 'support':
        title = serverSettings.messages?.supportTitle || '**🎫 الـدعـم الـفـنـي**';
        description = serverSettings.messages?.supportDescription || 
          '**مرحبا بك ، لمساعدتك بأفضل شكل يرجى منك طرح مشكلتك او استفسارك بكل وضوح ودقة ، لاتزعج الإدارة بكثرة المنشن ، وكن محترم معهم.**';
        image = IMAGES.TICKET_BANNER;
        break;

      case 'complaint':
        title = '**🎫 طـلـب إدارة عـلـيـا**';
        description = '**مرحبا بك في تذكرة طلب إدارة عليا ، نرجوا منك طوح مشكلتك او سؤالك ، علما ان الاستهبال يؤدي للعقوبة ،، لا تزعج العليا بالمنشن.**';
        image = IMAGES.COMPLAINT_BANNER;
        break;

      case 'rankup':
        title = '**🎫 طـلـب رفـع رانـك**';
        description = '**مرحبا بك في تذكرة رفع الرانك ، يرجى توضيح طلبك بشكل مفصل.**';
        image = IMAGES.TICKET_BANNER;
        break;
    }

    // إضافة سبب فتح التذكرة
    description += `\n\n**سبب فتح التذكرة:**\n${reason}`;

    // إنشاء الإيمبد
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(COLORS.PRIMARY)
      .setThumbnail(channel.guild.iconURL())
      .setImage(image)
      .setFooter({ text: `رقم التذكرة: ${ticket.ticketId} | النوع: ${type}` })
      .setTimestamp();

    // إنشاء الأزرار
    const buttons = this.createTicketButtons();

    // إرسال الرسالة
    const mention = this.getRoleMention(type, serverSettings);
    await channel.send({
      content: `<@${ticket.userId}> ${mention}`,
      embeds: [welcomeEmbed],
      components: [buttons]
    });
  }

  // إنشاء أزرار التذكرة
  createTicketButtons() {
    const claimBtn = new ButtonBuilder()
      .setCustomId('claim_ticket')
      .setLabel('استلام التذكرة')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎯');

    const closeBtn = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('إغلاق التذكرة')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const adminHelperBtn = new ButtonBuilder()
      .setCustomId('admin_helper')
      .setLabel('مساعد الإدارة')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔧');

    const hideBtn = new ButtonBuilder()
      .setCustomId('hide_ticket')
      .setLabel('إخفاء التذكرة')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👁️');

    return new ActionRowBuilder().addComponents(claimBtn, closeBtn, adminHelperBtn, hideBtn);
  }

  // الحصول على منشن الرتب
  getRoleMention(type, serverSettings) {
    switch (type) {
      case 'support':
        return serverSettings.ticketSettings?.supportRole ? `<@&${serverSettings.ticketSettings.supportRole}>` : '';
      case 'complaint':
        return serverSettings.ticketSettings?.complaintRole ? `<@&${serverSettings.ticketSettings.complaintRole}>` : '';
      case 'rankup':
        return serverSettings.ticketSettings?.rankupRole ? `<@&${serverSettings.ticketSettings.rankupRole}>` : '';
      default:
        return '';
    }
  }

  // إرسال رسالة خاصة للمستخدم
  async sendTicketDM(user, channel, ticket, reason) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('🎫 تم فتح تذكرة جديدة')
        .setDescription(`**تم فتح تذكرتك بنجاح!**`)
        .addFields(
          {
            name: '📋 معلومات التذكرة',
            value: `**النوع:** ${ticket.type}\n**الرقم:** ${ticket.ticketId}\n**السبب:** ${reason.substring(0, 200)}...`,
            inline: true
          },
          {
            name: '🔗 روابط سريعة',
            value: `**رابط التذكرة:** ${channel}`,
            inline: true
          }
        )
        .setColor(COLORS.SUCCESS)
        .setTimestamp()
        .setFooter({ text: 'شكراً لاستخدامك نظام التذاكر' });

      await user.send({ embeds: [dmEmbed] });
    } catch (error) {
      console.log(`❌ لا يمكن إرسال رسالة خاصة للمستخدم: ${user.tag}`);
    }
  }

  // استلام التذكرة
  async claimTicket(interaction, ticket) {
    const { user, guild, channel } = interaction;

    try {
      // التحقق من الصلاحيات
      const hasPermission = await this.checkStaffPermissions(user.id, guild.id, ticket.type);
      if (!hasPermission) {
        throw new Error('لا تملك صلاحية استلام هذه التذكرة.');
      }

      // التحقق إذا كانت التذكرة مستلمة مسبقاً
      if (ticket.status === 'claimed' && ticket.claimedBy !== user.id) {
        throw new Error('التذكرة مستلمة من قبل شخص آخر.');
      }

      // تحديث التذكرة في قاعدة البيانات
      const Ticket = require('../models/Ticket');
      await Ticket.findOneAndUpdate(
        { ticketId: ticket.ticketId },
        {
          status: 'claimed',
          claimedBy: user.id,
          claimedName: user.username,
          claimedAt: new Date()
        }
      );

      // تحديث إحصائيات المستخدم
      await this.updateUserStats(user.id, guild.id, ticket.type);

      // تعديل صلاحيات القناة
      await this.updateChannelPermissions(channel, user.id, ticket.type);

      // تحديث واجهة التذكرة
      await this.updateTicketInterface(interaction, ticket, user);

      // إرسال رسالة التأكيد
      const claimEmbed = new EmbedBuilder()
        .setDescription(`** قام الإداري <@${user.id}> باستلام التذكرة. \n سيتابع معك التذكرة ويقدم لك المساعدة 💛**`)
        .setColor(COLORS.PRIMARY);

      await interaction.reply({ embeds: [claimEmbed] });

      console.log(`✅ تم استلام التذكرة ${ticket.ticketId} بواسطة ${user.tag}`);

    } catch (error) {
      console.error('❌ خطأ في استلام التذكرة:', error);
      throw error;
    }
  }

  // التحقق من صلاحيات الإدارة
  async checkStaffPermissions(userId, guildId, ticketType) {
    const serverSettings = await this.client.database.getServerSettings(guildId);
    const guild = this.client.guilds.cache.get(guildId);
    const member = await guild.members.fetch(userId);

    // التحقق من رتبة المشرفين
    if (serverSettings.ticketSettings?.adminRole && 
        member.roles.cache.has(serverSettings.ticketSettings.adminRole)) {
      return true;
    }

    // التحقق من الرتب الخاصة بنوع التذكرة
    switch (ticketType) {
      case 'support':
        return serverSettings.ticketSettings?.supportRole && 
               member.roles.cache.has(serverSettings.ticketSettings.supportRole);
      
      case 'complaint':
        return serverSettings.ticketSettings?.complaintRole && 
               member.roles.cache.has(serverSettings.ticketSettings.complaintRole);
      
      case 'rankup':
        return serverSettings.ticketSettings?.rankupRole && 
               member.roles.cache.has(serverSettings.ticketSettings.rankupRole);
      
      default:
        return false;
    }
  }

  // تحديث إحصائيات المستخدم
  async updateUserStats(userId, guildId, ticketType) {
    const Stats = require('../models/Stats');
    
    const updateFields = {
      $inc: { 
        'tickets.totalClaimed': 1,
        [`tickets.${ticketType}Claimed`]: 1
      },
      $set: { 
        userName: this.client.users.cache.get(userId)?.username || 'مستخدم غير معروف',
        'activity.lastActive': new Date()
      }
    };

    await Stats.findOneAndUpdate(
      { guildId, userId },
      updateFields,
      { upsert: true, new: true }
    );
  }

  // تحديث صلاحيات القناة
  async updateChannelPermissions(channel, claimantId, ticketType) {
    const serverSettings = await this.client.database.getServerSettings(channel.guild.id);

    // إزالة صلاحيات الرتب
    switch (ticketType) {
      case 'support':
        if (serverSettings.ticketSettings?.supportRole) {
          await channel.permissionOverwrites.edit(serverSettings.ticketSettings.supportRole, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false
          });
        }
        break;

      case 'complaint':
        if (serverSettings.ticketSettings?.complaintRole) {
          await channel.permissionOverwrites.edit(serverSettings.ticketSettings.complaintRole, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false
          });
        }
        break;

      case 'rankup':
        if (serverSettings.ticketSettings?.rankupRole) {
          await channel.permissionOverwrites.edit(serverSettings.ticketSettings.rankupRole, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false
          });
        }
        break;
    }

    // إضافة صلاحيات المستلم
    await channel.permissionOverwrites.edit(claimantId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageMessages: true
    });

    // تغيير اسم القناة
    const claimant = this.client.users.cache.get(claimantId);
    await channel.setName(`claimed-by-${claimant.username}`);
  }

  // تحديث واجهة التذكرة
  async updateTicketInterface(interaction, ticket, claimant) {
    const claimBtnDisabled = new ButtonBuilder()
      .setCustomId('claim_ticket')
      .setLabel(`تم الاستلام بواسطة ${claimant.username}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
      .setEmoji('✅');

    const closeBtn = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('إغلاق التذكرة')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const adminHelperBtn = new ButtonBuilder()
      .setCustomId('admin_helper')
      .setLabel('مساعد الإدارة')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔧');

    const hideBtn = new ButtonBuilder()
      .setCustomId('hide_ticket')
      .setLabel('إخفاء التذكرة')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👁️');

    const updatedRow = new ActionRowBuilder().addComponents(
      claimBtnDisabled, 
      closeBtn, 
      adminHelperBtn, 
      hideBtn
    );

    // تحديث الرسالة الأصلية
    try {
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const ticketMessage = messages.find(msg => 
        msg.components.length > 0 && 
        msg.embeds.length > 0 &&
        msg.embeds[0].title?.includes('التذكرة')
      );

      if (ticketMessage) {
        await ticketMessage.edit({ components: [updatedRow] });
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث واجهة التذكرة:', error);
    }
  }
}

module.exports = TicketSystem;