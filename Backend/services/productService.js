const productModel = require('../models/productModel');

/**
 * Get all products
 */
const getAllProducts = async () => {
  return await productModel.getAllProducts();
};

/**
 * Get one product
 */
const getProductById = async (id) => {
  if (!id || isNaN(Number(id))) {
    const error = new Error('Invalid product ID');
    error.statusCode = 400;
    throw error;
  }

  const product = await productModel.getProductById(Number(id));

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return product;
};

/**
 * Validate product data
 */
const validateProduct = (data) => {
  const { name, price, stock } = data;
  const oldPrice = data.old_price ?? data.oldPrice;

  if (typeof name !== 'string' || !name.trim()) {
    const error = new Error('Product name is required');
    error.statusCode = 400;
    throw error;
  }

  if (price === undefined || price === null || price === '') {
    const error = new Error('Product price is required');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    const error = new Error('Product price cannot be negative');
    error.statusCode = 400;
    throw error;
  }

  if (
    oldPrice !== undefined &&
    oldPrice !== null &&
    oldPrice !== '' &&
    (!Number.isFinite(Number(oldPrice)) || Number(oldPrice) < 0)
  ) {
    const error = new Error('Old price cannot be negative');
    error.statusCode = 400;
    throw error;
  }

  if (
    oldPrice !== undefined &&
    oldPrice !== null &&
    oldPrice !== '' &&
    Number(oldPrice) <= Number(price)
  ) {
    const error = new Error('Original price must be greater than the sale price');
    error.statusCode = 400;
    throw error;
  }

  if (  stock !== undefined &&
  stock !== null &&
  stock !== '' &&
  (!Number.isSafeInteger(Number(stock)) || Number(stock) < 0)) {
    const error = new Error('Stock cannot be negative');
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Create product
 */
const createProduct = async (data) => {
  validateProduct(data);

  const product = {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    price: Number(data.price),
    old_price:
      (data.old_price ?? data.oldPrice) === undefined ||
      (data.old_price ?? data.oldPrice) === null ||
      (data.old_price ?? data.oldPrice) === ''
        ? null
        : Number(data.old_price ?? data.oldPrice),
    image: data.image?.trim() || null,
    category: data.category?.trim() || null,
    stock:
      data.stock === undefined || data.stock === null || data.stock === ''
        ? 0
        : Number(data.stock),
  };

  const productId = await productModel.createProduct(product);

  return await productModel.getProductById(productId);
};

/**
 * Update product
 */
const updateProduct = async (id, data) => {
  if (!id || isNaN(Number(id))) {
    const error = new Error('Invalid product ID');
    error.statusCode = 400;
    throw error;
  }

  const productId = Number(id);

  // Make sure product exists
  await getProductById(productId);

  validateProduct(data);

  const product = {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    price: Number(data.price),
    old_price:
      (data.old_price ?? data.oldPrice) === undefined ||
      (data.old_price ?? data.oldPrice) === null ||
      (data.old_price ?? data.oldPrice) === ''
        ? null
        : Number(data.old_price ?? data.oldPrice),
    image: data.image?.trim() || null,
    category: data.category?.trim() || null,
    stock:
      data.stock === undefined || data.stock === null || data.stock === ''
        ? 0
        : Number(data.stock),
  };

  await productModel.updateProduct(productId, product);

  return await productModel.getProductById(productId);
};

/**
 * Delete product
 */
const deleteProduct = async (id) => {
  if (!id || isNaN(Number(id))) {
    const error = new Error('Invalid product ID');
    error.statusCode = 400;
    throw error;
  }

  const productId = Number(id);

  // Make sure product exists
  await getProductById(productId);

  await productModel.deleteProduct(productId);

  return {
    id: productId,
    message: 'Product deleted successfully',
  };
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
