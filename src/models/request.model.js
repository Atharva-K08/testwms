'use strict';

const mongoose = require('mongoose');
const { REQUEST_STATUS } = require('../config/constants');

const tankerAssignmentSchema = new mongoose.Schema(
  {
    tankerNumber: { type: String, required: true, trim: true },
    driverName: { type: String, required: true, trim: true },
    driverMobile: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Snapshot of member details at time of request
    societyName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' },

    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.PENDING,
    },

    // FIFO queue position — auto-assigned, sequential
    queuePosition: { type: Number, required: true },

    // Set once when manager assigns tanker — immutable after that
    tankerAssignment: { type: tankerAssignmentSchema, default: null },

    assignedAt: { type: Date, default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound indexes for queue queries
requestSchema.index({ status: 1, queuePosition: 1 });
requestSchema.index({ userId: 1, status: 1 });
requestSchema.index({ queuePosition: 1 });

module.exports = mongoose.model('Request', requestSchema);
