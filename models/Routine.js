const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  completedDates: { type: [String], default: [] }, // Array of YYYY-MM-DD
  frequency: { type: String, enum: ['daily', 'specific'], default: 'daily' },
  specificDays: { type: [String], default: [] } // ['Mon', 'Tue', ...]
}, { timestamps: true });

module.exports = mongoose.model('Routine', routineSchema);
