'use strict';

const Receipt = require('../models/receipt.model');
const Request = require('../models/request.model');
const { RECEIPT_PREFIX } = require('../config/constants');
const { AppError } = require('../middlewares/error.middleware');

const generateReceiptNumber = async () => {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count receipts today to create sequential suffix
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const count = await Receipt.countDocuments({
    generatedAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${RECEIPT_PREFIX}-${datePart}-${seq}`;
};

const generateReceipt = async ({ requestId, managerId }) => {
  // Check if receipt already exists for this request
  const existing = await Receipt.findOne({ requestId });
  if (existing) {
    return existing.populate('generatedBy', 'profile');
  }

  const request = await Request.findById(requestId);
  if (!request) throw new AppError('Request not found.', 404);

  if (request.status !== 'assigned' && request.status !== 'completed') {
    throw new AppError('Receipt can only be generated for assigned or completed requests.', 422);
  }

  if (!request.tankerAssignment) {
    throw new AppError('No tanker assigned to this request.', 422);
  }

  const receiptNumber = await generateReceiptNumber();

  const receipt = await Receipt.create({
    receiptNumber,
    requestId,
    societyName: request.societyName,
    address: request.address,
    contactPerson: request.contactPerson,
    mobileNumber: request.mobileNumber,
    tankerNumber: request.tankerAssignment.tankerNumber,
    driverName: request.tankerAssignment.driverName,
    driverMobile: request.tankerAssignment.driverMobile,
    queuePosition: request.queuePosition,
    generatedBy: managerId,
    generatedAt: new Date(),
  });

  return receipt;
};

const getReceiptByRequestId = async (requestId) => {
  const receipt = await Receipt.findOne({ requestId }).populate('generatedBy', 'profile mobileNumber');
  if (!receipt) throw new AppError('Receipt not found for this request.', 404);
  return receipt;
};

const markPrinted = async (receiptId) => {
  return Receipt.findByIdAndUpdate(
    receiptId,
    { $set: { printedAt: new Date() }, $inc: { printCount: 1 } },
    { new: true },
  );
};

const getAllReceipts = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Receipt.find()
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('generatedBy', 'profile mobileNumber')
      .lean(),
    Receipt.countDocuments(),
  ]);
  return { items, total, page, limit };
};

module.exports = { generateReceipt, getReceiptByRequestId, markPrinted, getAllReceipts };
