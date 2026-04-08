'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/constants');
const {
  submitRequest,
  getMyRequests,
  getRequestById,
  getAllRequests,
  cancelRequest,
} = require('../controllers/request.controller');
const {
  submitRequestValidator,
  cancelRequestValidator,
  paginationValidator,
} = require('../validators/request.validator');

// Member routes
router.post('/', protect, authorize(ROLES.MEMBER), submitRequestValidator, validate, submitRequest);
router.get('/my', protect, authorize(ROLES.MEMBER), paginationValidator, validate, getMyRequests);

// Manager routes
router.get('/', protect, authorize(ROLES.MANAGER), paginationValidator, validate, getAllRequests);

// Shared routes
router.get('/:id', protect, getRequestById);
router.patch('/:id/cancel', protect, cancelRequestValidator, validate, cancelRequest);

module.exports = router;
