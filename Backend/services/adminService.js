const db = require('../config/db');
const orderService = require('./orderService');
const authService = require('./authService');

let tablesReady;

const ensureTables = () => {
  if (!tablesReady) {
    tablesReady = Promise.all([
      orderService.ensureTables(),
      db.query(`
        CREATE TABLE IF NOT EXISTS store_settings (
          setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
          setting_value TEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS promotions (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          description VARCHAR(255) NOT NULL,
          discount_percent DECIMAL(5, 2) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          starts_at DATETIME NULL,
          ends_at DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
    ])
      .then(async () => {
        await db.query(
          `INSERT IGNORE INTO store_settings (setting_key, setting_value)
           VALUES ('announcement', ''), ('store_name', 'Basemark')`,
        );
      })
      .catch((error) => {
        tablesReady = undefined;
        throw error;
      });
  }
  return tablesReady;
};

const getSummary = async () => {
  await ensureTables();
  const [[products]] = await db.query('SELECT COUNT(*) AS count FROM products');
  const [[users]] = await db.query(
    `SELECT COUNT(*) AS count FROM users WHERE role = 'customer'`,
  );
  const [[orders]] = await db.query('SELECT COUNT(*) AS count FROM orders');
  const [[sales]] = await db.query(
    `SELECT COALESCE(SUM(total), 0) AS total
     FROM orders
     WHERE LOWER(order_status) != 'cancelled'
       AND (LOWER(payment_status) = 'paid' OR UPPER(payment_method) = 'COD')`,
  );
  return {
    products: Number(products.count),
    customers: Number(users.count),
    orders: Number(orders.count),
    sales: Number(sales.total),
  };
};

const getOrders = async () => {
  await ensureTables();
  const [orders] = await db.query(
    `SELECT o.id, o.user_id AS userId, o.customer_name AS customerName,
            o.customer_phone AS customerPhone,
            COALESCE(o.customer_address, o.address) AS customerAddress,
            o.total, o.discount_amount AS discountAmount,
            o.promo_code AS promoCode, o.payment_method AS paymentMethod,
            o.payment_status AS paymentStatus, o.order_status AS status,
            o.transaction_uuid AS transactionUuid, o.transaction_code AS transactionCode,
            o.created_at AS createdAt,
            COALESCE(NULLIF(o.customer_email, ''), u.email) AS customerEmail
     FROM orders o JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC`,
  );
  return orderService.attachItems(orders);
};

const updateOrderStatus = async (orderId, status) => {
  await ensureTables();
  const allowedStatuses = new Set([
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ]);
  if (!allowedStatuses.has(status)) {
    const error = new Error('Invalid order status');
    error.statusCode = 400;
    throw error;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT order_status, payment_method, payment_status, transaction_uuid
       FROM orders WHERE id = ? FOR UPDATE`,
      [orderId],
    );
    const order = orders[0];
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    if (
      String(order.payment_method).toUpperCase() === 'ESEWA' &&
      String(order.payment_status).toLowerCase() !== 'paid' &&
      status !== 'cancelled'
    ) {
      const error = new Error('An unpaid eSewa order cannot be fulfilled');
      error.statusCode = 409;
      throw error;
    }
    if (
      status === 'cancelled' &&
      String(order.payment_method).toUpperCase() === 'ESEWA' &&
      order.transaction_uuid
    ) {
      const error = new Error('An eSewa payment in progress must be verified before cancellation');
      error.statusCode = 409;
      throw error;
    }
    const currentStatus = String(order.order_status).toLowerCase();
    if (currentStatus === 'cancelled' && status !== 'cancelled') {
      const error = new Error('A cancelled order cannot be reopened');
      error.statusCode = 409;
      throw error;
    }

    if (status === 'cancelled' && currentStatus !== 'cancelled') {
      const [items] = await connection.query(
        'SELECT product_id AS productId, quantity AS qty FROM order_items WHERE order_id = ?',
        [orderId],
      );
      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.qty, item.productId],
        );
      }
      await connection.query(
        "UPDATE payments SET status = 'FAILED' WHERE order_id = ? AND status = 'PENDING'",
        [orderId],
      );
    }
    await connection.query('UPDATE orders SET order_status = ? WHERE id = ?', [
      status,
      orderId,
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return { id: Number(orderId), status };
};

const getCustomers = async () => {
  await authService.ensureTables();
  const [customers] = await db.query(
    `SELECT id, name, email, phone, address, role, is_active AS isActive,
            created_at AS createdAt
     FROM users ORDER BY created_at DESC`,
  );
  return customers;
};

const setCustomerActive = async (customerId, active, actorId) => {
  await authService.ensureTables();
  if (Number(customerId) === Number(actorId)) {
    const error = new Error('You cannot disable your own account');
    error.statusCode = 400;
    throw error;
  }
  const [result] = await db.query(
    `UPDATE users SET is_active = ? WHERE id = ? AND role = 'customer'`,
    [Boolean(active), customerId],
  );
  if (!result.affectedRows) {
    const error = new Error('Customer account not found');
    error.statusCode = 404;
    throw error;
  }
  if (!active) {
    await db.query('DELETE FROM user_sessions WHERE user_id = ?', [customerId]);
  }
  return { id: Number(customerId), isActive: Boolean(active) };
};

const getSettings = async () => {
  await ensureTables();
  const [rows] = await db.query(
    'SELECT setting_key AS `key`, setting_value AS value FROM store_settings',
  );
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
};

const updateSettings = async (settings) => {
  await ensureTables();
  const allowed = new Set(['store_name', 'announcement']);
  const entries = Object.entries(settings || {});
  if (!entries.length || entries.some(([key, value]) => !allowed.has(key) || typeof value !== 'string')) {
    const error = new Error('Invalid store settings');
    error.statusCode = 400;
    throw error;
  }
  for (const [key, value] of entries) {
    await db.query(
      `INSERT INTO store_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value.trim()],
    );
  }
  return getSettings();
};

const listPromotions = async () => {
  await ensureTables();
  const [promotions] = await db.query(
    `SELECT id, code, description, discount_percent AS discountPercent,
            is_active AS isActive, starts_at AS startsAt, ends_at AS endsAt,
            created_at AS createdAt FROM promotions ORDER BY created_at DESC`,
  );
  return promotions;
};

const validatePromotion = async (code, subtotal) => {
  await ensureTables();
  const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const amount = Number(subtotal);
  if (!normalizedCode || !Number.isFinite(amount) || amount <= 0) {
    const error = new Error('Enter a promotion code and select products first');
    error.statusCode = 400;
    throw error;
  }
  const [rows] = await db.query(
    `SELECT code, description, discount_percent AS discountPercent
     FROM promotions
     WHERE code = ? AND is_active = TRUE
       AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP())
       AND (ends_at IS NULL OR ends_at >= UTC_TIMESTAMP())
     LIMIT 1`,
    [normalizedCode],
  );
  if (!rows[0]) {
    const error = new Error('This promotion code is invalid or expired');
    error.statusCode = 400;
    throw error;
  }
  const discountAmount =
    Math.round(
      (amount * Number(rows[0].discountPercent) / 100 + Number.EPSILON) *
        100,
    ) / 100;
  return {
    ...rows[0],
    discountPercent: Number(rows[0].discountPercent),
    discountAmount,
    total: Math.max(0, amount - discountAmount),
  };
};

const savePromotion = async (promotion) => {
  await ensureTables();
  const id = promotion.id ? Number(promotion.id) : null;
  const code = typeof promotion.code === 'string' ? promotion.code.trim().toUpperCase() : '';
  const description =
    typeof promotion.description === 'string' ? promotion.description.trim() : '';
  const discount = Number(promotion.discountPercent);
  if (!/^[A-Z0-9_-]{3,50}$/.test(code) || !description || discount <= 0 || discount > 90) {
    const error = new Error('Enter a valid code, description, and discount from 1 to 90%');
    error.statusCode = 400;
    throw error;
  }
  if (id) {
    const [result] = await db.query(
      `UPDATE promotions SET code = ?, description = ?, discount_percent = ?,
       is_active = ? WHERE id = ?`,
      [code, description, discount, Boolean(promotion.isActive), id],
    );
    if (!result.affectedRows) {
      const error = new Error('Promotion not found');
      error.statusCode = 404;
      throw error;
    }
  } else {
    await db.query(
      `INSERT INTO promotions (code, description, discount_percent)
       VALUES (?, ?, ?)`,
      [code, description, discount],
    );
  }
  return listPromotions();
};

const deletePromotion = async (id) => {
  await ensureTables();
  const [result] = await db.query('DELETE FROM promotions WHERE id = ?', [id]);
  if (!result.affectedRows) {
    const error = new Error('Promotion not found');
    error.statusCode = 404;
    throw error;
  }
};

const getPublicStoreData = async () => {
  const settings = await getSettings();
  const promotions = await listPromotions();
  const now = Date.now();
  return {
    storeName: settings.store_name || 'Basemark',
    announcement: settings.announcement || '',
    promotions: promotions.filter(
      (promotion) =>
        promotion.isActive &&
        (!promotion.startsAt || new Date(promotion.startsAt).getTime() <= now) &&
        (!promotion.endsAt || new Date(promotion.endsAt).getTime() >= now),
    ),
  };
};

module.exports = {
  ensureTables,
  getSummary,
  getOrders,
  updateOrderStatus,
  getCustomers,
  setCustomerActive,
  getSettings,
  updateSettings,
  listPromotions,
  validatePromotion,
  savePromotion,
  deletePromotion,
  getPublicStoreData,
};
