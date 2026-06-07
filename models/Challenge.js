const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  duration: { type: Number, required: true, default: 30 }, // duration in days
  completedDays: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  markedDates: {
    type: Map,
    of: new mongoose.Schema({
      selected: { type: Boolean, default: true }
    }, { _id: false }),
    default: {}
  } // Map of YYYY-MM-DD -> { selected: true }
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
