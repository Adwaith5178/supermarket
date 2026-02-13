// models/Settings.js
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Only one document will exist in this collection
  activeFestival: {
    type: String,
    enum: ['NONE', 'ONAM', 'CHRISTMAS'],
    default: 'NONE'
  },
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model('Settings', settingsSchema);