const mongoose = require('mongoose');

const volunteerAssignmentSchema = new mongoose.Schema({
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
  category: {
    type: String,
    required: true,
    enum: ['Electrical', 'Plumbing', 'Road Repair', 'Construction', 'Carpentry', 'Garbage Clean'],
  },
  field: {
    type: String,
    required: true,
    enum: [
      'Wiring Repair', 'Light Fixture Installation', 'Circuit Breaker Issues', 'Generator Maintenance',
      'Pipe Repair', 'Drainage Issues', 'Water Supply', 'Fixture Installation',
      'Pothole Fixing', 'Sidewalk Repair', 'Street Sign Installation', 'Road Marking',
      'Wall Repair', 'Foundation Work', 'Structural Support', 'Building Enhancement',
      'Woodwork Repair', 'Furniture Making', 'Door Installation', 'Cabinet Work',
      'Trash Collection', 'Street Sweeping', 'Recycling Pickup', 'Waste Disposal',
    ],
  },
  mainVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
  subVolunteersCount: { type: Number, required: true, min: 0 },
  workDescription: { type: String, trim: true },
  estimatedCompletionDate: { type: Date, required: true },
  volunteerCompleted: { type: Boolean, default: false },
  completionNotes: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt on save
volunteerAssignmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VolunteerAssignment', volunteerAssignmentSchema);