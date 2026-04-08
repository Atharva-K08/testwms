'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { ROLES } = require('../config/constants');
const { generateReceipt, getReceiptByRequest, markPrinted, getAllReceipts } = require('../controllers/receipt.controller');

// All receipt routes are manager-only
router.use(protect, authorize(ROLES.MANAGER));

router.get('/', getAllReceipts);
router.post('/request/:requestId', generateReceipt);
router.get('/request/:requestId', getReceiptByRequest);
router.patch('/:id/printed', markPrinted);

module.exports = router;
