const express = require('express');
const router = express.Router();
const Water = require('../models/Water');
const { protect } = require('../middleware/authMiddleware');

// Get daily water intake (resets if new day)
router.get('/', protect, async (req, res) => {
  try {
    let water = await Water.findOne({ user: req.user._id });
    const today = new Date().toDateString();

    if (!water) {
      water = await Water.create({
        user: req.user._id,
        count: 0,
        lastUpdated: new Date()
      });
    } else if (new Date(water.lastUpdated).toDateString() !== today) {
      water.count = 0;
      water.lastUpdated = new Date();
      await water.save();
    }

    res.json(water);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add water
router.post('/add', protect, async (req, res) => {
  try {
    let water = await Water.findOne({ user: req.user._id });
    const today = new Date().toDateString();

    if (!water) {
      water = await Water.create({
        user: req.user._id,
        count: 1,
        lastUpdated: new Date()
      });
    } else {
      if (new Date(water.lastUpdated).toDateString() !== today) {
        water.count = 1;
      } else {
        water.count = Math.min(20, water.count + 1);
      }
      water.lastUpdated = new Date();
      await water.save();
    }

    res.json(water);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove water
router.post('/remove', protect, async (req, res) => {
  try {
    let water = await Water.findOne({ user: req.user._id });
    const today = new Date().toDateString();

    if (!water) {
      water = await Water.create({
        user: req.user._id,
        count: 0,
        lastUpdated: new Date()
      });
    } else {
      if (new Date(water.lastUpdated).toDateString() !== today) {
        water.count = 0;
      } else {
        water.count = Math.max(0, water.count - 1);
      }
      water.lastUpdated = new Date();
      await water.save();
    }

    res.json(water);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
