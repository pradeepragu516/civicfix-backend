const express = require('express');
const router = express.Router();
const AdminProfile = require('../models/AdminProfile');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const authenticate = authMiddleware;
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Get admin profile by user ID
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const profile = await AdminProfile.findOne({ _id: req.params.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update admin profile
router.put('/:userId', authenticate, async (req, res) => {
  const { name, email, phone, location, department } = req.body;

  try {
    const profile = await AdminProfile.findOne({ _id: req.params.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update fields
    profile.name = name || profile.name;
    profile.email = email || profile.email;
    profile.phone = phone || profile.phone;
    profile.location = location || profile.location;
    profile.department = department || profile.department;

    await profile.save();
    res.json(profile);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile image URL
router.post('/:userId/upload-image', authenticate, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL provided' });
    }

    const profile = await AdminProfile.findOne({ _id: req.params.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update profile with provided image URL
    profile.imageUrl = imageUrl;
    await profile.save();

    res.json({ imageUrl: profile.imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error updating image URL' });
  }
});

module.exports = router;
