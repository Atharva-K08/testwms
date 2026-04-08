'use strict';

const receiptService = require('../services/receipt.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const { PAGINATION } = require('../config/constants');

const generateReceipt = async (req, res) => {
  const receipt = await receiptService.generateReceipt({
    requestId: req.params.requestId,
    managerId: req.user._id,
  });

  sendCreated(res, {
    message: 'Receipt generated successfully.',
    data: { receipt },
  });
};

const getReceiptByRequest = async (req, res) => {
  const receipt = await receiptService.getReceiptByRequestId(req.params.requestId);
  sendSuccess(res, { message: 'Receipt fetched.', data: { receipt } });
};

const markPrinted = async (req, res) => {
  const receipt = await receiptService.markPrinted(req.params.id);
  sendSuccess(res, { message: 'Receipt marked as printed.', data: { receipt } });
};

const getAllReceipts = async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const result = await receiptService.getAllReceipts({ page, limit });

  sendPaginated(res, {
    message: 'Receipts fetched.',
    data: result.items,
    page,
    limit,
    total: result.total,
  });
};

module.exports = { generateReceipt, getReceiptByRequest, markPrinted, getAllReceipts };
