const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { COLORS } = require('../config');
const fs = require('fs').promises;
const path = require('path');

class TicketCloser {
  constructor(client) {
    this.client = client;
  }

  // بدء عملية الإغلاق
  async startCloseProcess(interaction, ticket) {
    // التحقق من الصلاحيات
    const hasPermission = await this.checkClosePermissions(interaction.user.id, interaction.guild.id, ticket.type);
    if (!hasPermission) {
      throw new Error('لا تملك صلاحية إغلاق التذكرة.');
    }

    // إنشاء تأكيد الإغلاق
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ تأكيد الإغلاق')
      .setDescription('هل أنت متأكد من إغلاق هذه التذكرة؟')
      .addFields(
        { name: 'رقم التذكرة', value: ticket.ticketId, inline: true },
        { name: 'النوع', value: ticket.type, inline: true },
        { name: 'المستخدم', value: `<@${ticket.userId}>`, inline: true }
      )
      .setColor(COLORS.WARNING)
      .setTimestamp();

    const confirmBtn = new ButtonBuilder()
      .setCustomId('confirm_close')
      .setLabel('تأكيد الإغلاق')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const cancelBtn = new ButtonBuilder()
      .setCustomId('cancel_close')
      .setLabel('إلغاء')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');

    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    await interaction.reply({ 
      embeds: [confirmEmbed], 
      components: [row],
      ephemeral: false 
    });
  }

