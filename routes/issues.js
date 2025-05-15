const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all issues (admin only)
router.get('/issues/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('user', 'name email _id');
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user-specific issues
router.get('/issues/user', authMiddleware, async (req, res) => {
  try {
    const issues = await Issue.find({ user: req.user._id })
      .populate('user', 'name email _id')
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single issue by ID (admin only)
router.get('/issues/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('user', 'name email _id');
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update an issue (admin only, for comments or status updates)
router.put('/issues/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const { status, comments, ...otherUpdates } = req.body;

    // Validate status if provided
    if (status) {
      if (!['pending', 'in_progress', 'resolved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      issue.status = status;
      if (status === 'resolved') {
        issue.resolvedAt = Date.now();
        issue.resolvedBy = req.user.name || 'Admin';
      }
    }

    // Update comments if provided
    if (comments) {
      issue.comments = comments;
    }

    // Apply other updates
    Object.assign(issue, otherUpdates);
    issue.updatedAt = Date.now();

    const updatedIssue = await issue.save();
    await updatedIssue.populate('user', 'name email _id');
    res.json(updatedIssue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;