'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/constants');
const { getQueue, peekNext, assignTanker, completeRequest } = require('../controllers/queue.controller');
const { assignTankerValidator, completeRequestValidator, paginationValidator } = require('../validators/request.validator');

// All queue routes are manager-only
router.use(protect, authorize(ROLES.MANAGER));

router.get('/', paginationValidator, validate, getQueue);
router.get('/next', peekNext);
router.patch('/:id/assign', assignTankerValidator, validate, assignTanker);
router.patch('/:id/complete', completeRequestValidator, validate, completeRequest);

module.exports = router;
