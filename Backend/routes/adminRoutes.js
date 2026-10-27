const express = require('express');
const adminController = require('../controllers/adminController');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/summary', adminController.summary);
router.get('/products', adminController.products);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.get('/orders', adminController.orders);
router.patch('/orders/:id', adminController.updateOrder);
router.get('/customers', adminController.customers);
router.patch('/customers/:id', adminController.updateCustomer);
router.get('/settings', adminController.settings);
router.put('/settings', adminController.updateSettings);
router.get('/promotions', adminController.promotions);
router.post('/promotions', adminController.savePromotion);
router.put('/promotions/:id', adminController.savePromotion);
router.delete('/promotions/:id', adminController.deletePromotion);

module.exports = router;
