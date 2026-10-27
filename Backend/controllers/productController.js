const productService = require('../services/productService');

/**
 * GET /api/products
 * Get all products
 */
const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 * Get one product
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const getProductReviews = async (req, res, next) => {
  try {
    const reviews = await productService.getProductReviews(req.params.id);
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};

const submitProductReview = async (req, res, next) => {
  try {
    const reviews = await productService.submitProductReview(
      req.params.id,
      req.user.id,
      req.body || {},
    );
    res.status(201).json({
      success: true,
      message: 'Your review has been saved',
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products
 * Create product
 */
const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/products/:id
 * Update product
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/products/:id
 * Delete product
 */
const deleteProduct = async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  getProductReviews,
  submitProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
};
