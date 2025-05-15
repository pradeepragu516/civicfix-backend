const express = require('express');
const router = express.Router();
const Finance = require('../models/Finance');

// Middleware to validate request body
const validateFinanceData = (req, res, next) => {
  const { entityType, entityId, entityName, year, allocation, categories } = req.body;
  
  if (!['district', 'town', 'panchayat'].includes(entityType)) {
    return res.status(400).json({ error: 'Invalid entityType' });
  }
  if (!entityId || !entityName || !year || !allocation || !categories) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (entityType !== 'district' && !req.body.districtId) {
    return res.status(400).json({ error: 'districtId required for town or panchayat' });
  }
  if (entityType === 'panchayat' && !req.body.townId) {
    return res.status(400).json({ error: 'townId required for panchayat' });
  }
  if (allocation < 0 || Object.values(categories).some(val => val < 0)) {
    return res.status(400).json({ error: 'Financial values cannot be negative' });
  }
  
  next();
};

// Get financial data for an entity
router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { startYear, endYear } = req.query;
    
    if (!['district', 'town', 'panchayat'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    const query = {
      entityType,
      entityId: parseInt(entityId),
    };
    
    if (startYear && endYear) {
      query.year = { $gte: parseInt(startYear), $lte: parseInt(endYear) };
    }
    
    const finances = await Finance.find(query).sort({ year: 1 });
    res.json(finances);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update financial data
router.post('/', validateFinanceData, async (req, res) => {
  try {
    const {
      entityType, entityId, entityName, districtId, townId, year, allocation, categories
    } = req.body;
    
    const totalSpent = Object.values(categories).reduce((sum, val) => sum + val, 0);
    const balance = allocation - totalSpent;
    
    if (totalSpent > allocation) {
      return res.status(400).json({ error: 'Total spent cannot exceed allocation' });
    }
    
    const financeData = {
      entityType,
      entityId,
      entityName,
      districtId,
      townId,
      year,
      allocation,
      spent: totalSpent,
      balance,
      categories,
    };
    
    const finance = await Finance.findOneAndUpdate(
      { entityType, entityId, year },
      { $set: financeData },
      { upsert: true, new: true }
    );
    
    res.status(201).json(finance);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Financial data for this entity and year already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Delete financial data
router.delete('/:entityType/:entityId/:year', async (req, res) => {
  try {
    const { entityType, entityId, year } = req.params;
    
    const finance = await Finance.findOneAndDelete({
      entityType,
      entityId: parseInt(entityId),
      year: parseInt(year),
    });
    
    if (!finance) {
      return res.status(404).json({ error: 'Financial data not found' });
    }
    
    res.json({ message: 'Financial data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;