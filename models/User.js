const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  photoUri: { type: String, default: '' },
  isDarkMode: { type: Boolean, default: false },
  pushSubscriptions: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
