const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config');

class TimeoutSystem {
  constructor(client) {
    this.client = client;
    this.timeouts = new Map();
    this.activeTimers = new Map();
  }

  // بدء مهلة زمنية
  async startTimeout(channelId, userId, ticketName, duration = 10) {
    const channel = this.client.channels.cache.get(channelId);
    if (!channel) return;

    const durationMs = duration * 60 * 1000; // تحويل إلى مللي ثانية

    // إرسال رسالة بدء المهلة
    const timeoutEmbed = new EmbedBuilder()
      .setTitle('⏰ بدء المهلة الزمنية')
      .setDescription(`**تم بدء مهلة لمدة ${duration} دقائق.**\n\nيرجى الرد داخل ${channel} قبل انتهاء المهلة وإغلاق التذكرة.`)
      .setColor(COLORS.WARNING)
      .setTimestamp();

    const timerMessage = await channel.send({ embeds: [timeoutEmbed] });
    this.activeTimers.set(channelId, timerMessage);

    // بدء التايمر
    let timeLeft = duration * 60; // ثواني
    const timerInterval = setInterval(() => {
      timeLeft--;
      this.updateTimerDisplay(channelId, timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        this.activeTimers.delete(channelId);
      }
    }, 1000);

    // بدء المهلة
    const timeout = setTimeout(async () => {
      clearInterval(timerInterval);
      this.activeTimers.delete(channelId);

      await this.handleTimeoutExpiry(channelId, ticketName);
    }, durationMs);

    this.timeouts.set(channelId, { timeout, interval: timerInterval, startTime: Date.now() });

    // إرسال رسالة خاصة للمستخدم
    await this.sendTimeoutDM(userId, channel, duration);

    return timeLeft;
  }

  // تحديث عرض التايمر
  async updateTimerDisplay(channelId, timeLeft) {
    try {
      const channel = this.client.channels.cache.get(channelId);
      if (!channel) return;

      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;

      const timerEmbed = new EmbedBuilder()
        .setTitle('⏰ المهلة الزمنية نشطة')
        .setDescription(`**الوقت المتبقي:** ${minutes}:${seconds.toString().padStart(2, '0')}\n\nيرجى الرد داخل ${channel} قبل انتهاء المهلة وإغلاق التذكرة.`)
        .setColor(COLORS.WARNING)
        .setTimestamp();

      const timerMessage = this.activeTimers.get(channelId);
      if (timerMessage) {
        try {
          await timerMessage.edit({ embeds: [timerEmbed] });
        } catch (error) {
          // إذا لم نستطع تعديل الرسالة، ننشئ واحدة جديدة
          const newMessage = await channel.send({ embeds: [timerEmbed] });
          this.activeTimers.set(channelId, newMessage);
        }
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث التايمر:', error);
    }
  }

  // إلغاء المهلة
  cancelTimeout(channelId, userId) {
    const timeoutData = this.timeouts.get(channelId);
    if (timeoutData) {
      clearTimeout(timeoutData.timeout);
      clearInterval(timeoutData.interval);
      this.timeouts.delete(channelId);
    }

    // حذف رسالة التايمر
    const timerMessage = this.activeTimers.get(channelId);
    if (timerMessage) {
      timerMessage.delete().catch(console.error);
      this.activeTimers.delete(channelId);
    }

    return timeoutData !== undefined;
  }

  // معالجة انتهاء المهلة
  async handleTimeoutExpiry(channelId, ticketName) {
    try {
      const channel = this.client.channels.cache.get(channelId);
      if (!channel) return;

      // البحث عن التذكرة
      const Ticket = require('../models/Ticket');
      const ticket = await Ticket.findOne({ channelId: channelId, status: { $in: ['open', 'claimed'] } });

      if (ticket) {
        // تحديث التذكرة
        ticket.status = 'closed';
        ticket.closedAt = new Date();
        ticket.isTimedOut = true;
        await ticket.save();

        // تحديث إحصائيات السيرفر
        await this.client.database.updateServerSettings(ticket.guildId, {
          $inc: { 
            'statistics.closedTickets': 1,
            'statistics.openedTickets': -1
          }
        });
      }

      // إرسال رسالة انتهاء المهلة
      const timeoutEmbed = new EmbedBuilder()
        .setTitle('⏰ انتهت المهلة الزمنية')
        .setDescription('تم إغلاق التذكرة تلقائياً بسبب عدم النشاط خلال المهلة المحددة.')
        .setColor(COLORS.ERROR)
        .setTimestamp();

      await channel.send({ embeds: [timeoutEmbed] });

      // حذف القناة بعد 3 ثواني
      setTimeout(async () => {
        try {
          await channel.delete();
        } catch (error) {
          console.error('❌ خطأ في حذف القناة:', error);
        }
      }, 3000);

      console.log(`✅ تم إغلاق التذكرة ${ticketName} تلقائياً بسبب انتهاء المهلة`);

    } catch (error) {
      console.error('❌ خطأ في معالجة انتهاء المهلة:', error);
    }
  }

  // إرسال رسالة خاصة للمستخدم
  async sendTimeoutDM(userId, channel, duration) {
    try {
      const user = await this.client.users.fetch(userId);
      
      const dmEmbed = new EmbedBuilder()
        .setTitle('⏰ تنبيه مهلة التذكرة')
        .setDescription(`لديك مهلة ${duration} دقائق للرد في تذكرتك.\nإذا لم ترسل أي رسالة خلال هذا الوقت، سيتم حذف التذكرة تلقائياً.`)
        .addFields({
          name: '🔗 رابط التذكرة',
          value: channel.toString()
        })
        .setColor(COLORS.WARNING)
        .setTimestamp();

      await user.send({ embeds: [dmEmbed] });
    } catch (error) {
      console.log(`❌ لا يمكن إرسال رسالة خاصة للمستخدم: ${userId}`);
    }
  }

  // الحصول على معلومات المهلة النشطة
  getActiveTimeout(channelId) {
    return this.timeouts.get(channelId);
  }

  // تنظيف المهلات المنتهية
  cleanupExpiredTimeouts() {
    const now = Date.now();
    for (const [channelId, timeoutData] of this.timeouts) {
      if (timeoutData.startTime && (now - timeoutData.startTime) > 3600000) { // ساعة
        this.timeouts.delete(channelId);
      }
    }
  }
}

module.exports = TimeoutSystem;