
   const express = require('express');
   const router = express.Router();
   const bcrypt = require('bcryptjs');
   const jwt = require('jsonwebtoken');
   const cloudinary = require('cloudinary').v2;
   const User = require('../models/User');
   const { authMiddleware } = require('../middleware/auth');

   // User Register
   router.post('/register', async (req, res) => {
     try {
       const { name, email, password, joinDate } = req.body;
       if (!name || !email || !password) {
         return res.status(400).json({ error: 'Name, email, and password are required' });
       }

       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
         return res.status(400).json({ error: 'Invalid email format' });
       }

       const existingUser = await User.findOne({ email });
       if (existingUser) {
         return res.status(400).json({ error: 'Email already exists' });
       }

       const hashedPassword = await bcrypt.hash(password, 10);
       const newUser = new User({
         name,
         email,
         password: hashedPassword,
         joinDate: joinDate || new Date(),
       });

       await newUser.save();
       res.status(201).json({ userId: newUser._id, message: 'User registered successfully' });
     } catch (error) {
       console.error('❌ Registration Error:', error.message);
       res.status(500).json({ error: 'Internal server error', details: error.message });
     }
   });

   // User Login
   router.post('/login', async (req, res) => {
     try {
       const { email, password } = req.body;
       if (!email || !password) {
         return res.status(400).json({ error: 'Email and password are required' });
       }

       const user = await User.findOne({ email });
       if (!user) {
         return res.status(401).json({ error: 'Invalid email or password' });
       }

       const isMatch = await bcrypt.compare(password, user.password);
       if (!isMatch) {
         return res.status(401).json({ error: 'Invalid email or password' });
       }

       const token = jwt.sign(
         { id: user._id, name: user.name }, // Changed userId to id for consistency with authMiddleware
         process.env.JWT_SECRET,
         { expiresIn: '1h' }
       );

       res.json({ token, user: { name: user.name, email: user.email, userId: user._id } });
     } catch (error) {
       console.error('❌ User Login Error:', error.message);
       res.status(500).json({ error: 'Internal server error' });
     }
   });

   // Upload Profile Image (Protected)
   router.post('/user/:id/upload-image', authMiddleware, async (req, res) => {
     // Add CORS headers manually for this route
     res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
     res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');

     if (req.method === 'OPTIONS') {
       return res.sendStatus(200);
     }

     try {
       const userId = req.params.id;
       if (!req.user || !req.user.id) {
         console.error('Unauthorized access: req.user or req.user.id is undefined');
         return res.status(401).json({ error: 'Unauthorized access: Invalid token payload' });
       }
       if (req.user.id.toString() !== userId.toString()) {
         console.error(`Unauthorized access: Token userId (${req.user.id}) does not match requested userId (${userId})`);
         return res.status(403).json({ error: 'Unauthorized access' });
       }

       const { image } = req.body;
       if (!image) {
         return res.status(400).json({ error: 'Image data is required' });
       }

       // Upload to Cloudinary
       const uploadResult = await cloudinary.uploader.upload(image, {
         folder: `profile_images/${userId}`,
         resource_type: 'image',
       });

       // Update user with Cloudinary URL
       const user = await User.findById(userId);
       if (!user) {
         return res.status(404).json({ error: 'User not found' });
       }

       user.profileImage = uploadResult.secure_url;
       await user.save();

       res.json({ message: 'Image uploaded successfully', imageUrl: uploadResult.secure_url });
     } catch (error) {
       console.error('❌ Error uploading image:', error.message, { stack: error.stack });
       res.status(500).json({ error: 'Internal server error', details: error.message });
     }
   });

   // Get User Profile (Protected)
   router.get('/user/:id', authMiddleware, async (req, res) => {
     try {
       const userId = req.params.id;
       if (!req.user || !req.user.id) {
         console.error('Unauthorized access: req.user or req.user.id is undefined');
         return res.status(401).json({ error: 'Unauthorized access: Invalid token payload' });
       }
       if (req.user.id.toString() !== userId.toString()) {
         console.error(`Unauthorized access: Token userId (${req.user.id}) does not match requested userId (${userId})`);
         return res.status(403).json({ error: 'Unauthorized access' });
       }

       const user = await User.findById(userId).select('-password');
       if (!user) {
         console.error(`User not found: ${userId}`);
         return res.status(404).json({ error: 'User not found' });
       }

       res.json(user);
     } catch (error) {
       console.error('❌ Error fetching user:', error.message, { stack: error.stack });
       res.status(500).json({ error: 'Internal server error', details: error.message });
     }
   });

   // Update User Profile (Protected)
   router.put('/user/:id', authMiddleware, async (req, res) => {
     try {
       const userId = req.params.id;
       if (req.user._id.toString() !== userId) {
         console.error(`Unauthorized access: Token userId (${req.user._id}) does not match requested userId (${userId})`);
         return res.status(403).json({ error: 'Unauthorized access' });
       }

       const user = await User.findById(userId);
       if (!user) {
         console.error(`User not found: ${userId}`);
         return res.status(404).json({ error: 'User not found' });
       }

       const { name, email } = req.body;
       if (!name || !email) {
         console.error('Validation failed: Name and email are required');
         return res.status(400).json({ error: 'Name and email are required' });
       }

       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
         console.error('Validation failed: Invalid email format', { email });
         return res.status(400).json({ error: 'Invalid email format' });
       }

       if (email !== user.email) {
         const existingUser = await User.findOne({ email });
         if (existingUser && existingUser._id.toString() !== userId) {
           console.error('Validation failed: Email already exists', { email });
           return res.status(400).json({ error: 'Email already exists' });
         }
       }

       const allowedFields = [
         'name',
         'email',
         'phone',
         'dateOfBirth',
         'gender',
         'address',
         'city',
         'district',
         'state',
         'pincode',
         'panchayat',
         'wardNumber',
         'occupation',
         'organization',
         'idType',
         'idNumber',
         'profileImage',
       ];

       allowedFields.forEach((field) => {
         if (req.body[field] !== undefined) {
           user[field] = req.body[field];
         }
       });

       await user.save();
       console.log(`Profile updated successfully for user: ${userId}`);
       res.json({ message: 'Profile updated successfully' });
     } catch (error) {
       console.error('❌ Error updating user:', error.message, { stack: error.stack });
       res.status(500).json({ error: 'Internal server error', details: error.message });
     }
   });

   module.exports = router;
