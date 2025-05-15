const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const VolunteerAssignment = require('../models/VolunteerAssignment');
const Volunteer = require('../models/Volunteer');
const Report = require('../models/Report'); // Reverted to Report
const jwt = require('jsonwebtoken');

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

// Get all volunteer assignments
router.get('/volunteer-assignments', verifyAdmin, async (req, res) => {
  try {
    const assignments = await VolunteerAssignment.find()
      .populate('issueId', 'title status') // issueId refers to Report
      .populate('mainVolunteer', 'name skills specializedFields')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching volunteer assignments:', error);
    res.status(500).json({ error: 'Failed to fetch volunteer assignments' });
  }
});

// Get volunteer assignments by issue ID
router.get('/volunteer-assignments/issue/:issueId', verifyAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;
    const issueExists = await Report.findById(issueId); // Use Report
    if (!issueExists) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const assignments = await VolunteerAssignment.find({ issueId })
      .populate('mainVolunteer', 'name skills specializedFields')
      .sort({ createdAt: -1 })
      .lean();
    const assignmentsWithName = assignments.map((assignment) => ({
      ...assignment,
      mainVolunteerName: assignment.mainVolunteer?.name || 'Unknown',
    }));
    res.json(assignmentsWithName);
  } catch (error) {
    console.error('Error fetching volunteer assignments by issue:', error);
    res.status(500).json({ error: 'Failed to fetch volunteer assignments for issue' });
  }
});

// Create a new volunteer assignment
router.post(
  '/volunteer-assignments',
  verifyAdmin,
  [
    body('issueId').isMongoId().withMessage('Invalid issue ID'),
    body('category')
      .isIn(['Electrical', 'Plumbing', 'Road Repair', 'Construction', 'Carpentry', 'Garbage Clean'])
      .withMessage('Invalid category'),
    body('field')
      .isIn([
        'Wiring Repair', 'Light Fixture Installation', 'Circuit Breaker Issues', 'Generator Maintenance',
        'Pipe Repair', 'Drainage Issues', 'Water Supply', 'Fixture Installation',
        'Pothole Fixing', 'Sidewalk Repair', 'Street Sign Installation', 'Road Marking',
        'Wall Repair', 'Foundation Work', 'Structural Support', 'Building Enhancement',
        'Woodwork Repair', 'Furniture Making', 'Door Installation', 'Cabinet Work',
        'Trash Collection', 'Street Sweeping', 'Recycling Pickup', 'Waste Disposal',
      ])
      .withMessage('Invalid field'),
    body('mainVolunteer').isMongoId().withMessage('Invalid main volunteer ID'),
    body('subVolunteersCount').isInt({ min: 0 }).withMessage('Sub-volunteers count must be a non-negative integer'),
    body('estimatedCompletionDate').isISO8601().toDate().withMessage('Invalid date format'),
    body('workDescription').optional().trim(),
    body('volunteerCompleted').optional().isBoolean().withMessage('Volunteer completed must be a boolean'),
    body('completionNotes').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { issueId, category, field, mainVolunteer, subVolunteersCount, workDescription, estimatedCompletionDate, volunteerCompleted, completionNotes } = req.body;

    try {
      // Verify report exists and is not resolved
      const report = await Report.findById(issueId); // Use Report
      if (!report) {
        return res.status(404).json({ error: 'Report not found.' });
      }
      if (report.status === 'resolved') {
        return res.status(400).json({ error: 'Cannot assign volunteers to a resolved report.' });
      }

      // Verify main volunteer exists and has the required skill and field
      const volunteer = await Volunteer.findById(mainVolunteer);
      if (!volunteer) {
        return res.status(404).json({ error: 'Main volunteer not found.' });
      }
      if (!volunteer.skills.includes(category)) {
        return res.status(400).json({ error: `Main volunteer does not have ${category} skill.` });
      }
      if (volunteer.specializedFields.length > 0 && !volunteer.specializedFields.includes(field)) {
        return res.status(400).json({ error: `Main volunteer does not specialize in ${field}.` });
      }

      // Check if report already has an assignment
      const existingAssignment = await VolunteerAssignment.findOne({ issueId });
      if (existingAssignment) {
        return res.status(400).json({ error: 'Report already has a volunteer assignment.' });
      }

      const assignment = new VolunteerAssignment({
        issueId,
        category,
        field,
        mainVolunteer,
        subVolunteersCount,
        workDescription,
        estimatedCompletionDate,
        volunteerCompleted: volunteerCompleted || false,
        completionNotes: completionNotes || '',
      });

      await assignment.save();
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error creating volunteer assignment:', error);
      res.status(500).json({ error: 'Failed to create volunteer assignment' });
    }
  }
);

