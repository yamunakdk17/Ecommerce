const db = require('../config/db');

/**
 * Get all products
 */
const getAllProducts = async () => {
  const [rows] = await db.query(`
    SELECT
      id,
      name,
      description,
      price,
      old_price,
      image,
      category,
      stock,
      created_at
    FROM products
    ORDER BY created_at DESC
  `);

  return rows;
};

/**
 * Get product by ID
 */
const getProductById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      name,
      description,
      price,
      old_price,
      image,
      category,
      stock,
      created_at
    FROM products
    WHERE id = ?
    `,
    [id],
  );

  return rows[0] || null;
};

/**
 * Create product
 */
const createProduct = async (product) => {
  const { name, description, price, old_price, image, category, stock } = product;

  const [result] = await db.query(
    `
    INSERT INTO products
    (
      name,
      description,
      price,
      old_price,
      image,
      category,
      stock
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      description || null,
      price,
      old_price || null,
      image || null,
      category || null,
      stock || 0,
    ],
  );

  return result.insertId;
};

/**
 * Update product
 */
const updateProduct = async (id, product) => {
  const { name, description, price, old_price, image, category, stock } = product;

  const [result] = await db.query(
    `
    UPDATE products
    SET
      name = ?,
      description = ?,
      price = ?,
      old_price = ?,
      image = ?,
      category = ?,
      stock = ?
    WHERE id = ?
    `,
    [
      name,
      description || null,
      price,
      old_price || null,
      image || null,
      category || null,
      stock || 0,
      id,
    ],
  );

  return result.affectedRows;
};

/**
 * Delete product
 */
const deleteProduct = async (id) => {
  const [result] = await db.query(
    `
    DELETE FROM products
    WHERE id = ?
    `,
    [id],
  );

  return result.affectedRows;
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
