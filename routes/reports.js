const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Report = require('../models/Report');

// Helper function to convert buffer to base64
const bufferToBase64 = (buffer) => {
  return Buffer.from(buffer).toString('base64');
};

// Create a new report
router.post('/reports', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      wardNumber,
      category,
      urgency,
      location,
      contactName,
      contactPhone,
      contactEmail,
      images // Expecting base64 encoded images
    } = req.body;

    // Parse location
let parsedLocation;
    try {
      parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid location format' });
    }

    // Validate required fields
    if (!title || !description || !wardNumber || !category || !parsedLocation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upload images to Cloudinary
    let uploadedImages = [];
    if (images && Array.isArray(images) && images.length > 0) {
      if (images.length > 3) {
        return res.status(400).json({ error: 'Maximum 3 images allowed' });
      }

      const imagePromises = images.map(async (base64Image) => {
        // Validate base64 format
        const matches = base64Image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid image format');
        }

        const [, format, data] = matches;
        if (!['jpeg', 'jpg', 'png', 'webp'].includes(format.toLowerCase())) {
          throw new Error('Unsupported image format');
        }

        const result = await cloudinary.uploader.upload(base64Image, {
          folder: 'reports',
          resource_type: 'image'
        });

        return {
          url: result.secure_url,
          public_id: result.public_id
        };
      });

      uploadedImages = await Promise.all(imagePromises);
    }

    // Create new report
    const report = new Report({
      title,
      description,
      wardNumber,
      category,
      urgency,
      location: {
        type: 'Point',
        coordinates: parsedLocation.coordinates,
        address: parsedLocation.address
      },
      images: uploadedImages,
      contactName,
      contactPhone,
      contactEmail,
      user: req.user._id
    });

    await report.save();

    res.status(201).json({
      message: 'Report created successfully',
      report
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: error.message || 'Failed to create report' });
  }
});

// Get all reports for a user
router.get('/reports', authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email _id')
      .lean();

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Admin route to get all reports
router.get('/admin/reports', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email _id')
      .lean();

    res.json(reports);
  } catch (error) {
    console.error('Error fetching all reports for admin:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Admin route to get all reports
router.get('/admin/reports', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email _id')
      .lean();

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching all reports for admin:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch reports' });
  }
});

// Admin route to get a single report by ID
router.get('/admin/reports/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('user', 'name email _id')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching report by ID:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch report' });
  }
});

// Admin route to update a report (for comments or status)
router.put('/admin/reports/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { status, comments, resolution, ...otherUpdates } = req.body;

    // Validate status if provided
    if (status) {
      if (!['pending', 'in_progress', 'resolved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      report.status = status;
      if (status === 'resolved') {
        report.resolvedAt = new Date();
        report.resolvedBy = req.user.name || req.user.email || 'Admin';
        if (resolution) {
          report.resolution = resolution;
        }
      }
    }

    // Update comments if provided
    if (comments) {
      report.comments = comments;
    }

    // Apply other updates
    Object.assign(report, otherUpdates);
    report.updatedAt = new Date();

    const updatedReport = await report.save();
    const populatedReport = await Report.findById(updatedReport._id)
      .populate('user', 'name email _id')
      .lean();

    res.status(200).json(populatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: error.message || 'Failed to update report' });
  }
});

module.exports = router;