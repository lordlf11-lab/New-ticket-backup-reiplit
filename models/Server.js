const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  guildName: String,
  
  // إعدادات التذاكر
  ticketSettings: {
    categoryId: String,
    supportRole: String,
    complaintRole: String,
    rankupRole: String,
    adminRole: String,
    lineRole: String
  },
  
  // قنوات اللوجات
  logChannels: {
    support: String,
    complaint: String,
    rankup: String,
    welcome: String,
    boost: String,
    voice: String
  },
  
  // إعدادات الرسائل
  messages: {
    welcomeMessage: String,
    ticketTitle: String,
    ticketDescription: String,
    supportDescription: String,
    complaintDescription: String
  },
  
  // الإحصائيات
  statistics: {
    totalTickets: { type: Number, default: 0 },
    openedTickets: { type: Number, default: 0 },
    closedTickets: { type: Number, default: 0 }
  },
  
  // إعدادات الحماية
  security: {
    autoCloseTimeout: { type: Number, default: 10 }, // دقائق
    maxTicketsPerUser: { type: Number, default: 1 }
  },
  
  // التواريخ
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// تحديث updatedAt قبل الحفظ
serverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Server', serverSchema);
