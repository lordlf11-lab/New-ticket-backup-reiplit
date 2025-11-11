const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  userName: String,
  
  // إحصائيات التذاكر
  tickets: {
    totalClaimed: { type: Number, default: 0 },
    supportClaimed: { type: Number, default: 0 },
    complaintClaimed: { type: Number, default: 0 },
    rankupClaimed: { type: Number, default: 0 }
  },
  
  // النشاط
  activity: {
    lastActive: Date,
    totalMessages: { type: Number, default: 0 }
  },
  
  // التواريخ
  firstSeen: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// index مركب للبحث السريع
statsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Stats', statsSchema);