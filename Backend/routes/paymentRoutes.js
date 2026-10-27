const express = require('express');

const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post('/esewa/initiate', paymentController.initiateEsewaPayment);
router.post('/esewa/verify', paymentController.verifyEsewaPayment);

module.exports = router;
