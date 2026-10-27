const express = require('express');

const router = express.Router();

const productController = require('../controllers/productController');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

// Get all products
router.get('/', productController.getProducts);

// Product reviews are public to read and require an account to submit.
router.get('/:id/reviews', productController.getProductReviews);
router.post(
  '/:id/reviews',
  requireAuth,
  productController.submitProductReview,
);

// Get single product
router.get('/:id', productController.getProduct);

// Create product
router.post('/', requireAuth, requireAdmin, productController.createProduct);

// Update product
router.put('/:id', requireAuth, requireAdmin, productController.updateProduct);

// Delete product
router.delete('/:id', requireAuth, requireAdmin, productController.deleteProduct);

module.exports = router;
