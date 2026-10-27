const db = require('../config/db');

let reviewsTableReady;

const normalizeCategory = (category) =>
  typeof category === 'string'
    ? category
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    : null;

const ensureReviewsTable = () => {
  if (!reviewsTableReady) {
    reviewsTableReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS product_reviews (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          user_id INT NULL,
          rating TINYINT UNSIGNED NOT NULL,
          review TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_product_reviews_product_user (product_id, user_id),
          CONSTRAINT fk_product_reviews_product
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          CONSTRAINT fk_product_reviews_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      const [indexes] = await db.query(
        `SELECT INDEX_NAME FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_reviews'
           AND INDEX_NAME = 'uq_product_reviews_product_user'`,
      );
      if (!indexes.length) {
        const [duplicates] = await db.query(
          `SELECT product_id, user_id, COUNT(*) AS reviewCount
           FROM product_reviews
           WHERE user_id IS NOT NULL
           GROUP BY product_id, user_id
           HAVING COUNT(*) > 1
           LIMIT 1`,
        );
        if (duplicates.length) {
          throw new Error(
            'Duplicate product reviews must be resolved before enabling one review per customer and product',
          );
        }
        await db.query(
          `ALTER TABLE product_reviews
           ADD UNIQUE KEY uq_product_reviews_product_user (product_id, user_id)`,
        );
      }
    })().catch((error) => {
      reviewsTableReady = undefined;
      throw error;
    });
  }
  return reviewsTableReady;
};

const normalizeProduct = (row) => ({
  ...row,
  id: Number(row.id),
  price: Number(row.price),
  oldPrice: row.oldPrice === null ? null : Number(row.oldPrice),
  category: normalizeCategory(row.category),
  stock: Number(row.stock || 0),
  rating: row.rating === null ? null : Number(row.rating),
  reviewCount: Number(row.reviewCount || 0),
});

const getAllProducts = async () => {
  await ensureReviewsTable();
  const [rows] = await db.query(`
    SELECT p.id, p.name, p.description, p.price,
           p.old_price AS oldPrice, p.image, p.category, p.stock,
           p.created_at AS createdAt,
           ROUND(AVG(r.rating), 1) AS rating,
           COUNT(r.id) AS reviewCount
    FROM products p
    LEFT JOIN product_reviews r ON r.product_id = p.id
    GROUP BY p.id, p.name, p.description, p.price, p.old_price,
             p.image, p.category, p.stock, p.created_at
    ORDER BY p.created_at DESC, p.id DESC
  `);

  return rows.map(normalizeProduct);
};

const getProductById = async (id) => {
  await ensureReviewsTable();
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.description, p.price,
            p.old_price AS oldPrice, p.image, p.category, p.stock,
            p.created_at AS createdAt,
            ROUND(AVG(r.rating), 1) AS rating,
            COUNT(r.id) AS reviewCount
     FROM products p
     LEFT JOIN product_reviews r ON r.product_id = p.id
     WHERE p.id = ?
     GROUP BY p.id, p.name, p.description, p.price, p.old_price,
              p.image, p.category, p.stock, p.created_at`,
    [id],
  );

  return rows[0] ? normalizeProduct(rows[0]) : null;
};

const getProductReviews = async (productId) => {
  await ensureReviewsTable();
  const [rows] = await db.query(
    `SELECT r.id, r.rating, r.review, r.created_at AS createdAt,
            COALESCE(u.name, 'Customer') AS customerName
     FROM product_reviews r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC, r.id DESC`,
    [productId],
  );
  return rows.map((row) => ({
    ...row,
    rating: Number(row.rating),
  }));
};

const saveProductReview = async ({ productId, userId, rating, review }) => {
  await ensureReviewsTable();
  await db.query(
    `INSERT INTO product_reviews (product_id, user_id, rating, review)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       rating = VALUES(rating),
       review = VALUES(review),
       created_at = CURRENT_TIMESTAMP`,
    [productId, userId, rating, review || null],
  );
  return getProductReviews(productId);
};

const createProduct = async (product) => {
  const { name, description, price, old_price, image, category, stock } = product;

  const [result] = await db.query(
    `INSERT INTO products
      (name, description, price, old_price, image, category, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description || null,
      price,
      old_price || null,
      image || null,
      category || null,
      stock,
    ],
  );

  return result.insertId;
};

const updateProduct = async (id, product) => {
  const { name, description, price, old_price, image, category, stock } = product;

  const [result] = await db.query(
    `UPDATE products
     SET name = ?, description = ?, price = ?, old_price = ?,
         image = ?, category = ?, stock = ?
     WHERE id = ?`,
    [
      name,
      description || null,
      price,
      old_price,
      image || null,
      category || null,
      stock,
      id,
    ],
  );

  return result.affectedRows;
};

const deleteProduct = async (id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM product_reviews WHERE product_id = ?', [
      id,
    ]);
    const [result] = await connection.query(
      'DELETE FROM products WHERE id = ?',
      [id],
    );
    await connection.commit();
    return result.affectedRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  ensureReviewsTable,
  getAllProducts,
  getProductById,
  getProductReviews,
  saveProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
};
