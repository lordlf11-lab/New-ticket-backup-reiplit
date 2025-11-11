const { Events, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const path = require('path');
const fs = require('fs');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    try {
      // جلب إعدادات السيرفر
      const serverSettings = await client.database.getServerSettings(member.guild.id);
      
      // إذا لم يتم تعيين قناة الترحيب، توقف
      if (!serverSettings?.logChannels?.welcome) return;

      const welcomeChannel = member.guild.channels.cache.get(serverSettings.logChannels.welcome);
      if (!welcomeChannel) return;

      // إنشاء صورة الترحيب
      const welcomeImage = await createWelcomeImage(member);
      
      // إرسال رسالة الترحيب
      const welcomeMessage = serverSettings.messages?.welcomeMessage || 
        ` **Welcome <@${member.id}> !**\n👥 **Members:** ${member.guild.memberCount}\n **أسفرت وأنورت ❤️**`;

      await welcomeChannel.send({
        content: welcomeMessage,
        files: [welcomeImage]
      });

      // تحديث إحصائيات السيرفر
      await client.database.updateServerSettings(member.guild.id, {
        $inc: { 'statistics.totalMembers': 1 }
      });

      console.log(`✅ تم ترحيب عضو جديد: ${member.user.tag}`);

    } catch (error) {
      console.error('❌ خطأ في نظام الترحيب:', error);
    }
  }
};

// إنشاء صورة الترحيب
async function createWelcomeImage(member) {
  try {
    const backgroundPath = path.join(__dirname, '../assets/welcome-bg.png');
    
    // إذا لم توجد خلفية، استخدم بديل
    if (!fs.existsSync(backgroundPath)) {
      return createSimpleWelcomeImage(member);
    }

    const background = await Canvas.loadImage(backgroundPath);
    const canvas = Canvas.createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');

    // رسم الخلفية
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // رسم الصورة الشخصية بشكل دائري
    const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatarSize = 180;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // إضافة النص
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`مرحباً بـ ${member.user.username}`, canvas.width / 2, avatarY + avatarSize + 50);

    ctx.font = '24px Arial';
    ctx.fillText(`العضو رقم #${member.guild.memberCount}`, canvas.width / 2, avatarY + avatarSize + 90);

    // إنشاء الملف
    const buffer = await canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, { name: 'welcome.png' });

  } catch (error) {
    console.error('❌ خطأ في إنشاء صورة الترحيب:', error);
    return createSimpleWelcomeImage(member);
  }
}

// إنشاء صورة ترحيب بسيطة
async function createSimpleWelcomeImage(member) {
  const canvas = Canvas.createCanvas(800, 300);
  const ctx = canvas.getContext('2d');

  // خلفية متدرجة
  const gradient = ctx.createLinearGradient(0, 0, 800, 300);
  gradient.addColorStop(0, '#da2424');
  gradient.addColorStop(1, '#ff6b6b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 300);

  // نص الترحيب
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`مرحباً بك في ${member.guild.name}`, 400, 80);

  ctx.font = '24px Arial';
  ctx.fillText(member.user.username, 400, 150);

  ctx.font = '18px Arial';
  ctx.fillText(`العضو رقم #${member.guild.memberCount}`, 400, 200);

  const buffer = await canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'welcome.png' });
}