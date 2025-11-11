const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  guildId: { 
    type: String, 
    required: true 
  },
  channelId: { 
    type: String, 
    required: true 
  },
  
  // معلومات المستخدم
  userId: String,
  userName: String,
  
  // معلومات التذكرة
  type: { 
    type: String, 
    enum: ['support', 'complaint', 'rankup'], 
    required: true 
  },
  reason: String,
  status: { 
    type: String, 
    enum: ['open', 'claimed', 'closed', 'hidden'], 
    default: 'open' 
  },
  
  // معلومات الاستلام
  claimedBy: String,
  claimedAt: Date,
  claimedName: String,
  
  // التواريخ
  createdAt: { type: Date, default: Date.now },
  closedAt: Date,
  
  // الإحصائيات
  messageCount: { type: Number, default: 0 },
  isTimedOut: { type: Boolean, default: false }
});

// إضافة index للبحث السريع
ticketSchema.index({ guildId: 1, userId: 1 });
ticketSchema.index({ guildId: 1, status: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);