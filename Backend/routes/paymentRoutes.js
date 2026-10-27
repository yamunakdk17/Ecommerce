const express = require('express');

const paymentController = require('../controllers/paymentController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post(
  '/esewa/initiate',
  requireAuth,
  paymentController.initiateEsewaPayment,
);
router.post('/khalti/initiate', paymentController.initiateKhaltiPayment);


router.post('/esewa/verify', paymentController.verifyEsewaPayment);
router.post('/khalti/verify', paymentController.verifyKhaltiPayment);

module.exports = router;
