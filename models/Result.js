const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  student: { type: String, required: true },
  courseCode: { type: String, required: true },
  grade: { type: String, required: true },
  unit: { type: Number, required: false },
  createdAt: { type: Date, default: () => new Date() },
});

module.exports = mongoose.model('Result', ResultSchema);