// Update volunteer completion status
router.post(
  '/volunteer-assignments/volunteer-complete/:assignmentId',
  verifyAdmin,
  [body('completionNotes').optional().trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignmentId } = req.params;
    const { completionNotes } = req.body;

    try {
      const assignment = await VolunteerAssignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found.' });
      }

      if (assignment.volunteerCompleted) {
        return res.status(400).json({ error: 'Assignment is already marked as completed by volunteer.' });
      }

      assignment.volunteerCompleted = true;
      assignment.completionNotes = completionNotes || assignment.completionNotes;
      assignment.updatedAt = Date.now();

      await assignment.save();
      res.status(200).json(assignment);
    } catch (error) {
      console.error('Error updating volunteer completion status:', error);
      res.status(500).json({ error: 'Failed to update volunteer completion status' });
    }
  }
);

// Mark report as resolved
router.post('/volunteer-assignments/complete/:assignmentId', verifyAdmin, async (req, res) => {
  const { assignmentId } = req.params;

  try {
    const assignment = await VolunteerAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    if (!assignment.volunteerCompleted) {
      return res.status(400).json({ error: 'Volunteer has not marked the task as completed.' });
    }

    const report = await Report.findById(assignment.issueId); // Use Report
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    report.status = 'resolved';
    report.resolvedAt = new Date();
    report.resolvedBy = req.user.name || req.user.email || 'Admin';
    await report.save();

    res.status(200).json({ message: 'Report marked as resolved.', report });
  } catch (error) {
    console.error('Error marking report as resolved:', error);
    res.status(500).json({ error: 'Failed to mark report as resolved' });
  }
});

// Update a volunteer assignment
router.put(
  '/volunteer-assignments/:id',
  verifyAdmin,
  [
    body('category')
      .optional()
      .isIn(['Electrical', 'Plumbing', 'Road Repair', 'Construction', 'Carpentry', 'Garbage Clean'])
      .withMessage('Invalid category'),
    body('field')
      .optional()
      .isIn([
        'Wiring Repair', 'Light Fixture Installation', 'Circuit Breaker Issues', 'Generator Maintenance',
        'Pipe Repair', 'Drainage Issues', 'Water Supply', 'Fixture Installation',
        'Pothole Fixing', 'Sidewalk Repair', 'Street Sign Installation', 'Road Marking',
        'Wall Repair', 'Foundation Work', 'Structural Support', 'Building Enhancement',
        'Woodwork Repair', 'Furniture Making', 'Door Installation', 'Cabinet Work',
        'Trash Collection', 'Street Sweeping', 'Recycling Pickup', 'Waste Disposal',
      ])
      .withMessage('Invalid field'),
    body('mainVolunteer').optional().isMongoId().withMessage('Invalid main volunteer ID'),
    body('subVolunteersCount').optional().isInt({ min: 0 }).withMessage('Sub-volunteers count must be a non-negative integer'),
    body('estimatedCompletionDate').optional().isISO8601().toDate().withMessage('Invalid date format'),
    body('workDescription').optional().trim(),
    body('volunteerCompleted').optional().isBoolean().withMessage('Volunteer completed must be a boolean'),
    body('completionNotes').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const assignment = await VolunteerAssignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: 'Volunteer assignment not found' });
      }

      // Validate mainVolunteer skills if provided
      if (req.body.mainVolunteer) {
        const volunteer = await Volunteer.findById(req.body.mainVolunteer);
        if (!volunteer) {
          return res.status(404).json({ error: 'Main volunteer not found.' });
        }
        const category = req.body.category || assignment.category;
        const field = req.body.field || assignment.field;
        if (!volunteer.skills.includes(category)) {
          return res.status(400).json({ error: `Main volunteer does not have ${category} skill.` });
        }
        if (volunteer.specializedFields.length > 0 && !volunteer.specializedFields.includes(field)) {
          return res.status(400).json({ error: `Main volunteer does not specialize in ${field}.` });
        }
      }

      Object.assign(assignment, req.body, { updatedAt: Date.now() });
      await assignment.save();
      res.json(assignment);
    } catch (error) {
      console.error('Error updating volunteer assignment:', error);
      res.status(500).json({ error: 'Failed to update volunteer assignment' });
    }
  }
);

// Delete a volunteer assignment
router.delete('/volunteer-assignments/:id', verifyAdmin, async (req, res) => {
  try {
    const assignment = await VolunteerAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Volunteer assignment not found' });
    }
    await assignment.deleteOne();
    res.json({ message: 'Volunteer assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting volunteer assignment:', error);
    res.status(500).json({ error: 'Failed to delete volunteer assignment' });
  }
});

module.exports = router;