  // تأكيد الإغلاق
  async confirmClose(interaction, ticket) {
    try {
      await interaction.update({
        content: '✅ جاري إغلاق التذكرة ...',
        components: [],
        embeds: []
      });

      // حفظ اللوجات
      const logContent = await this.saveTicketLogs(interaction.channel, ticket);

      // تحديث التذكرة في قاعدة البيانات
      await this.updateTicketInDatabase(ticket);

      // إرسال اللوجات
      await this.sendTicketLogs(interaction.guild.id, ticket, logContent);

      // إرسال رسالة الإغلاق
      await this.sendCloseMessage(interaction.channel, ticket);

      // حذف القناة بعد 3 ثواني
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (error) {
          console.error('❌ خطأ في حذف القناة:', error);
        }
      }, 3000);

    } catch (error) {
      console.error('❌ خطأ في إغلاق التذكرة:', error);
      await interaction.editReply({ 
        content: '❌ حدث خطأ أثناء إغلاق التذكرة.' 
      });
    }
  }

  // التحقق من صلاحيات الإغلاق
  async checkClosePermissions(userId, guildId, ticketType) {
    const serverSettings = await this.client.database.getServerSettings(guildId);
    const guild = this.client.guilds.cache.get(guildId);
    const member = await guild.members.fetch(userId);

    // المشرفين يمكنهم إغلاق أي تذكرة
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

  // حفظ لوجات التذكرة
  async saveTicketLogs(channel, ticket) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      let logContent = `لوجات تذكرة: ${ticket.ticketId}\n`;
      logContent += `النوع: ${ticket.type}\n`;
      logContent += `المستخدم: ${ticket.userName} (${ticket.userId})\n`;
      logContent += `تاريخ الفتح: ${ticket.createdAt.toLocaleString('ar-EG')}\n`;
      logContent += `تاريخ الإغلاق: ${new Date().toLocaleString('ar-EG')}\n`;
      logContent += '='.repeat(50) + '\n\n';

      sortedMessages.forEach(message => {
        const timestamp = message.createdAt.toLocaleString('ar-EG');
        const author = message.author.tag;
        const content = message.content || '(مرفقات فقط)';
        
        logContent += `[${timestamp}] ${author}: ${content}\n`;
        
        // إضافة المرفقات إذا وجدت
        if (message.attachments.size > 0) {
          message.attachments.forEach(attachment => {
            logContent += `[مرفق] ${attachment.url}\n`;
          });
        }
        
        logContent += '\n';
      });

      // حفظ الملف
      const logsDir = path.join(__dirname, '../logs');
      try {
        await fs.access(logsDir);
      } catch {
        await fs.mkdir(logsDir, { recursive: true });
      }

      const logFilePath = path.join(logsDir, `${ticket.ticketId}.txt`);
      await fs.writeFile(logFilePath, logContent, 'utf8');

      return logContent;

    } catch (error) {
      console.error('❌ خطأ في حفظ اللوجات:', error);
      return '❌ تعذر حفظ اللوجات';
    }
  }

  // تحديث التذكرة في قاعدة البيانات
  async updateTicketInDatabase(ticket) {
    const Ticket = require('../models/Ticket');
    
    await Ticket.findOneAndUpdate(
      { ticketId: ticket.ticketId },
      {
        status: 'closed',
        closedAt: new Date(),
        messageCount: ticket.messageCount || 0
      }
    );

    // تحديث إحصائيات السيرفر
    await this.client.database.updateServerSettings(ticket.guildId, {
      $inc: { 
        'statistics.closedTickets': 1,
        'statistics.openedTickets': -1
      }
    });
  }

  // إرسال اللوجات إلى قناة اللوج
  async sendTicketLogs(guildId, ticket, logContent) {
    try {
      const serverSettings = await this.client.database.getServerSettings(guildId);
      let logChannelId;

      // تحديد قناة اللوج المناسبة
      switch (ticket.type) {
        case 'support':
          logChannelId = serverSettings.logChannels?.support;
          break;
        case 'complaint':
          logChannelId = serverSettings.logChannels?.complaint;
          break;
        case 'rankup':
          logChannelId = serverSettings.logChannels?.rankup;
          break;
      }

      if (!logChannelId) return;

      const logChannel = this.client.channels.cache.get(logChannelId);
      if (!logChannel) return;

      // إنشاء إيمبد اللوج
      const logEmbed = new EmbedBuilder()
        .setTitle(`📋 تم إغلاق تذكرة: ${ticket.ticketId}`)
        .setDescription(`**تم إغلاق التذكرة بنجاح**`)
        .addFields(
          { name: '👤 العضو', value: `<@${ticket.userId}>`, inline: true },
          { name: '📝 النوع', value: ticket.type, inline: true },
          { name: '🕒 المدة', value: this.getTicketDuration(ticket), inline: true },
          { name: '💬 عدد الرسائل', value: ticket.messageCount?.toString() || '0', inline: true },
          { name: '📄 السبب', value: ticket.reason?.substring(0, 100) + '...' || 'غير محدد', inline: false }
        )
        .setColor(COLORS.PRIMARY)
        .setTimestamp();

      // إرسال اللوجات
      const logFilePath = path.join(__dirname, '../logs', `${ticket.ticketId}.txt`);
      
      await logChannel.send({
        embeds: [logEmbed],
        files: [logFilePath]
      });

      console.log(`✅ تم إرسال لوجات التذكرة ${ticket.ticketId} إلى قناة اللوج`);

    } catch (error) {
      console.error('❌ خطأ في إرسال اللوجات:', error);
    }
  }

  // حساب مدة التذكرة
  getTicketDuration(ticket) {
    const opened = new Date(ticket.createdAt);
    const closed = new Date();
    const duration = closed - opened;

    const minutes = Math.floor(duration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} يوم و ${hours % 24} ساعة`;
    if (hours > 0) return `${hours} ساعة و ${minutes % 60} دقيقة`;
    return `${minutes} دقيقة`;
  }

  // إرسال رسالة الإغلاق
  async sendCloseMessage(channel, ticket) {
    const closeEmbed = new EmbedBuilder()
      .setTitle('🔒 تم إغلاق التذكرة')
      .setDescription('تم إغلاق التذكرة بنجاح وسيتم حذف القناة خلال ثوانٍ.')
      .addFields(
        { name: 'رقم التذكرة', value: ticket.ticketId, inline: true },
        { name: 'النوع', value: ticket.type, inline: true },
        { name: 'المستخدم', value: `<@${ticket.userId}>`, inline: true }
      )
      .setColor(COLORS.SUCCESS)
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });
  }
}

module.exports = TicketCloser;