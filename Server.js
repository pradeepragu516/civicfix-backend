require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const app = express();
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const volunteerRoutes = require('./routes/volunteers');
const volunteerAssignmentRoutes = require('./routes/volunteerAssignments');
const bodyParser = require('body-parser');
const financeRoutes = require('./routes/finances');
const feedbackRoutes = require('./routes/feedback');
const discussionRoutes = require('./routes/discussions');


// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
const corsOptions = {
  origin: ['http://localhost:5173', 'https://civicfix-frontend-cm7k.vercel.app/'], // add both
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));


app.use(cors(corsOptions));
app.use('/api', reportRoutes);
app.use('/api', userRoutes);
app.use('/api', volunteerRoutes);
app.use('/api', volunteerAssignmentRoutes);
app.use('/api/finances', financeRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/discussions', discussionRoutes);


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error("Authentication failed: No token provided");
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication failed: Invalid or expired token", error.message);
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// Import Admin model
const Admin = require('./models/Admin');

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully");
    const adminExists = await Admin.findOne({ email: "admin@gmail.com" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("adminlogin123", 10);
      const newAdmin = new Admin({
        email: "admin@gmail.com",
        password: hashedPassword,
      });
      await newAdmin.save();
      console.log("✅ Default Admin Created: admin@gmail.com / adminlogin123");
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1);
  });

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { adminId: admin._id, name: admin.name || admin.email, email: admin.email, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, admin: { email: admin.email, name: admin.name || admin.email, isAdmin: true } });
  } catch (error) {
    console.error("❌ Admin Login Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Catch-All Route for 404 Errors
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message, { stack: err.stack });
  res.status(500).json({ error: "Something went wrong!", details: err.message });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));