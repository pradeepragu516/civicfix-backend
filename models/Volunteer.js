const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  skills: {
    type: [String],
    required: true,
    enum: ['Electrical', 'Plumbing', 'Road Repair', 'Construction', 'Carpentry', 'Garbage Clean'],
  },
  specializedFields: {
    type: [String],
    default: [],
    enum: [
      'Wiring Repair', 'Light Fixture Installation', 'Circuit Breaker Issues', 'Generator Maintenance',
      'Pipe Repair', 'Drainage Issues', 'Water Supply', 'Fixture Installation',
      'Pothole Fixing', 'Sidewalk Repair', 'Street Sign Installation', 'Road Marking',
      'Wall Repair', 'Foundation Work', 'Structural Support', 'Building Enhancement',
      'Woodwork Repair', 'Furniture Making', 'Door Installation', 'Cabinet Work',
      'Trash Collection', 'Street Sweeping', 'Recycling Pickup', 'Waste Disposal'
    ],
  },
  availability: { type: String, required: true, trim: true },
  contact: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Volunteer', volunteerSchema);