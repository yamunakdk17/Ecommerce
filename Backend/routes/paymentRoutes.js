const express = require('express');

const paymentController = require('../controllers/paymentController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post(
  '/esewa/initiate',
  requireAuth,
  paymentController.initiateEsewaPayment,
);
router.post('/esewa/verify', paymentController.verifyEsewaPayment);

module.exports = router;
