const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    uploaderEmail: {
      type: String,
      required: true,
    },
    uploaderName: {
      type: String,
      required: true,
    },
    uploadedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    semester: {
      type: String,
      enum: ['odd', 'even'],
      required: true,
    },
    paperType: {
      type: String,
      enum: ['midterm', 'endterm', 'quiz', 'assignment', 'other'],
      default: 'other',
    },
    approvedBy: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paperSchema.index({ subject: 1, status: 1 });
paperSchema.index({ uploadedDate: -1 });
paperSchema.index({ year: 1, semester: 1 });

module.exports = mongoose.models.Paper || mongoose.model('Paper', paperSchema);
