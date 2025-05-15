const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin'); // Need to create this model or import if exists

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = null;
    if (decoded.id) {
      user = await User.findById(decoded.id).select('-password');
    } else if (decoded.adminId) {
      user = await Admin.findById(decoded.adminId).select('-password');
    }
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && (req.user.isAdmin === true || (req.user.role && req.user.role.toLowerCase() === 'admin'))) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = { authMiddleware, adminMiddleware };
