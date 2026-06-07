const express = require('express');
const router = express.Router();
const Routine = require('../models/Routine');
const { protect } = require('../middleware/authMiddleware');

// Get all routines
router.get('/', protect, async (req, res) => {
  try {
    const routines = await Routine.find({ user: req.user._id });
    res.json(routines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create routine
router.post('/', protect, async (req, res) => {
  const { name, description, frequency, specificDays } = req.body;
  try {
    const routine = await Routine.create({
      user: req.user._id,
      name,
      description,
      frequency: frequency || 'daily',
      specificDays: specificDays || []
    });
    res.status(201).json(routine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update routine
router.put('/:id', protect, async (req, res) => {
  try {
    const routine = await Routine.findOne({ _id: req.params.id, user: req.user._id });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });

    routine.name = req.body.name !== undefined ? req.body.name : routine.name;
    routine.description = req.body.description !== undefined ? req.body.description : routine.description;
    routine.frequency = req.body.frequency !== undefined ? req.body.frequency : routine.frequency;
    routine.specificDays = req.body.specificDays !== undefined ? req.body.specificDays : routine.specificDays;

    const updated = await routine.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete routine
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await Routine.deleteOne({ _id: req.params.id, user: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Routine not found' });
    res.json({ message: 'Routine deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle routine completion for today
router.post('/:id/toggle', protect, async (req, res) => {
  try {
    const routine = await Routine.findOne({ _id: req.params.id, user: req.user._id });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });

    const getLocalDateString = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayISO = getLocalDateString(new Date());
    const newCompleted = !routine.completed;
    
    // Recalculate streak
    let completedDates = routine.completedDates || [];
    if (newCompleted) {
      if (!completedDates.includes(todayISO)) {
        completedDates.push(todayISO);
      }
    } else {
      completedDates = completedDates.filter(d => d !== todayISO);
    }

    // Simple streak calculation (consecutive days checked backward from today)
    const calculateStreak = (dates) => {
      let streak = 0;
      let current = new Date();
      
      const toLocalDateKey = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      while (dates.includes(toLocalDateKey(current))) {
        streak++;
        current.setDate(current.getDate() - 1);
      }
      return streak;
    };

    routine.completed = newCompleted;
    routine.completedDates = completedDates;
    routine.streak = calculateStreak(completedDates);

    const updated = await routine.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
