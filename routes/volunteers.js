const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Volunteer = require('../models/Volunteer');

// Middleware to verify admin JWT token
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Get all volunteers
// In GET /volunteers
router.get('/volunteers', verifyAdmin, async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { skills: { $in: [category] } } : {};
    const volunteers = await Volunteer.find(query).select('-__v');
    res.status(200).json(volunteers);
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ error: 'Server error while fetching volunteers.' });
  }
});

// Create a new volunteer
router.post(
  '/volunteers',
  verifyAdmin,
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('skills').isArray({ min: 1 }).withMessage('At least one skill is required'),
    body('specializedFields').optional().isArray().withMessage('Specialized fields must be an array'),
    body('availability').notEmpty().trim().withMessage('Availability is required'),
    body('contact').notEmpty().trim().withMessage('Contact is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, skills, specializedFields, availability, contact } = req.body;

    try {
      const existingVolunteer = await Volunteer.findOne({ contact });
      if (existingVolunteer) {
        return res.status(400).json({ error: 'Volunteer with this contact already exists.' });
      }

      const volunteer = new Volunteer({
        name,
        skills,
        specializedFields,
        availability,
        contact,
      });

      await volunteer.save();
      res.status(201).json(volunteer);
    } catch (error) {
      console.error('Error creating volunteer:', error);
      res.status(500).json({ error: 'Server error while creating volunteer.' });
    }
  }
);

// Update a volunteer
router.put(
  '/volunteers/:id',
  verifyAdmin,
  [
    body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
    body('skills').optional().isArray({ min: 1 }).withMessage('At least one skill is required'),
    body('specializedFields').optional().isArray().withMessage('Specialized fields must be an array'),
    body('availability').optional().notEmpty().trim().withMessage('Availability cannot be empty'),
    body('contact').optional().notEmpty().trim().withMessage('Contact cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, skills, specializedFields, availability, contact } = req.body;

    try {
      const volunteer = await Volunteer.findById(id);
      if (!volunteer) {
        return res.status(404).json({ error: 'Volunteer not found.' });
      }

      if (contact && contact !== volunteer.contact) {
        const existingVolunteer = await Volunteer.findOne({ contact });
        if (existingVolunteer) {
          return res.status(400).json({ error: 'Contact is already in use by another volunteer.' });
        }
      }

      volunteer.name = name || volunteer.name;
      volunteer.skills = skills || volunteer.skills;
      volunteer.specializedFields = specializedFields || volunteer.specializedFields;
      volunteer.availability = availability || volunteer.availability;
      volunteer.contact = contact || volunteer.contact;
      volunteer.updatedAt = Date.now();

      await volunteer.save();
      res.status(200).json(volunteer);
    } catch (error) {
      console.error('Error updating volunteer:', error);
      res.status(500).json({ error: 'Server error while updating volunteer.' });
    }
  }
);

// Get volunteer by ID
router.get('/volunteers/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const volunteer = await Volunteer.findById(id).select('-__v');
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found.' });
    }
    res.status(200).json(volunteer);
  } catch (error) {
    console.error('Error fetching volunteer:', error);
    res.status(500).json({ error: 'Server error while fetching volunteer.' });
  }
});

// Delete a volunteer
router.delete('/volunteers/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found.' });
    }

    await Volunteer.findByIdAndDelete(id);
    res.status(200).json({ message: 'Volunteer deleted successfully.' });
  } catch (error) {
    console.error('Error deleting volunteer:', error);
    res.status(500).json({ error: 'Server error while deleting volunteer.' });
  }
});

module.exports = router;