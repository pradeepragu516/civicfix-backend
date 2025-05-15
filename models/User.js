
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  joinDate: { type: Date, default: Date.now },
  role: { type: String, default: 'User' },
  phone: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  gender: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  panchayat: { type: String, default: '' },
  wardNumber: { type: String, default: '' },
  occupation: { type: String, default: '' },
  organization: { type: String, default: '' },
  idType: { type: String, default: '' },
  idNumber: { type: String, default: '' },
  profileImage: { type: String, default: '' },
});

module.exports = mongoose.model('User', UserSchema);
