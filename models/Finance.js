const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  infrastructure: { type: Number, default: 0 },
  education: { type: Number, default: 0 },
  healthcare: { type: Number, default: 0 },
  welfare: { type: Number, default: 0 },
  administration: { type: Number, default: 0 },
  others: { type: Number, default: 0 },
});

const financeSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['district', 'town', 'panchayat'],
    required: true,
  },
  entityId: {
    type: Number,
    required: true,
  },
  entityName: {
    type: String,
    required: true,
  },
  districtId: {
    type: Number,
    required: function() { return this.entityType !== 'district'; },
  },
  townId: {
    type: Number,
    required: function() { return this.entityType === 'panchayat'; },
  },
  year: {
    type: Number,
    required: true,
  },
  allocation: {
    type: Number,
    required: true,
    min: 0,
  },
  spent: {
    type: Number,
    required: true,
    min: 0,
  },
  balance: {
    type: Number,
    required: true,
    min: 0,
  },
  categories: {
    type: categorySchema,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` on save
financeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure unique financial record per entity and year
financeSchema.index({ entityType: 1, entityId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Finance', financeSchema);