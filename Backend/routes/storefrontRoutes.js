const express = require('express');
const storefrontController = require('../controllers/storefrontController');

const router = express.Router();

router.get('/', storefrontController.getSettings);
router.post('/promotions/validate', storefrontController.validatePromotion);

module.exports = router;
