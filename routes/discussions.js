const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion');
const { authMiddleware } = require('../middleware/auth');

// Get all discussions
router.get('/', async (req, res) => {
  try {
    const { category, search, tab, userId } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    let sort = {};
    if (tab === 'trending') {
      sort = { likes: -1, 'comments.length': -1 };
    } else if (tab === 'recent') {
      sort = { timePosted: -1 };
    } else if (tab === 'bookmarked' && userId) {
      query.isBookmarked = userId;
    }
    
    const discussions = await Discussion.find(query)
      .populate('user', 'name')
      .populate('comments.user', 'name')
      .sort(sort)
      .lean();
    
    res.json(discussions);
  } catch (error) {
    console.error('❌ Error fetching discussions:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new discussion (Protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { category, title, content, tags } = req.body;
    if (!category || !title || !content) {
      return res.status(400).json({ error: 'Category, title, and content are required' });
    }
    
    const discussion = new Discussion({
      user: req.user.id,
      category,
      title,
      content,
      tags
    });
    
    await discussion.save();
    const populatedDiscussion = await Discussion.findById(discussion._id)
      .populate('user', 'name')
      .lean();
    
    res.status(201).json(populatedDiscussion);
  } catch (error) {
    console.error('❌ Error creating discussion:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like a discussion (Protected)
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const discussion = await Discussion.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    ).populate('user', 'name');
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    res.json(discussion);
  } catch (error) {
    console.error('❌ Error liking discussion:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bookmark a discussion (Protected)
router.post('/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    const isBookmarked = discussion.isBookmarked.includes(req.user.id);
    if (isBookmarked) {
      discussion.isBookmarked = discussion.isBookmarked.filter(id => id.toString() !== req.user.id);
    } else {
      discussion.isBookmarked.push(req.user.id);
    }
    
    await discussion.save();
    const populatedDiscussion = await Discussion.findById(req.params.id)
      .populate('user', 'name')
      .lean();
    
    res.json(populatedDiscussion);
  } catch (error) {
    console.error('❌ Error bookmarking discussion:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a comment (Protected)
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    discussion.comments.push({
      user: req.user.id,
      content
    });
    
    await discussion.save();
    const populatedDiscussion = await Discussion.findById(req.params.id)
      .populate('user', 'name')
      .populate('comments.user', 'name')
      .lean();
    
    res.json(populatedDiscussion);
  } catch (error) {
    console.error('❌ Error adding comment:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;