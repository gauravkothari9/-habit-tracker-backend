const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecuresecretkeyshouldbechangedinprod', {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/register
// @desc    Register new user
router.post('/register', async (req, res) => {
  const { name, email, password, phone, photoUri } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      photoUri: photoUri || ''
    });

    res.status(201).json({
      uid: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photoUri: user.photoUri,
      isDarkMode: user.isDarkMode,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        uid: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photoUri: user.photoUri,
        isDarkMode: user.isDarkMode,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
router.get('/profile', protect, async (req, res) => {
  res.json({
    uid: req.user._id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone,
    photoUri: req.user.photoUri,
    isDarkMode: req.user.isDarkMode
  });
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.photoUri = req.body.photoUri !== undefined ? req.body.photoUri : user.photoUri;
      if (req.body.isDarkMode !== undefined) {
        user.isDarkMode = req.body.isDarkMode;
      }
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }
      
      const updatedUser = await user.save();
      res.json({
        uid: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        photoUri: updatedUser.photoUri,
        isDarkMode: updatedUser.isDarkMode,
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(444).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const webpush = require('web-push');

// Setup VAPID keys
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  const generatedKeys = webpush.generateVAPIDKeys();
  vapidPublicKey = generatedKeys.publicKey;
  vapidPrivateKey = generatedKeys.privateKey;
  console.log('--- Dynamic VAPID Keys Generated for Push Notifications ---');
  console.log('Public Key:', vapidPublicKey);
  console.log('-----------------------------------------------------------');
}

webpush.setVapidDetails(
  'mailto:example@yourdomain.com',
  vapidPublicKey,
  vapidPrivateKey
);

// @route   GET /api/auth/vapid-public-key
// @desc    Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

// @route   POST /api/auth/subscribe
// @desc    Subscribe to push notifications
router.post('/subscribe', protect, async (req, res) => {
  const subscription = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Filter out duplicates
    const stringified = JSON.stringify(subscription);
    const exists = user.pushSubscriptions.some(sub => JSON.stringify(sub) === stringified);

    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/trigger-test-push
// @desc    Trigger a test push notification to user
router.post('/trigger-test-push', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return res.status(400).json({ message: 'No subscriptions active' });
    }

    const payload = JSON.stringify({
      title: 'Habit Tracker Alert! 🔥',
      body: 'Consistency check: Have you updated your routine today?'
    });

    const sendPromises = user.pushSubscriptions.map(sub => 
      webpush.sendNotification(sub, payload).catch(err => {
        console.error('Push failed for subscription', err);
        return null;
      })
    );

    await Promise.all(sendPromises);
    res.json({ message: 'Push sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
