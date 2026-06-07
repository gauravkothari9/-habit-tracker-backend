const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const { protect } = require('../middleware/authMiddleware');

// Get all challenges
router.get('/', protect, async (req, res) => {
  try {
    const challenges = await Challenge.find({ user: req.user._id });
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create challenge
router.post('/', protect, async (req, res) => {
  const { name, description, duration } = req.body;
  try {
    const challenge = await Challenge.create({
      user: req.user._id,
      name,
      description,
      duration: duration || 30
    });
    res.status(201).json(challenge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update challenge details
router.put('/:id', protect, async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, user: req.user._id });
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    challenge.name = req.body.name !== undefined ? req.body.name : challenge.name;
    challenge.description = req.body.description !== undefined ? req.body.description : challenge.description;
    challenge.duration = req.body.duration !== undefined ? req.body.duration : challenge.duration;

    const updated = await challenge.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete challenge
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await Challenge.deleteOne({ _id: req.params.id, user: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Challenge not found' });
    res.json({ message: 'Challenge deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle challenge completion for today
router.post('/:id/toggle', protect, async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, user: req.user._id });
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const toLocalDateKey = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const calculateStreak = (marked) => {
      let streak = 0;
      let current = new Date();
      while (marked.has(toLocalDateKey(current))) {
        streak++;
        current.setDate(current.getDate() - 1);
      }
      return streak;
    };

    const todayKey = toLocalDateKey(new Date());
    const newMarked = challenge.markedDates || new Map();

    if (newMarked.has(todayKey)) {
      newMarked.delete(todayKey);
    } else {
      newMarked.set(todayKey, { selected: true });
    }

    challenge.markedDates = newMarked;
    challenge.completedDays = newMarked.size;
    challenge.streak = calculateStreak(newMarked);

    const updated = await challenge.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
