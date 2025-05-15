const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  wardNumber: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Road Damage',
      'Garbage Collection',
      'Street Lighting',
      'Water Supply',
      'Drainage Issues',
      'Public Property Damage',
      'Illegal Construction',
      'Stray Animals',
      'Other',
    ],
  },
  urgency: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  location: {
    address: {
      type: String,
      required: true,
    },
  },
  images: [
    {
      url: String,
      public_id: String,
    },
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'rejected'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: String,
  },
  resolution: {
    type: String,
  },
  comments: [
    {
      text: String,
      author: String,
      timestamp: Date,
    },
  ],
});

module.exports = mongoose.model('Issue', issueSchema);